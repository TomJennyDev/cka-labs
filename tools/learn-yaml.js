/* ---------- R.1 Thư viện YAML: cấu trúc file, mẫu theo loại, đọc lỗi ----------
   Dữ liệu mẫu YAMLT do build.py nhúng từ src/yaml/templates.yaml (mọi mẫu đã qua tools/check_yaml.py).
   Lỗi trong tab "Đọc lỗi" là thông báo thật của kubectl/apiserver v1.34 khi thử từng file hỏng. */
let ytTab = "tpl", ytGroup = "all", ytQ = "", ytOpen = null, ytReady = false;
/* từng dòng của Deployment mẫu: [chữ, giải thích] */
const YT_ANAT = [
  ["apiVersion: apps/v1", "<b>apiVersion</b> = nhóm API / phiên bản. Pod, Service, ConfigMap thuộc nhóm core nên chỉ ghi <code>v1</code>. Không nhớ thì <code>k api-resources | grep -i deploy</code>."],
  ["kind: Deployment", "<b>kind</b> = loại object, viết hoa chữ cái đầu đúng như API. Cặp apiVersion + kind sai là lỗi <i>no matches for kind</i>."],
  ["metadata:", "<b>metadata</b> = danh tính của object: tên, namespace, label, annotation. Phần này giống nhau ở mọi loại."],
  ["  name: web", "Tên duy nhất trong namespace (và trong loại). Chữ thường, số, dấu gạch ngang."],
  ["  namespace: shop", "Không ghi thì dùng namespace của lệnh (<code>-n</code>) hoặc của context. Object cấp cluster (Node, PV, StorageClass, ClusterRole) không có namespace."],
  ["  labels: {app: web}", "<b>labels</b>: cặp key/value để chọn object (Service, selector, NetworkPolicy dùng). Giá trị là chuỗi: số phải để trong nháy."],
  ["  annotations:", "<b>annotations</b>: ghi chú cho công cụ đọc (change-cause, cấu hình controller). Không dùng để chọn object."],
  ["    kubernetes.io/change-cause: \"nginx 1.27\"", "Ví dụ annotation hiện trong <code>k rollout history</code>."],
  ["spec:", "<b>spec</b> = trạng thái <b>bạn muốn</b>. Mỗi kind có spec riêng; tra bằng <code>k explain deployment.spec</code>."],
  ["  replicas: 3", "Field của Deployment. Không ghi thì mặc định 1: API tự điền giá trị mặc định cho mọi field bạn bỏ trống."],
  ["  selector:", "Deployment quản lý Pod nào: chọn theo label. Không đổi được sau khi tạo."],
  ["    matchLabels: {app: web}", "Phải khớp label trong <code>template.metadata.labels</code> bên dưới, sai là API từ chối."],
  ["  template:", "<b>Pod template</b>: khuôn để Deployment, StatefulSet, DaemonSet, Job đúc Pod. Bên trong lại có metadata và spec, nhưng là của <b>Pod</b>."],
  ["    metadata:", "metadata của Pod sẽ được tạo (không có name: controller tự đặt)."],
  ["      labels: {app: web}", "Label gắn lên từng Pod. Service và selector ở trên chọn Pod qua label này."],
  ["    spec:", "spec của <b>Pod</b>: containers, volumes, securityContext… giống hệt <code>spec</code> của một Pod đứng riêng."],
  ["      containers:", "<b>Danh sách</b> container (mỗi mục mở đầu bằng dấu <code>-</code>). Viết như map (không có <code>-</code>) là lỗi <i>cannot unmarshal object … of type []v1.Container</i>."],
  ["      - name: web", "Mục đầu của danh sách: dấu <code>- </code> rồi tới field đầu tiên. Các field sau của cùng mục thẳng cột với <code>name</code>."],
  ["        image: nginx:1.27", "Image và tag. Nên ghi tag cụ thể; <code>:latest</code> khiến kubelet luôn kéo lại."],
  ["        ports:", "Danh sách port container nghe (chủ yếu để đặt tên và cho người đọc)."],
  ["        - containerPort: 80", "Danh sách lồng trong mục danh sách: lại một dấu <code>-</code>, thụt thêm 2."],
  ["status: {}", "<b>status</b> = trạng thái <b>thật</b>, do controller và kubelet ghi. Bạn không viết; <code>$do</code> sinh ra <code>status: {}</code>, để nguyên hay xóa đều được."]
];
const YT_PATHS = [
  ["Pod", "spec.containers", "spec:\n  containers:\n  - name: app"],
  ["Deployment, ReplicaSet, StatefulSet, DaemonSet", "spec.template.spec.containers", "spec:\n  template:\n    spec:\n      containers:\n      - name: app"],
  ["Job", "spec.template.spec.containers", "spec:\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n      - name: app"],
  ["CronJob", "spec.jobTemplate.spec.template.spec.containers", "spec:\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          containers:\n          - name: app"]
];
const YT_ERRS = [
  ["yaml: line 4: found character that cannot start any token", "Có ký tự Tab để thụt dòng.", "YAML chỉ nhận dấu cách. Trong vim: <code>:set et</code> rồi <code>:retab</code>."],
  ["yaml: line 4: did not find expected key", "Thụt dòng lệch: một dòng ít hoặc nhiều dấu cách hơn các dòng cùng cấp.", "Xem dòng được báo và dòng ngay trên; dùng <code>V</code> + <code>&gt;</code>/<code>&lt;</code> trong vim."],
  ["yaml: line N: mapping values are not allowed in this context", "Giá trị chứa <code>: </code> mà không để trong nháy.", "Bọc giá trị trong nháy: <code>command: [\"sh\", \"-c\", \"echo a: b\"]</code>."],
  ["strict decoding error: unknown field \"spec.containers[0].imagePullPolice\"", "Sai tên field (chính tả, hoa thường).", "<code>k explain pod.spec.containers</code> để xem tên đúng."],
  ["Deployment … strict decoding error: unknown field \"spec.containers\"", "Đặt <code>containers</code> sai tầng: thiếu <code>template.spec</code>.", "Xem bảng đường tới containers ở tab Cấu trúc."],
  ["cannot unmarshal object into Go struct field PodSpec.spec.containers of type []v1.Container", "Viết danh sách như map (thiếu dấu <code>-</code>).", "Thêm <code>- </code> trước field đầu của mỗi mục."],
  ["cannot unmarshal number into Go struct field EnvVar.spec.containers.env.value of type string", "Giá trị env là số không để trong nháy.", "<code>value: \"8080\"</code>."],
  ["cannot unmarshal bool into Go struct field EnvVar … of type string", "Viết <code>yes</code>, <code>no</code>, <code>true</code>, <code>on</code> không nháy: YAML hiểu là boolean.", "<code>value: \"yes\"</code>."],
  ["cannot unmarshal number into Go struct field ObjectMeta.metadata.labels of type string", "Giá trị label hoặc annotation là số.", "<code>labels: {ver: \"2\"}</code>."],
  ["no matches for kind \"Deployment\" in version \"v1\"", "Sai apiVersion (Deployment là <code>apps/v1</code>) hoặc CRD chưa được cài.", "<code>k api-resources | grep -i &lt;kind&gt;</code> xem cột APIVERSION."],
  ["spec.template.metadata.labels: Invalid value … `selector` does not match template `labels`", "selector và label của Pod template khác nhau.", "Sửa cho hai chỗ giống hệt nhau."]
];
function ytAnatHTML() {
  return '<div class="split even" style="align-items:start"><div class="panel col"><h3 style="margin:0">Bấm vào từng dòng</h3><pre class="code yt-anat">' +
    YT_ANAT.map(([l], i) => '<span class="yt-l" data-al="' + i + '">' + esc(l) + "</span>").join("\n") + '</pre></div><div class="panel col yt-note" id="ytNote"></div></div>' +
    '<div class="panel"><h3>Bốn phần của mọi object</h3><div class="tbl"><table><thead><tr><th>Phần</th><th>Ai viết</th><th>Chứa gì</th></tr></thead><tbody>' +
    [["apiVersion, kind", "Bạn", "Loại object và phiên bản API"], ["metadata", "Bạn (name, label) + API (uid, resourceVersion…)", "Danh tính"], ["spec", "Bạn", "Trạng thái mong muốn"], ["status", "Controller, kubelet", "Trạng thái thật; không viết"]].map(r => "<tr><td><b>" + r[0] + "</b></td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>").join("") +
    '</tbody></table></div><p class="small muted" style="margin:10px 0 0">ConfigMap, Secret, Role, StorageClass… không có <code>spec</code> mà có field riêng ở cấp cao nhất (<code>data</code>, <code>rules</code>, <code>provisioner</code>). <code>k explain &lt;kind&gt;</code> cho biết field nào ở cấp nào.</p></div>' +
    '<div class="panel"><h3>containers nằm ở đâu</h3><div class="tbl"><table><thead><tr><th>Loại</th><th>Đường dẫn</th><th>Khung</th></tr></thead><tbody>' +
    YT_PATHS.map(r => "<tr><td><b>" + esc(r[0]) + "</b></td><td><code>" + esc(r[1]) + '</code></td><td><pre class="code" style="margin:0;font-size:12px;padding:8px 10px">' + esc(r[2]) + "</pre></td></tr>").join("") + "</tbody></table></div></div>" +
    '<div class="split even"><div class="panel"><h3>Cú pháp YAML cần cho Kubernetes</h3><div class="tbl"><table><thead><tr><th>Viết</th><th>Nghĩa</th></tr></thead><tbody>' +
    [["key: value", "Map (cặp khóa giá trị). Sau dấu <code>:</code> phải có dấu cách."], ["- item", "Một mục của danh sách."], ["- name: a<br>&nbsp;&nbsp;image: b", "Danh sách các map: dòng sau thẳng cột với <code>name</code>."], ["{a: 1, b: 2} &nbsp; [x, y]", "Map và danh sách viết trên một dòng, hợp lệ y như nhiều dòng."], ["\"8080\", \"yes\", \"*/5 * * * *\"", "Để trong nháy khi là số, yes/no/on/off/true, hoặc có ký tự đặc biệt <code>: # * { [</code>."], ["key: |", "Chuỗi nhiều dòng, giữ nguyên xuống dòng (file cấu hình, script)."], ["key: &gt;", "Chuỗi nhiều dòng, nối thành một dòng."], ["---", "Ngăn cách nhiều object trong một file."], ["# ghi chú", "Chú thích, API bỏ qua."]].map(r => "<tr><td><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>").join("") +
    '</tbody></table></div><p class="small muted" style="margin:10px 0 0">Thụt dòng chỉ dùng dấu cách, thường 2. Cùng cấp phải thẳng cột tuyệt đối.</p></div>' +
    '<div class="panel"><h3>Lấy YAML có sẵn để dùng lại</h3>' + lcCode(`k get deploy web -o yaml > web.yaml
# xóa những gì cluster tự ghi trước khi dùng cho object mới:
#   status: (cả khối)
#   metadata: uid, resourceVersion, creationTimestamp, generation, managedFields
#   metadata.annotations: kubectl.kubernetes.io/last-applied-configuration
#   Pod: spec.nodeName      Service: spec.clusterIP, spec.clusterIPs`) +
    '<h3 style="margin-top:14px">Không nhớ field</h3>' + lcCode(`k explain deploy.spec.strategy           # mô tả một field
k explain pod.spec --recursive | less     # cây field đầy đủ
k api-resources | grep -i ingress         # apiVersion, tên ngắn, có namespace không
k create deploy x --image=nginx $do       # khung đúng tầng, chỉ thêm field`) + "</div></div>" +
    '<div class="panel"><h3>apiVersion của các loại hay gặp</h3><div class="tbl"><table><thead><tr><th>apiVersion</th><th>Loại</th></tr></thead><tbody>' +
    [["v1", "Pod, Service, ConfigMap, Secret, Namespace, ServiceAccount, PersistentVolume, PersistentVolumeClaim, ResourceQuota, LimitRange"], ["apps/v1", "Deployment, StatefulSet, DaemonSet, ReplicaSet"], ["batch/v1", "Job, CronJob"], ["networking.k8s.io/v1", "Ingress, IngressClass, NetworkPolicy"], ["gateway.networking.k8s.io/v1", "GatewayClass, Gateway, HTTPRoute (ReferenceGrant: v1beta1)"], ["rbac.authorization.k8s.io/v1", "Role, RoleBinding, ClusterRole, ClusterRoleBinding"], ["storage.k8s.io/v1", "StorageClass, CSIDriver, VolumeAttachment"], ["autoscaling/v2", "HorizontalPodAutoscaler"], ["policy/v1", "PodDisruptionBudget"], ["scheduling.k8s.io/v1", "PriorityClass"], ["apiextensions.k8s.io/v1", "CustomResourceDefinition"]].map(r => "<tr><td><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>").join("") + "</tbody></table></div></div>";
}
function ytCard(t, open) {
  const g = YAMLT.groups[t.g], mod = MODULES.find(m => m.id === t.learn);
  return '<details class="ck-ex yt-card" id="yt-' + t.id + '"' + (open ? " open" : "") + "><summary><span class=\"ck-dom dom-" + ({ work: "build", config: "env", net: "net", stor: "deploy", sec: "obs", sched: "env", ops: "build" })[t.g] + '">' + esc(g) + '</span><span class="t">' + esc(t.t) + '</span><span class="mins">' + esc(t.kind) + '</span></summary><div class="body">' +
    '<p style="margin:0">' + esc(t.use) + "</p>" + (t.gen ? '<div><span class="small muted">Sinh nhanh:</span>' + lcCode(t.gen) + "</div>" : "") +
    (t.files ? Object.entries(t.files).map(([f, b]) => lcDet(esc(f), lcCode(b))).join("") : "") + lcCode(t.yaml) +
    (t.trap ? '<div class="trap ck-topic" style="padding:8px 10px"><span><b>Bẫy:</b> ' + esc(t.trap) + "</span></div>" : "") +
    '<div class="ck-links">' + (mod ? '<a class="ck-src" href="#' + t.learn + '" data-go="' + t.learn + '">Học: ' + esc(mod.n + " " + mod.t) + "</a>" : "") + '<a class="ck-src" href="' + lcEa(t.docs) + '" target="_blank" rel="noopener">docs ↗</a><span class="small muted">đã kiểm bằng kubectl apply --dry-run=server</span></div></div></details>';
}
function ytRender() {
  const box = $("#ytBody");
  $$("#ytTabs [data-ytt]").forEach(b => b.setAttribute("aria-pressed", b.dataset.ytt === ytTab ? "true" : "false"));
  if (ytTab === "anat") { box.innerHTML = ytAnatHTML(); ytNote(0); lcEnhance(box); return; }
  if (ytTab === "errs") {
    box.innerHTML = '<div class="panel"><p class="small muted" style="margin:0 0 10px">Mỗi dòng là thông báo thật khi apply một file hỏng (kubectl và apiserver v1.34). Lỗi bắt đầu bằng <code>yaml: line N</code> là YAML sai cú pháp, chưa tới được API; lỗi <code>unmarshal</code>, <code>unknown field</code>, <code>Invalid value</code> là API đọc được YAML nhưng nội dung sai.</p><div class="tbl"><table><thead><tr><th>kubectl in ra</th><th>Nguyên nhân</th><th>Sửa</th></tr></thead><tbody>' +
      YT_ERRS.map(r => '<tr><td><code style="white-space:normal;overflow-wrap:anywhere">' + esc(r[0]) + "</code></td><td>" + r[1] + "</td><td>" + r[2] + "</td></tr>").join("") + "</tbody></table></div></div>";
    return;
  }
  const q = ytQ.trim().toLowerCase(), list = YAMLT.templates.filter(t => (ytGroup === "all" || t.g === ytGroup) && (!q || (t.t + " " + t.kind + " " + t.use + " " + t.yaml).toLowerCase().includes(q)));
  box.innerHTML = '<div class="panel col"><div class="controls" style="margin:0"><input type="search" id="ytQ" placeholder="Tìm: cronjob, tolerations, ingressClassName…" style="flex:1;min-width:220px" aria-label="Tìm mẫu"><span class="small muted">' + list.length + " / " + YAMLT.templates.length + " mẫu</span></div>" +
    '<div class="chips"><button type="button" data-ytg="all" aria-pressed="' + (ytGroup === "all") + '">Tất cả</button>' + Object.entries(YAMLT.groups).map(([k, v]) => '<button type="button" data-ytg="' + k + '" aria-pressed="' + (ytGroup === k) + '">' + esc(v) + " · " + YAMLT.templates.filter(t => t.g === k).length + "</button>").join("") + "</div></div>" +
    '<div class="col" id="ytList" style="gap:10px">' + (list.length ? list.map(t => ytCard(t, t.id === ytOpen)).join("") : '<p class="muted">Không có mẫu khớp.</p>') + "</div>";
  const qi = $("#ytQ"); qi.value = ytQ; if (q) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); }
  lcEnhance(box);
  if (ytOpen) { const c = $("#yt-" + ytOpen); if (c) setTimeout(() => c.scrollIntoView({ block: "start" }), 40); ytOpen = null; }
}
function ytNote(i) {
  $$(".yt-l").forEach(s => s.classList.toggle("on", +s.dataset.al === i));
  const n = $("#ytNote"); if (n) n.innerHTML = '<code style="font-size:13px">' + esc(YT_ANAT[i][0].trim()) + "</code><p style=\"margin:8px 0 0\">" + YT_ANAT[i][1] + "</p>" + '<p class="small muted" style="margin:10px 0 0">Dòng ' + (i + 1) + " / " + YT_ANAT.length + ". Phím ↑ ↓ để đi tiếp.</p>";
}
lcOnce("yamlref", () => {
  const sec = $('.view[data-view="yamlref"]');
  sec.addEventListener("click", e => {
    const tb = e.target.closest("[data-ytt]"); if (tb) { ytTab = tb.dataset.ytt; ytRender(); return; }
    const g = e.target.closest("[data-ytg]"); if (g) { ytGroup = g.dataset.ytg; ytRender(); return; }
    const l = e.target.closest("[data-al]"); if (l) ytNote(+l.dataset.al);
  });
  sec.addEventListener("input", e => { if (e.target.id === "ytQ") { ytQ = e.target.value; ytRender(); } });
  document.addEventListener("keydown", e => {
    if (current !== "yamlref" || ytTab !== "anat" || !/Arrow(Up|Down)/.test(e.key) || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const on = $(".yt-l.on"), i = on ? +on.dataset.al : 0, j = Math.max(0, Math.min(YT_ANAT.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    if (j !== i) { e.preventDefault(); ytNote(j); }
  });
  ytRender();
});
LC_REPLAY.yamlref = () => { if (ytOpen) { ytTab = "tpl"; ytGroup = "all"; ytQ = ""; } ytRender(); };
/* mở một mẫu từ chỗ khác: <a data-yt="deploy"> */
document.addEventListener("click", e => {
  const a = e.target.closest("[data-yt]"); if (!a) return;
  e.preventDefault(); ytOpen = a.dataset.yt; ytTab = "tpl"; ytGroup = "all"; ytQ = "";
  if (current === "yamlref") ytRender(); else show("yamlref");
});
