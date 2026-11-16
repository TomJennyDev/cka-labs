/* ---------- 2.1 Container là gì: image → tiến trình, ai chạy nó, nó nằm đâu trong Pod, vòng đời ----------
   Số liệu trong phần "Bằng chứng" lấy từ node k3s v1.34 (containerd + runc) ngày 16/11/2026: Pod app (busybox, sleep 3600). */
const CT_STEPS = [
  ["Image: các lớp chỉ đọc", "Image là chồng các lớp file (mỗi lệnh COPY, RUN trong Dockerfile một lớp). Các lớp chỉ đọc, dùng chung cho mọi container chạy từ image đó.", "$ crictl images | grep busybox\ndocker.io/library/busybox   1.36   ff7a7936e9306   2.2MB"],
  ["Thêm một lớp ghi được", "Mỗi container có thêm một lớp ghi riêng (upperdir) đặt trên cùng. Mọi file container tạo hay sửa đều nằm ở lớp này, image không bị đụng tới.", "$ kubectl exec app -- sh -c 'echo hi > /tmp/x'\n# trên node, file nằm ở lớp ghi của container:\n$ ls …/overlayfs/snapshots/19/fs/tmp\nx"],
  ["Ghép thành / bằng overlayfs", "Kernel ghép các lớp chỉ đọc (lowerdir) và lớp ghi (upperdir) thành một cây thư mục; container thấy nó là /. Container bị xóa thì lớp ghi mất theo: dữ liệu cần giữ phải nằm trong volume.", "$ grep overlay /proc/568/mountinfo\n… / rw - overlay overlay rw,lowerdir=…/snapshots/18/fs,upperdir=…/snapshots/19/fs,workdir=…"],
  ["Cô lập bằng namespace", "Tiến trình được đặt vào các namespace riêng: pid (chỉ thấy tiến trình của mình), mnt (chỉ thấy / ở trên), uts (hostname riêng). net, ipc, uts dùng chung với container pause của Pod.", "$ readlink /proc/568/ns/{net,pid,mnt}   # app\nnet:[4026532603] pid:[4026532659] mnt:[4026532658]\n$ readlink /proc/540/ns/{net,pid,mnt}   # pause cùng Pod\nnet:[4026532603] pid:[4026532657] mnt:[4026532654]"],
  ["Giới hạn bằng cgroup", "kubelet đặt tiến trình vào một cgroup theo QoS, Pod và container. requests và limits trong YAML thành con số trong các file của cgroup này (bài 3.2).", "$ cat /proc/568/cgroup\n…/kubepods/besteffort/pod<uid>/3dc0d6f9de38…"],
  ["Chạy lệnh: PID 1 trong container", "Cuối cùng runc chạy lệnh của container. Bên trong, nó là PID 1; trên node nó chỉ là một tiến trình bình thường. Container là tiến trình này, không phải máy ảo.", "$ kubectl exec app -- cat /proc/1/cmdline\nsleep 3600\n$ ps -o pid,ppid,args -e   # trên node\n  514     1 containerd-shim-runc-v2 -id cf1074c8…\n  540   514 /pause\n  568   514 sleep 3600"]
];
function ctLayers() {
  const p = $("#ctLayers"); let step = 0, run = 0;
  p.innerHTML = "<h3>Từ image tới tiến trình</h3>" + '<div class="stage sm"><svg viewBox="0 0 760 300"></svg></div>' +
    '<div class="controls"><button class="btn" type="button" data-cs="-1">◀ Trước</button><button class="btn primary" type="button" data-cs="1">Tiếp ▶</button><button class="btn" type="button" data-csall>▶ Chạy hết</button><span class="small muted" id="ctStepN"></span></div>' +
    '<p class="hint cap" aria-live="polite"></p><div class="codewrap"><pre class="code" id="ctEv"></pre></div>';
  const svg = $("svg", p), cap = $(".cap", p);
  const draw = () => {
    svg.innerHTML = "";
    const L = [["lớp 1: hệ điều hành gốc", "chỉ đọc"], ["lớp 2: thư viện", "chỉ đọc"], ["lớp 3: file của app", "chỉ đọc"]];
    L.forEach(([t, s], i) => lcBox(svg, 30, 228 - i * 46, 250, 40, "an-c done", t, s));
    if (step >= 1) lcBox(svg, 30, 90, 250, 40, "an-c start", "lớp ghi của container", "upperdir, mất khi xóa container");
    txt(svg, 30, 70, step >= 1 ? "image + lớp ghi" : "image (dùng chung)", "sv-tb");
    if (step >= 2) { el("path", { d: "M280 170 H360", class: "an-l on" }, svg); txt(svg, 320, 162, "overlayfs", "sv-s", "middle"); }
    if (step >= 3) {
      el("rect", { x: 370, y: 40, width: 360, height: 240, rx: 14, class: "an-pod" }, svg);
      txt(svg, 384, 60, "namespace: pid · mnt · uts · ipc · net", "sv-s");
    }
    if (step >= 4) {
      el("rect", { x: 390, y: 72, width: 320, height: 192, rx: 10, fill: "none", stroke: "var(--data)", "stroke-width": 2, "stroke-dasharray": "5 4" }, svg);
      txt(svg, 402, 90, "cgroup: cpu, memory, pids", "sv-s").setAttribute("style", "fill:var(--data)");
    }
    if (step >= 2) lcBox(svg, 420, 110, 260, 52, "an-vol", "/ (rootfs của container)", "/bin /etc /tmp …");
    if (step >= 5) lcBox(svg, 420, 190, 260, 52, "an-c run", "sleep 3600", "PID 1 trong container · PID 568 trên node");
    const [h, d, ev] = CT_STEPS[step];
    cap.innerHTML = "<b>" + (step + 1) + ". " + esc(h) + ".</b> " + esc(d);
    $("#ctEv").textContent = ev; hlPre($("#ctEv"));
    $("#ctStepN").textContent = "Bước " + (step + 1) + " / " + CT_STEPS.length;
  };
  p.addEventListener("click", async e => {
    const b = e.target.closest("[data-cs]"); if (b) { run++; step = Math.max(0, Math.min(CT_STEPS.length - 1, step + +b.dataset.cs)); draw(); return; }
    if (e.target.closest("[data-csall]")) { const t = ++run; for (step = 0; step < CT_STEPS.length; step++) { if (t !== run || !lcVisible(svg)) return; draw(); await sleep(2200); } step = CT_STEPS.length - 1; }
  });
  draw();
}

