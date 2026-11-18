/* ---------- 8.1 Tư duy gỡ lỗi: chuỗi nhân quả từ kubectl apply tới request của người dùng ----------
   Thông báo lỗi trong TS_CHAIN.see đã bắt trên k3s v1.34 ngày 18/11/2026 (trừ chỗ ghi "ví dụ"). */
const TS_CHAIN = [
  { n: "kubectl → apiserver", who: "kubeconfig, chứng chỉ, token", see: "The connection to the server …:6443 was refused · error: You must be logged in (Unauthorized)", where: "Ngay trên terminal", c: "k config view --minify\nk cluster-info", go: ["api", "a_cfg"] },
  { n: "Xác thực quyền (RBAC)", who: "Role, RoleBinding", see: "Error from server (Forbidden): pods is forbidden: User \"system:serviceaccount:tsx:default\" cannot list resource \"pods\"…", where: "Ngay trên terminal hoặc log của app gọi API", c: "k auth can-i list pods -n NS --as=system:serviceaccount:NS:SA", go: ["forbidden"] },
  { n: "Admission", who: "ResourceQuota, LimitRange, Pod Security, webhook", see: "pods \"q-…\" is forbidden: exceeded quota: q, requested: pods=1, used: pods=1, limited: pods=1", where: "Pod tạo tay: lỗi ngay khi apply. Pod do Deployment tạo: chỉ thấy ở event FailedCreate của ReplicaSet", c: "k describe rs -l app=web | sed -n '/Events/,$p'", go: ["deploy0"] },
  { n: "Controller (Deployment → ReplicaSet → Pod)", who: "kube-controller-manager", see: "error: deployment \"r\" exceeded its progress deadline · Progressing=False ProgressDeadlineExceeded", where: "status.conditions của Deployment, các ReplicaSet cũ và mới", c: "k rollout status deploy/web\nk get rs -l app=web", go: ["rollout"] },
  { n: "Scheduler chọn node", who: "kube-scheduler", see: "0/3 nodes are available: 3 node(s) had untolerated taint(s)…", where: "Pod Pending, event FailedScheduling", c: "k describe pod web-1 | sed -n '/Events/,$p'", go: ["pending"] },
  { n: "kubelet nhận Pod, mạng Pod", who: "kubelet, CNI", see: "Node NotReady · failed to setup network for sandbox (ví dụ)", where: "Node conditions, event của Pod, journal kubelet", c: "k get nodes\nk describe node worker-1 | sed -n '/Conditions/,/Addresses/p'", go: ["node"] },
  { n: "Gắn volume, nạp cấu hình", who: "kubelet", see: "MountVolume.SetUp failed for volume \"cfg\" : configmap \"nope\" not found · CreateContainerConfigError: secret \"db\" not found", where: "Pod đứng ContainerCreating hoặc CreateContainerConfigError, event FailedMount / Failed", c: "k describe pod web-1 | sed -n '/Events/,$p'", go: ["creating"] },
  { n: "Kéo image", who: "containerd", see: "ErrImagePull → ImagePullBackOff", where: "Event Failed của Pod", c: "k describe pod web-1 | grep -A3 -i 'failed to pull'", go: ["imgpull"] },
  { n: "Chạy container", who: "runc, ứng dụng", see: "CrashLoopBackOff · Last State: Terminated, Reason: OOMKilled, Exit Code: 137", where: "lastState trong status, log lần chạy trước", c: "k logs web-1 --previous\nk describe pod web-1 | grep -A6 'Last State'", go: ["crash"] },
  { n: "Probe", who: "kubelet", see: "Running nhưng READY 0/1 · Readiness probe failed: … connection refused", where: "Event Unhealthy của Pod", c: "k describe pod web-1 | grep -i -A2 unhealthy", go: ["notready"] },
  { n: "EndpointSlice + Service", who: "EndpointSlice controller", see: "EndpointSlice không có địa chỉ: selector lệch label hoặc Pod chưa Ready", where: "k get endpointslice", c: "k get endpointslice -l kubernetes.io/service-name=web", go: ["svc", "s_noep"] },
  { n: "Mạng: kube-proxy, NetworkPolicy", who: "kube-proxy / eBPF, CNI", see: "wget: download timed out", where: "Thử gọi IP Pod, rồi ClusterIP, từ một Pod tạm", c: "k run t --image=busybox:1.36 --rm -i --restart=Never -- wget -qO- -T2 <IP-Pod>:8080", go: ["svc", "s_np"] },
  { n: "DNS", who: "CoreDNS", see: "** server can't find nosuchsvc.default: NXDOMAIN", where: "nslookup từ Pod tạm, log CoreDNS", c: "k run t --image=busybox:1.36 --rm -i --restart=Never -- nslookup web.shop", go: ["dns"] },
  { n: "Ingress / Gateway", who: "Ingress controller, Gateway", see: "404 từ controller · 503 Service Unavailable (ví dụ)", where: "Status của Ingress / HTTPRoute, log controller", c: "k describe ing web\nk get httproute -A", go: ["ingress"] }
];
const TS_SYM = [
  ["apply", "kubectl apply báo lỗi", [0, 1, 2], "Lỗi hiện ngay trên terminal: đọc chữ đầu tiên. connection refused → kết nối; Forbidden → RBAC; forbidden: exceeded quota / violates PodSecurity → admission."],
  ["nopod", "Deployment 0/N, không thấy Pod", [2, 3], "Không có Pod nghĩa là Pod chưa từng được tạo: lỗi nằm trước scheduler. Xem event của ReplicaSet, không phải của Pod."],
  ["pod", "Có Pod nhưng không Running", [4, 5, 6, 7, 8], "Đọc cột STATUS: Pending → scheduler; ContainerCreating → volume, mạng; ErrImagePull → image; CrashLoopBackOff → ứng dụng."],
  ["ready", "Running mà không nhận traffic", [9, 10], "Pod chạy nhưng READY 0/1 hoặc Service không có endpoint: probe và selector."],
  ["web", "Không vào được ứng dụng", [10, 11, 12, 13], "Gọi từ gần tới xa: IP Pod → ClusterIP → tên DNS → Ingress. Bước đầu tiên hỏng là tầng lỗi."]
];
function tsChain() {
  const box = $("#tsChain"); let sel = 4, sym = null, run = 0;
  box.innerHTML = '<h3 style="margin:0">Chuỗi nhân quả: từ kubectl apply tới người dùng</h3><p class="small muted" style="margin:0">Mỗi mắt xích phải thành công thì mắt sau mới chạy. Gỡ lỗi là tìm <b>mắt xích đầu tiên hỏng</b>: sửa mắt sau mà mắt trước còn hỏng thì vô ích.</p>' +
    '<div class="chips" id="tsSym"><span class="small muted">Bạn đang thấy:</span>' + TS_SYM.map(s => '<button type="button" data-tsy="' + s[0] + '">' + esc(s[1]) + "</button>").join("") + "</div>" +
    '<p class="hint" id="tsHint" style="margin:0"></p><div class="ts-wrap"><ol class="ts-chain" id="tsList"></ol><div class="panel col ts-detail" id="tsDet"></div></div><div class="controls" style="margin:0"><button class="btn" type="button" data-tsplay>▶ Chạy chuỗi khi mọi thứ ổn</button></div>';
  const render = () => {
    const S = sym && TS_SYM.find(x => x[0] === sym);
    $$("#tsSym [data-tsy]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tsy === sym ? "true" : "false"));
    $("#tsList").innerHTML = TS_CHAIN.map((c, i) => '<li class="ts-l' + (i === sel ? " on" : "") + (S && S[2].includes(i) ? " cand" : "") + (S && !S[2].includes(i) ? " dim" : "") + '" data-tsi="' + i + '"><span class="n">' + (i + 1) + "</span><span><b>" + esc(c.n) + '</b><small>' + esc(c.who) + "</small></span></li>").join("");
    const c = TS_CHAIN[sel];
    $("#tsDet").innerHTML = '<span class="ck-dom dom-net">mắt xích ' + (sel + 1) + "</span><b>" + esc(c.n) + '</b><div><span class="small muted">Hỏng ở đây thì bạn thấy</span><div class="trap" style="margin-top:4px;padding:8px 10px;border-radius:7px;background:var(--bad-soft);font:12.5px var(--f-mono);overflow-wrap:anywhere">' + esc(c.see) + '</div></div><div><span class="small muted">Bằng chứng nằm ở</span><p style="margin:2px 0 0">' + esc(c.where) + "</p></div>" + lcCode(c.c) +
      '<a class="btn" href="#trouble" data-tsgo="' + c.go.join(",") + '">Mở nhánh này trong cây chẩn đoán →</a>';
    lcEnhance($("#tsDet"));
    $("#tsHint").innerHTML = S ? esc(S[3]) : "Chọn một triệu chứng để xem mắt xích nào đáng nghi.";
  };
  box.addEventListener("click", async e => {
    const l = e.target.closest("[data-tsi]"); if (l) { sel = +l.dataset.tsi; render(); return; }
    const y = e.target.closest("[data-tsy]"); if (y) { sym = sym === y.dataset.tsy ? null : y.dataset.tsy; const S = TS_SYM.find(x => x[0] === sym); if (S) sel = S[2][0]; render(); return; }
    const g = e.target.closest("[data-tsgo]"); if (g) { e.preventDefault(); trPath = ["root", ...g.dataset.tsgo.split(",")]; show("trouble"); setTimeout(() => { renderTree(); const t = $("#trNode"); if (t) t.scrollIntoView({ block: "center" }); }, 60); return; }
    if (e.target.closest("[data-tsplay]")) {
      const t = ++run; sym = null;
      for (let i = 0; i < TS_CHAIN.length; i++) { if (t !== run || current !== "tslogic") return; sel = i; render(); $$("#tsList .ts-l").forEach((x, k) => x.classList.toggle("ok", k < i)); await sleep(RM ? 0 : 450); }
      $$("#tsList .ts-l").forEach(x => x.classList.add("ok")); $("#tsHint").textContent = "14/14 mắt xích thành công: người dùng nhận được trang web.";
    }
  });
  render();
}
lcOnce("tslogic", tsChain);
