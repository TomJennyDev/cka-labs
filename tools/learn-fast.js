/* ---------- R.3 Gõ ít khi thi CKAD: bảng "việc → lệnh" tìm được, bấm để chép ----------
   Mọi lệnh (trừ nhóm Helm & image) đã chạy thử trên cluster k3s v1.34 ngày 13/11/2026. */
const FAST = [
  ["Pod & Deployment", [
    ["Pod có port, label, biến môi trường", "k run web --image=nginx:1.27 --port=80 -l app=web,tier=fe --env=MODE=prod"],
    ["Pod chạy một lệnh shell", "k run box --image=busybox:1.36 --restart=Never -- sh -c 'echo hi; sleep 3600'", "phần sau -- là args; image có ENTRYPOINT thì dùng --command --"],
    ["Pod và Service cùng lúc", "k run web --image=nginx:1.27 --port=80 --expose"],
    ["Deployment", "k create deploy shop --image=nginx:1.27 --replicas=3 --port=80", "container tên theo image: nginx"],
    ["Sinh khung YAML để sửa", "k run web --image=nginx:1.27 $do > web.yaml", "$do đặt ở bước chuẩn bị mỗi máy"],
    ["Lấy YAML của object có sẵn", "k get deploy shop -o yaml > shop.yaml"],
    ["Nhớ tên field không cần docs", "k explain pod.spec.containers.livenessProbe --recursive | less"]
  ]],
  ["Service & Ingress", [
    ["Service trước Deployment", "k expose deploy shop --port=80 --target-port=8080 --name=shop-svc"],
    ["NodePort", "k expose deploy shop --port=80 --type=NodePort --name=shop-np"],
    ["Đặt số nodePort cụ thể", "k patch svc shop-np -p '{\"spec\":{\"ports\":[{\"port\":80,\"nodePort\":30080}]}}'", "expose không có cờ nodePort"],
    ["Service cho một Pod", "k expose po web --port=80 --name=web-svc"],
    ["Ingress hai path", "k create ing shop --class=nginx --rule='shop.example.com/api*=api:8080' --rule='shop.example.com/*=web:80'", "có * là Prefix, không có * là Exact (kể cả /)"],
    ["Ingress có TLS", "k create ing shop --class=nginx --rule='shop.example.com/*=web:80,tls=shop-tls'"]
  ]],
  ["Cấu hình & bảo mật", [
    ["ConfigMap", "k create cm cfg --from-literal=LOG=info --from-file=app.conf"],
    ["Secret", "k create secret generic db --from-literal=PASS=s3cr3t"],
    ["Mọi key thành biến môi trường", "k set env deploy/shop --from=configmap/cfg"],
    ["Secret thành biến có tiền tố", "k set env deploy/shop --from=secret/db --prefix=DB_"],
    ["Thêm một biến", "k set env deploy/shop TZ=Asia/Ho_Chi_Minh"],
    ["requests và limits", "k set resources deploy shop --requests=cpu=100m,memory=128Mi --limits=cpu=200m,memory=256Mi"],
    ["ServiceAccount cho Deployment", "k create sa build && k set sa deploy shop build"],
    ["Role", "k create role pod-reader --verb=get,list,watch --resource=pods,pods/log"],
    ["RoleBinding cho ServiceAccount", "k create rolebinding pod-reader --role=pod-reader --serviceaccount=NS:build"],
    ["Kiểm tra quyền", "k auth can-i list pods -n NS --as=system:serviceaccount:NS:build", "trả no thì mã thoát là 1"],
    ["Token tạm của ServiceAccount", "k create token build --duration=1h"],
    ["ResourceQuota", "k create quota q --hard=pods=10,requests.cpu=2,limits.memory=4Gi"],
    ["PodDisruptionBudget", "k create pdb shop --selector=app=shop --min-available=1"]
  ]],
  ["Job, rollout, scale", [
    ["Job", "k create job calc --image=busybox:1.36 -- sh -c 'echo $((6*7))'", "completions, parallelism, backoffLimit: sinh bằng $do rồi sửa"],
    ["CronJob", "k create cj backup --image=busybox:1.36 --schedule='*/5 * * * *' -- date"],
    ["Chạy CronJob ngay để thử", "k create job backup-now --from=cj/backup"],
    ["Đổi image", "k set image deploy/shop nginx=nginx:1.28", "nginx= là tên container"],
    ["Ghi lý do cho lịch sử rollout", "k annotate deploy shop kubernetes.io/change-cause='nginx 1.28'"],
    ["Xem, quay lại bản cũ", "k rollout history deploy shop && k rollout undo deploy shop --to-revision=1"],
    ["Khởi động lại mọi Pod", "k rollout restart deploy shop"],
    ["Scale", "k scale deploy shop --replicas=5"],
    ["HPA", "k autoscale deploy shop --min=2 --max=5 --cpu=70%", "--cpu-percent đã cũ"]
  ]],
  ["Sửa object đang chạy", [
    ["Thêm, đổi, xóa label", "k label po web env=prod --overwrite && k label po web tier-"],
    ["Sửa Deployment tại chỗ", "k edit deploy shop", "lưu là rollout ngay"],
    ["Sửa field Pod không cho sửa", "k edit po web", "lưu bị từ chối, kubectl ghi bản nháp ra /tmp/kubectl-edit-*.yaml"],
    ["… rồi áp bản nháp đó", "k replace --force -f /tmp/kubectl-edit-*.yaml", "xóa Pod cũ rồi tạo lại; tạo lỗi thì Pod mất, giữ file lại"],
    ["Xóa ngay không chờ", "k delete po web $now"]
  ]],
  ["Kiểm tra nhanh", [
    ["Chờ tới khi Ready", "k wait --for=condition=Ready po/web --timeout=60s"],
    ["Gọi Service từ trong cluster", "k run t --image=busybox:1.36 --rm -i --restart=Never -- wget -qO- -T2 shop-svc:80"],
    ["Log mọi Pod theo label", "k logs -l app=shop --tail=20 --prefix", "k logs deploy/shop chỉ lấy một Pod"],
    ["Log lần chạy trước khi crash", "k logs web -c app --previous"],
    ["Event mới nhất", "k get events --sort-by=.lastTimestamp | tail"],
    ["Service có endpoint chưa", "k get endpointslice -l kubernetes.io/service-name=shop-svc"],
    ["Biến môi trường trong container", "k exec web -- env | grep MODE"],
    ["Ghi kết quả ra file đề yêu cầu", "k get po web -o jsonpath='{.spec.containers[*].image}' > /opt/answer.txt"],
    ["Gỡ lỗi container không có shell", "k debug web -it --image=busybox:1.36 --target=web"],
    ["CPU, RAM đang dùng", "k top po --sort-by=memory"]
  ]],
  ["Helm & image (chưa chạy thử trên cluster)", [
    ["Thêm repo, tìm chart", "helm repo add podinfo https://stefanprodan.github.io/podinfo && helm search repo podinfo --versions"],
    ["Xem giá trị chỉnh được", "helm show values podinfo/podinfo | grep -i -A2 replica"],
    ["Cài vào namespace mới", "helm install web podinfo/podinfo -n web --create-namespace --set replicaCount=2"],
    ["Nâng cấp, xem, quay lại", "helm upgrade web podinfo/podinfo -n web --set replicaCount=3 && helm history web -n web && helm rollback web 1 -n web"],
    ["Release ở mọi namespace", "helm list -A"],
    ["Build, đặt tag, lưu ra file", "podman build -t app:1.0 . && podman save -o /root/app.tar app:1.0"]
  ]]
];
function fastInit() {
  const box = $("#fastBody"), n = FAST.reduce((a, g) => a + g[1].length, 0);
  box.innerHTML = '<div class="controls" style="margin:0"><input type="search" id="fastQ" placeholder="Tìm việc cần làm: secret, nodeport, rollback…" style="flex:1;min-width:220px" aria-label="Tìm lệnh"><span class="small muted" id="fastN"></span></div>' +
    '<div class="grid ck-cheatgrid" id="fastGrid">' + FAST.map(([g, rows]) => '<div class="panel" data-fg><h3 style="margin:0">' + esc(g) + "</h3>" +
      rows.map(([t, c, note]) => '<button type="button" class="ch-row" data-q="' + lcEa((g + " " + t + " " + c + " " + (note || "")).toLowerCase()) + '"><b style="font-size:13px">' + esc(t) + "</b><code>" + esc(c) + "</code>" + (note ? "<span>" + esc(note) + "</span>" : "<span></span>") + "</button>").join("") + "</div>").join("") + "</div>";
  const filter = () => {
    const q = $("#fastQ").value.trim().toLowerCase(); let k = 0;
    $$("#fastGrid [data-fg]").forEach(p => { let any = false; $$(".ch-row", p).forEach(r => { const m = !q || r.dataset.q.includes(q); r.hidden = !m; if (m) { any = true; k++; } }); p.hidden = !any; });
    $("#fastN").textContent = k + " / " + n + " lệnh · bấm để chép";
  };
  box.addEventListener("input", filter);
  box.addEventListener("click", e => {
    const r = e.target.closest(".ch-row"); if (!r) return;
    const t = $("code", r).textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => {}).finally(() => { r.classList.add("copied"); setTimeout(() => r.classList.remove("copied"), 1200); });
  });
  filter();
}
lcOnce("fast", fastInit);