/* ---------- ai chạy container: kubelet → CRI → containerd → shim → runc ---------- */
const CH_STEPS = [
  ["kubelet thấy Pod mới gán cho node", "kubelet watch apiserver, thấy Pod có spec.nodeName là node của mình.", [[0, 1]], ""],
  ["RunPodSandbox", "kubelet gọi containerd qua CRI (gRPC trên unix socket). containerd khởi một shim cho Pod, shim nhờ runc tạo container pause để giữ network namespace; plugin CNI gắn IP cho namespace đó.", [[1, 2], [2, 3], [3, 4]], "pause"],
  ["PullImage", "containerd kéo image nếu node chưa có (imagePullPolicy). Lỗi ở bước này là ErrImagePull, rồi ImagePullBackOff.", [[1, 1]], ""],
  ["CreateContainer + StartContainer", "containerd chuẩn bị rootfs (snapshot overlay) và cấu hình OCI; shim gọi runc tạo tiến trình trong namespace mới, gắn vào net/ipc/uts của pause, đặt vào cgroup.", [[1, 2], [2, 3], [3, 5]], "app"],
  ["runc thoát, shim ở lại", "runc chỉ tạo xong rồi thoát. Tiến trình app nhận shim làm cha; shim giữ stdout/stderr (thành log) và báo exit code cho containerd. Vì vậy restart containerd không giết container đang chạy.", [], "done"]
];
function ctChain() {
  const p = $("#ctChain"); let run = 0;
  p.innerHTML = "<h3>Ai chạy container</h3>" + '<div class="stage sm"><svg viewBox="0 0 760 266"></svg></div><div class="controls"><button class="btn primary" type="button" data-chplay>▶ Chạy</button><span class="hint cap" aria-live="polite"></span></div>';
  const svg = $("svg", p), cap = $(".cap", p);
  const N = [[20, 20, "apiserver", "Pod spec"], [20, 170, "kubelet", "trên node"], [178, 170, "containerd", "CRI runtime"], [336, 170, "shim", "1 cái / Pod"], [480, 95, "runc", "OCI runtime"], [622, 20, "pause", "giữ net ns"], [622, 170, "app", "tiến trình của bạn"]];
  const W = 125, H = 48, C = i => [N[i][0] + W / 2, N[i][1] + H / 2];
  const E = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6]];
  const draw = (on, st) => {
    svg.innerHTML = "";
    E.forEach(([a, b]) => { if ((b === 5 && !st.pause) || (b === 6 && !st.app)) return; const [x1, y1] = C(a), [x2, y2] = C(b); el("path", { d: "M" + x1 + " " + y1 + " L" + x2 + " " + y2, class: "an-l" + (on.includes(a) && on.includes(b) ? " on" : "") }, svg); });
    if (st.done) [5, 6].forEach(i => { const [x1, y1] = C(3), [x2, y2] = C(i); el("path", { d: "M" + x1 + " " + (y1 + 24) + " Q" + (x1 + 120) + " 248 " + x2 + " " + (y2 + (i === 6 ? 24 : 24)), fill: "none", stroke: "var(--node)", "stroke-width": 1.6, "stroke-dasharray": "5 4" }, svg); });
    N.forEach(([x, y, t, sub], i) => { if (i === 5 && !st.pause) return; if (i === 6 && !st.app) return; lcBox(svg, x, y, W, H, "an-c" + (on.includes(i) ? " run" : i === 4 && st.done ? " done" : ""), t, sub); });
    txt(svg, 177, 162, "CRI gRPC", "sv-s", "middle");
    if (st.done) txt(svg, 470, 256, "shim là tiến trình cha của pause và app", "sv-s", "middle");
  };
  const play = async () => {
    const t = ++run, st = {};
    for (const [h, d, hops, mark] of CH_STEPS) {
      if (t !== run || !lcVisible(svg)) return;
      if (mark === "pause") st.pause = 1; if (mark === "app") st.app = 1; if (mark === "done") st.done = 1;
      const on = [...new Set(hops.flat())]; draw(on, st); cap.innerHTML = "<b>" + esc(h) + ".</b> " + esc(d);
      for (const [a, b] of hops) { if (a !== b) await lcPkt(svg, [C(a), C(b)], { dur: 650 }); else await sleep(650); }
      await sleep(1600);
    }
  };
  p.addEventListener("click", e => { if (e.target.closest("[data-chplay]")) play(); });
  draw([], { pause: 1, app: 1 }); cap.textContent = "Bấm Chạy để xem các lời gọi khi một Pod được tạo.";
}

/* ---------- container nằm đâu trong Pod: namespace dùng chung và riêng ---------- */
function ctPod() {
  const p = $("#ctPod"); let share = false;
  p.innerHTML = "<h3>Container nằm đâu trong Pod</h3>" + '<label class="check"><input type="checkbox" id="ctShare"> shareProcessNamespace: true</label><div class="stage sm"><svg viewBox="0 0 760 290"></svg></div><p class="hint cap"></p>';
  const svg = $("svg", p), cap = $(".cap", p);
  const draw = () => {
    svg.innerHTML = "";
    el("rect", { x: 20, y: 20, width: 720, height: 250, rx: 14, class: "an-pod" }, svg); txt(svg, 36, 42, "Pod web · IP 10.244.1.5", "sv-tb");
    const X = [60, 290, 520], names = [["pause", "giữ namespace"], ["app", "nginx :80"], ["sidecar", "gọi localhost:80"]];
    names.forEach(([t, s], i) => lcBox(svg, X[i], 70, 180, 56, "an-c" + (i ? " run" : " done"), t, s));
    const band = (y, label, shared, col) => {
      if (shared) { el("rect", { x: 50, y, width: 660, height: 26, rx: 6, fill: col, opacity: .25 }, svg); txt(svg, 380, y + 17, label + ": dùng chung", "sv-s", "middle"); }
      else X.forEach(x => { el("rect", { x: x - 6, y, width: 192, height: 26, rx: 6, fill: col, opacity: .18 }, svg); txt(svg, x + 90, y + 17, label + " riêng", "sv-s", "middle"); });
    };
    band(140, "net · ipc · uts (một IP, gọi nhau qua localhost, chung hostname)", true, "var(--node)");
    band(176, "pid", share, "var(--accent)");
    band(212, "mnt (filesystem)", false, "var(--pkt)");
    txt(svg, 380, 258, "Volume mount vào nhiều container là cách duy nhất để chia sẻ file", "sv-s", "middle");
    cap.innerHTML = share ? "<b>shareProcessNamespace: true</b>: các container thấy tiến trình của nhau (<code>ps</code> liệt kê cả nginx và sidecar), PID 1 là pause. Dùng khi sidecar cần gửi tín hiệu cho app." : "Mặc định mỗi container một pid namespace: <code>ps</code> trong app chỉ thấy tiến trình của app. Mạng thì dùng chung: sidecar gọi <code>localhost:80</code> là tới nginx.";
  };
  p.addEventListener("change", e => { if (e.target.id === "ctShare") { share = e.target.checked; draw(); } });
  draw();
}

/* ---------- vòng đời container và restartPolicy ---------- */
function ctLife() {
  const p = $("#ctLife"); let pol = "Always", ex = "1", run = 0;
  p.innerHTML = "<h3>Vòng đời một container</h3>" + '<div class="formrow"><span class="small">restartPolicy</span>' + netSeg([["Always", "Always"], ["OnFailure", "OnFailure"], ["Never", "Never"]], pol, "data-lp") +
    '<span class="small">Tiến trình kết thúc với</span>' + netSeg([["0", "exit 0"], ["1", "exit 1"], ["137", "OOMKilled"]], ex, "data-le") + '</div><div class="stage sm"><svg viewBox="0 0 760 170"></svg></div><div class="controls"><button class="btn primary" type="button" data-lplay>▶ Chạy</button></div><div class="tbl"><table><thead><tr><th>Thời điểm</th><th>Container</th><th>Lý do</th><th>Restarts</th><th>Pod phase</th></tr></thead><tbody id="ctLog"></tbody></table></div>';
  const svg = $("svg", p);
  const S = { Waiting: [40, 50], Running: [300, 50], Terminated: [560, 50] };
  const draw = cur => {
    svg.innerHTML = "";
    Object.entries(S).forEach(([k, [x, y]]) => lcBox(svg, x, y, 160, 56, "an-c" + (cur === k ? (k === "Running" ? " run" : k === "Waiting" ? " start" : " term") : ""), k, { Waiting: "chưa chạy / chờ restart", Running: "tiến trình đang sống", Terminated: "đã thoát, có exit code" }[k]));
    el("path", { d: "M200 78 H300", class: "an-l on" }, svg); el("path", { d: "M460 78 H560", class: "an-l on" }, svg);
    el("path", { d: "M640 106 V140 H120 V106", class: "an-l" + (pol === "Always" || (pol === "OnFailure" && ex !== "0") ? " on" : "") }, svg);
    txt(svg, 380, 158, "restart nếu restartPolicy cho phép, chờ back-off 10s, 20s, 40s… tối đa 5 phút", "sv-s", "middle");
  };
  const play = async () => {
    const t = ++run, log = $("#ctLog"); log.innerHTML = "";
    const fail = ex !== "0", reason = ex === "0" ? "Completed (exit 0)" : ex === "1" ? "Error (exit 1)" : "OOMKilled (exit 137)";
    const restart = pol === "Always" || (pol === "OnFailure" && fail);
    let tm = 0, rc = 0;
    const row = (state, why, phase) => { log.insertAdjacentHTML("beforeend", "<tr><td>" + tm + "s</td><td><b>" + state + "</b></td><td>" + why + "</td><td>" + rc + "</td><td>" + phase + "</td></tr>"); };
    for (let i = 0; i < 4; i++) {
      if (t !== run || !lcVisible(svg)) return;
      draw("Waiting"); row("Waiting", i ? "CrashLoopBackOff (chờ " + Math.min(300, 10 * 2 ** (i - 1)) + "s)" : "ContainerCreating", i ? "Running" : "Pending"); await sleep(900);
      tm += i ? Math.min(300, 10 * 2 ** (i - 1)) : 2;
      draw("Running"); row("Running", "", "Running"); await sleep(900); tm += 5;
      draw("Terminated"); const phase = restart ? "Running" : fail ? "Failed" : "Succeeded"; row("Terminated", reason, phase); await sleep(1000);
      if (!restart) { log.insertAdjacentHTML("beforeend", '<tr><td colspan="5" class="small">restartPolicy ' + pol + (fail ? " không restart khi lỗi… " : " không restart khi xong: ") + "Pod dừng ở phase <b>" + phase + "</b>.</td></tr>"); return; }
      rc++;
    }
    log.insertAdjacentHTML("beforeend", '<tr><td colspan="5" class="small">Cứ thế lặp lại; <code>k get pod</code> hiện <b>CrashLoopBackOff</b>' + (ex === "0" ? " dù container thoát 0 (Pod thường cần tiến trình chạy mãi; việc chạy một lần thì dùng Job)" : "") + ". Back-off về lại 10s khi container chạy ổn 10 phút.</td></tr>");
  };
  p.addEventListener("click", e => {
    const a = e.target.closest("[data-lp]"); if (a) { pol = a.dataset.lp; netPress(p, "data-lp", pol); run++; draw(); return; }
    const b = e.target.closest("[data-le]"); if (b) { ex = b.dataset.le; netPress(p, "data-le", ex); run++; draw(); return; }
    if (e.target.closest("[data-lplay]")) play();
  });
  draw();
}
lcOnce("container", () => { ctLayers(); ctChain(); ctPod(); ctLife(); });

/* ---------- 1.1 Từ cluster tới container: sơ đồ phóng to từng tầng ---------- */
const ZM_LV = {
  cluster: { r: [0, 0, 1100, 560], h: "Cluster", d: "Một cluster = control plane + các node. Control plane quyết định; container của bạn chỉ chạy trên các worker node (control plane thường có taint để không nhận Pod).", cmd: "k get nodes -o wide" },
  node: { r: [312, 40, 386, 490], h: "Node", d: "Một máy (thật hay ảo). kubelet nhận Pod được gán cho node này và nhờ containerd chạy các container của Pod. Container chạy thật ở đây, dưới dạng tiến trình Linux.", cmd: "k get pod -A -o wide --field-selector spec.nodeName=node1" },
  pod: { r: [332, 82, 346, 186], h: "Pod", d: "Đơn vị nhỏ nhất Kubernetes xếp chỗ. Một Pod = một IP + một nhóm container luôn chạy cùng node, gọi nhau qua localhost, dùng chung volume. READY 2/2 nghĩa là 2 container đều sẵn sàng.", cmd: "k get pod web-1 -o wide\nk describe pod web-1      # mục Containers liệt kê từng container" },
  container: { r: [334, 112, 344, 146], hl: [350, 124, 156, 122], h: "Container", d: "Một tiến trình chạy từ image, có filesystem riêng (lớp image + lớp ghi), bị cô lập bằng namespace và giới hạn bằng cgroup. Khai trong YAML ở spec.containers của Pod. Chi tiết: bài 2.1.", cmd: "k logs web-1 -c nginx\nk exec -it web-1 -c nginx -- sh\ncrictl ps --name nginx     # trên node" }
};
function ctZoom() {
  const p = $("#ctZoom"); let lv = "cluster", view = "phys", vb = ZM_LV.cluster.r.slice(), anim = 0;
  p.innerHTML = '<div class="controls" style="justify-content:space-between;margin:0"><h3 style="margin:0">Từ cluster tới container</h3>' + netSeg([["phys", "Chạy ở đâu"], ["logic", "Ai quản lý ai"]], view, "data-zv") + "</div>" +
    '<div class="seg" role="group" id="zmLv">' + Object.entries(ZM_LV).map(([k, v], i) => '<button type="button" data-zl="' + k + '" aria-pressed="' + !i + '">' + (i + 1) + ". " + v.h + "</button>").join("") + "</div>" +
    '<div class="stage"><svg viewBox="0 0 1100 560" role="img" aria-label="Cluster, node, Pod, container"></svg></div><p class="hint cap" aria-live="polite"></p><div class="codewrap"><pre class="code" id="zmCmd"></pre></div>';
  const svg = $("svg", p), cap = $(".cap", p);
  const T = (g, x, y, s, size, anchor, weight, fill) => { const t = txt(g, x, y, s, "sv-s", anchor || "start"); t.setAttribute("style", "font-size:" + size + "px" + (weight ? ";font-weight:" + weight : "") + (fill ? ";fill:" + fill : "")); return t; };
  const R = (g, x, y, w, h, cls, extra) => el("rect", Object.assign({ x, y, width: w, height: h, rx: Math.min(14, h / 6), class: cls }, extra || {}), g);
  const ctr = (g, x, y, w, h, name, image, port, cls) => {
    R(g, x, y, w, h, "an-c " + cls);
    T(g, x + w / 2, y + 20, name, 13, "middle", 700);
    T(g, x + w / 2, y + 34, "container", 8, "middle");
    [["image: " + image], ["tiến trình: PID 1 trong container"], ["rootfs: lớp image + lớp ghi"], ["namespace pid, mnt riêng"], ["cgroup: requests / limits"], [port]].forEach(([s], i) => T(g, x + 8, y + 50 + i * 10, s, 6.2));
  };
  const drawPhys = () => {
    svg.innerHTML = "";
    R(svg, 10, 10, 1080, 540, "an-pod"); T(svg, 26, 32, "Cluster", 16, null, 700);
    R(svg, 30, 50, 262, 480, "an-ext"); T(svg, 46, 74, "Control plane", 14, null, 700);
    ["kube-apiserver", "etcd", "kube-scheduler", "kube-controller-manager"].forEach((n, i) => { R(svg, 50, 92 + i * 70, 222, 52, "an-c done"); T(svg, 161, 123 + i * 70, n, 12, "middle", 600); });
    T(svg, 161, 400, "Không chạy Pod của bạn", 11, "middle"); T(svg, 161, 416, "(có taint control-plane)", 10, "middle");
    const node = (x, name, pods) => {
      R(svg, x, 50, 370, 480, "an-ext"); T(svg, x + 16, 74, name + " (worker)", 14, null, 700);
      pods.forEach(([px, py, pw, ph, pname, ip, ctrs]) => {
        R(svg, px, py, pw, ph, "an-pod"); T(svg, px + 10, py + 18, "Pod " + pname, 12, null, 700); T(svg, px + pw - 10, py + 18, "IP " + ip, 8, "end");
        ctrs.forEach(c => ctr(svg, ...c));
        if (ctrs.length > 1) T(svg, px + pw / 2, py + ph - 8, "chung IP, gọi nhau qua localhost · volume: logs (emptyDir)", 7, "middle");
      });
      R(svg, x + 20, 440, 160, 70, "an-vol"); T(svg, x + 100, 470, "kubelet", 13, "middle", 700); T(svg, x + 100, 488, "nhận Pod, gọi CRI", 9, "middle");
      R(svg, x + 190, 440, 160, 70, "an-vol"); T(svg, x + 270, 470, "containerd + runc", 13, "middle", 700); T(svg, x + 270, 488, "chạy container", 9, "middle");
    };
    node(320, "node1", [[340, 90, 330, 170, "web-1", "10.244.1.5", [[355, 128, 148, 116, "nginx", "nginx:1.27", "port 80", "run"], [510, 128, 148, 116, "log-sidecar", "busybox:1.36", "đọc /logs", "start"]]],
      [340, 280, 330, 140, "api-1", "10.244.1.7", [[355, 304, 303, 106, "api", "shop/api:2.3", "port 8080", "run"]]]]);
    node(710, "node2", [[730, 90, 330, 170, "web-2", "10.244.2.4", [[745, 128, 148, 116, "nginx", "nginx:1.27", "port 80", "run"], [900, 128, 148, 116, "log-sidecar", "busybox:1.36", "đọc /logs", "start"]]],
      [730, 280, 330, 140, "db-0", "10.244.2.9", [[745, 304, 303, 106, "postgres", "postgres:17", "port 5432 · PVC data-db-0", "run"]]]]);
    if (lv !== "cluster") { const r = ZM_LV[lv].hl || ZM_LV[lv].r; R(svg, r[0] + 4, r[1] + 4, r[2] - 8, r[3] - 8, "", { fill: "none", stroke: "var(--accent)", "stroke-width": lv === "container" ? 1.5 : 3, "stroke-dasharray": "8 5" }); }
  };
  const drawLogic = () => {
    svg.innerHTML = "";
    R(svg, 10, 10, 1080, 540, "an-pod"); T(svg, 26, 34, "Namespace shop (ranh giới logic: tên, quyền, quota; không phải chỗ chạy)", 14, null, 700);
    const B = (x, y, w, h, t, s, cls, on) => { R(svg, x, y, w, h, "an-c " + (on ? cls : "done")); T(svg, x + w / 2, y + h / 2 - 2, t, 13, "middle", 700); T(svg, x + w / 2, y + h / 2 + 15, s, 9, "middle"); };
    const on = { cluster: 0, node: 1, pod: 2, container: 3 }[lv];
    B(60, 70, 300, 60, "Deployment web", "replicas: 2 · spec.template = khuôn Pod", "v1", on <= 3);
    B(60, 170, 300, 60, "ReplicaSet web-7d9f", "do Deployment tạo, giữ đủ 2 Pod", "v1", on <= 3);
    B(30, 280, 170, 70, "Pod web-1", "chạy trên node1", "run", on >= 1); B(220, 280, 170, 70, "Pod web-2", "chạy trên node2", "run", on >= 1);
    [[30, "web-1"], [220, "web-2"]].forEach(([x]) => { B(x, 390, 80, 60, "nginx", "container", "run", on >= 2); B(x + 90, 390, 80, 60, "sidecar", "container", "start", on >= 2); });
    [[210, 130, 210, 170], [210, 230, 115, 280], [210, 230, 305, 280], [115, 350, 70, 390], [115, 350, 160, 390], [305, 350, 260, 390], [305, 350, 350, 390]].forEach(([a, b, c, d]) => el("path", { d: "M" + a + " " + b + " L" + c + " " + d, class: "an-l on" }, svg));
    B(560, 280, 240, 70, "Service web", "chọn Pod theo label app=web", "v2", on >= 1);
    el("path", { d: "M560 315 H390", class: "an-l", "stroke-dasharray": "6 5" }, svg);
    B(560, 70, 240, 60, "node1, node2", "Pod được xếp lên node (bài 3.1)", "run", on >= 1);
    el("path", { d: "M680 130 V160 Q680 200 390 300", class: "an-l", "stroke-dasharray": "3 5" }, svg);
  };
  const setVB = async target => {
    const t = ++anim, from = vb.slice(), W = 1100 / 560;
    let [x, y, w, h] = target; if (w / h > W) { const nh = w / W; y -= (nh - h) / 2; h = nh; } else { const nw = h * W; x -= (nw - w) / 2; w = nw; }
    const to = [x, y, w, h], t0 = performance.now(), dur = RM ? 1 : 700;
    await new Promise(res => { const f = now => { if (t !== anim) return res(); const k = ease(Math.min(1, (now - t0) / dur)); vb = from.map((v, i) => v + (to[i] - v) * k); svg.setAttribute("viewBox", vb.join(" ")); if (k < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  };
  const render = () => {
    const L = ZM_LV[lv];
    if (view === "phys") { drawPhys(); setVB(L.r); } else { drawLogic(); setVB([0, 0, 1100, 560]); }
    if (view === "logic") {
      cap.innerHTML = "<b>Ai quản lý ai.</b> Deployment không chứa container trực tiếp: nó giữ khuôn Pod. ReplicaSet tạo Pod từ khuôn đó; container chỉ tồn tại bên trong Pod. Service chọn Pod bằng label, không chọn container. Xóa một Pod thì ReplicaSet tạo Pod mới với container mới, có thể ở node khác.";
      $("#zmCmd").textContent = "# YAML lồng đúng thứ tự này\nkind: Deployment\nspec:\n  template:          # khuôn Pod\n    spec:\n      containers:    # container\n      - name: nginx\n\nk get deploy,rs,pod -l app=web          # cả ba tầng\nk get pod web-1 -o jsonpath='{.metadata.ownerReferences[0].name}'";
    } else {
      cap.innerHTML = "<b>" + esc(L.h) + ".</b> " + esc(L.d) + (lv === "container" ? ' <a href="#container" data-go="container">Học kỹ: 2.1 Container là gì →</a>' : "");
      $("#zmCmd").textContent = L.cmd;
    }
    hlPre($("#zmCmd"));
  };
  p.addEventListener("click", e => {
    const a = e.target.closest("[data-zl]"); if (a) { lv = a.dataset.zl; netPress(p, "data-zl", lv); render(); return; }
    const b = e.target.closest("[data-zv]"); if (b) { view = b.dataset.zv; netPress(p, "data-zv", view); render(); }
  });
  render();
}
lcOnce("arch", ctZoom);
