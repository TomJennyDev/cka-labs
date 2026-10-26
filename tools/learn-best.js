/* ---------- Best practices: cấu trúc thư mục, YAML chuẩn, Kustomize, Helm, CI/CD ---------- */
/* BEST_FILES được build.py chèn vào từ examples/web-api/ để trang luôn khớp với repo. */
const REPO_EX = "https://github.com/TomJennyDev/cka-labs/tree/main/examples/web-api/";

const yhl = t => kEsc(t).split("\n").map(line => {
  const i = line.search(/(^|\s)#/);
  let code = i >= 0 ? line.slice(0, i) : line, com = i >= 0 ? line.slice(i) : "";
  code = code.replace(/^(\s*(?:-\s+)?)([A-Za-z0-9_.\/-]+)(:)(?=\s|$)/, '$1<span class="k">$2</span>$3');
  code = code.replace(/(\{\{-?.*?-?\}\})/g, '<span class="p">$1</span>');
  return code + (com ? '<span class="c">' + com + "</span>" : "");
}).join("\n");
const fileBlock = (path, open) => '<details class="bp"' + (open ? " open" : "") + '><summary><code>' + kEsc(path) + '</code><a class="small" style="margin-left:auto;font-weight:500" href="' + REPO_EX + kEsc(path) + '" target="_blank" rel="noopener">GitHub ↗</a></summary><div class="body"><div class="codewrap"><pre class="code">' + yhl(BEST_FILES[path] || "(thiếu file)") + "</pre></div></div></details>";
const tree = t => '<div class="codewrap"><pre class="code">' + kEsc(t) + "</pre></div>";

const BEST_LAYOUTS = [
  ["Repo của một ứng dụng", "Một đội sở hữu cả mã nguồn và cách triển khai, ít môi trường. Chart hoặc overlay nằm cạnh mã nguồn và được phát hành cùng phiên bản.", `web-api/
├── src/                      # mã nguồn
├── Dockerfile
├── deploy/
│   └── helm/web-api/         # chart đi cùng mã nguồn
└── .github/workflows/
    └── ci.yaml               # build image (tag = git SHA) → helm lint → render → kubeconform`],
  ["Kustomize: base và overlays", "Cấu hình thuần YAML, mỗi môi trường chỉ ghi phần khác. Không có biến hay vòng lặp: đọc là biết kết quả.", `deploy/
├── base/                     # cấu hình chung, áp được ngay (kubectl apply -k base)
├── components/               # khối tùy chọn bật theo môi trường (vd. debug sidecar)
└── overlays/
    ├── dev/                  # namespace, replicas, hostname, log level…
    ├── staging/
    └── prod/`],
  ["Helm chart", "Đóng gói để cài nhiều lần, nhiều nơi, có phiên bản và lịch sử release. Cách phát hành phần mềm cho người khác dùng.", `web-api/                      # thư mục chart = tên chart
├── Chart.yaml                # name, version (chart), appVersion (ứng dụng), dependencies
├── values.yaml               # mặc định chạy được ngay, có chú thích từng khóa
├── values.schema.json        # Helm kiểm tra values trước khi render
├── .helmignore
├── charts/                   # chart phụ thuộc (helm dependency update)
├── crds/                     # CRD: cài một lần, Helm không nâng cấp
└── templates/
    ├── _helpers.tpl          # name, fullname, labels, selectorLabels
    ├── deployment.yaml       # mỗi file một loại object, đặt tên theo kind
    ├── service.yaml  hpa.yaml  pdb.yaml  …
    ├── NOTES.txt             # hướng dẫn in ra sau khi cài
    └── tests/                # helm test`],
  ["Repo GitOps cho nhiều cluster", "Argo CD hoặc Flux đồng bộ cluster theo Git. Hạ tầng dùng chung tách khỏi ứng dụng; mỗi cluster một thư mục.", `platform-gitops/
├── clusters/
│   ├── prod-sg/              # cluster này chạy những gì
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   └── staging-sg/
├── infrastructure/
│   ├── controllers/          # cert-manager, Gateway controller, External Secrets, metrics-server
│   └── configs/              # ClusterIssuer, GatewayClass, StorageClass, PriorityClass
├── tenants/                  # mỗi đội: Namespace, ResourceQuota, LimitRange, RoleBinding
└── apps/
    ├── base/web-api/
    ├── staging/web-api/
    └── production/web-api/`]
];

const BEST_RULES = [
  ["Metadata", "Bộ label app.kubernetes.io/name, instance, version, component, part-of, managed-by", "Công cụ (kubectl, Helm, Argo CD, dashboard) và người đọc đều dựa vào chúng"],
  ["Metadata", "Selector chỉ dùng label không bao giờ đổi (name, instance)", "selector bất biến; cho version vào selector thì không nâng cấp được"],
  ["Image", "Ghim tag hoặc digest, không dùng latest", "Cùng một YAML phải ra cùng một kết quả; rollback mới có nghĩa"],
  ["Tài nguyên", "Luôn có requests; có memory limit", "Scheduler cần requests để xếp Pod; thiếu memory limit một Pod có thể làm node hết RAM"],
  ["Tài nguyên", "Cân nhắc kỹ CPU limit", "CPU limit gây throttle kể cả khi node rảnh; nhiều đội chỉ đặt CPU requests"],
  ["Sức khỏe", "Tách startup, readiness, liveness", "Liveness không kiểm database hay dịch vụ ngoài: lỗi bên ngoài sẽ làm restart dây chuyền"],
  ["Sức khỏe", "preStop + terminationGracePeriodSeconds", "Cho thời gian gỡ khỏi endpoint và xử lý xong request đang dở"],
  ["Sẵn sàng", "Tối thiểu 2 bản sao, PodDisruptionBudget, topology spread", "Drain node, nâng cấp cluster, mất một zone không làm sập dịch vụ"],
  ["Sẵn sàng", "Có HPA thì bỏ replicas trong Deployment", "Mỗi lần apply sẽ ghi đè số bản sao HPA đã chọn"],
  ["Bảo mật", "runAsNonRoot, readOnlyRootFilesystem, drop ALL, allowPrivilegeEscalation false, seccomp RuntimeDefault", "Đạt Pod Security restricted; container bị chiếm cũng khó leo thang"],
  ["Bảo mật", "ServiceAccount riêng, automountServiceAccountToken false nếu không gọi API", "Không lộ token có quyền khi không cần"],
  ["Bảo mật", "NetworkPolicy mặc định chặn, mở đúng cổng", "Một Pod bị chiếm không đi ngang được tới mọi dịch vụ"],
  ["Cấu hình", "ConfigMap cho cấu hình, Secret do hệ thống quản lý bí mật tạo; không commit bí mật", "Bí mật trong Git là bí mật đã lộ"],
  ["Cấu hình", "Đổi cấu hình thì rollout lại Pod (configMapGenerator hoặc checksum annotation)", "Biến môi trường chỉ đọc lúc container khởi động"],
  ["Vận hành", "maxUnavailable 0 khi rolling update; revisionHistoryLimit vừa phải", "Không mất năng lực phục vụ khi cập nhật; giữ đủ revision để rollback"],
  ["Namespace", "Mỗi ứng dụng/đội một namespace có ResourceQuota, LimitRange, Pod Security", "Giới hạn ảnh hưởng của một ứng dụng lỗi"]
];

const BEST_CHECK = [
  "Image ghim tag/digest, quét lỗ hổng trong CI",
  "requests cho mọi container, memory limit",
  "startupProbe/readinessProbe/livenessProbe đúng vai trò",
  "≥ 2 bản sao, PDB, topology spread",
  "HPA (và không đặt replicas cứng)",
  "securityContext đạt Pod Security restricted",
  "ServiceAccount riêng, quyền RBAC tối thiểu",
  "NetworkPolicy default-deny + mở đúng cổng",
  "Secret lấy từ hệ thống quản lý bí mật, không nằm trong Git",
  "Label app.kubernetes.io/* đầy đủ",
  "Log ra stdout/stderr, có metrics và cảnh báo",
  "preStop và terminationGracePeriodSeconds phù hợp",
  "Đã thử rollback (rollout undo hoặc helm rollback)",
  "Manifest render và kiểm tra được trong CI (lint, kubeconform, policy)",
  "Sao lưu dữ liệu (PVC, database) và đã thử khôi phục"
];

const BEST_CI = `flowchart LR
  pr(["Pull request"]) --> b["Build image<br/>tag = git SHA"]
  b --> s["Quét lỗ hổng image"]
  s --> r["Render<br/>helm template / kustomize build"]
  r --> v["Kiểm tra<br/>helm lint · kubeconform · kube-linter"]
  v --> p["Chính sách<br/>Kyverno / Gatekeeper (dry-run)"]
  p --> m(["Merge"])
  m --> g["PR đổi tag image<br/>trong repo GitOps"]
  g --> a["Argo CD / Flux<br/>đồng bộ cluster"]
  a --> o["Theo dõi rollout<br/>tự rollback khi lỗi"]`;
const BEST_GITOPS = `sequenceDiagram
  participant D as Dev
  participant G as Repo GitOps
  participant A as Argo CD / Flux
  participant K as Cluster
  D->>G: PR: apps/production/web-api tag 6.15.0 → 6.16.0
  G-->>A: merge vào main
  A->>G: kéo cấu hình mới
  A->>A: render (Helm/Kustomize), so với cluster
  A->>K: apply phần khác biệt
  K-->>A: trạng thái rollout, health
  Note over A,K: ai sửa tay trên cluster sẽ bị đưa về đúng Git (self-heal)`;

const BEST_TABS = [
  ["layout", "Chia thư mục"], ["yaml", "YAML chuẩn"], ["kustomize", "Kustomize"], ["helm", "Helm chart"],
  ["choose", "Helm hay Kustomize"], ["cicd", "CI/CD và GitOps"], ["check", "Checklist go-live"]
];
let bestCur = "layout";

function bestInit() {
  const t = $("#bestTabs");
  if (!t.dataset.ready) {
    t.dataset.ready = "1";
    t.innerHTML = BEST_TABS.map(x => '<button type="button" data-b="' + x[0] + '" aria-pressed="false">' + kEsc(x[1]) + "</button>").join("");
    t.addEventListener("click", e => { const b = e.target.closest("button[data-b]"); if (b) { bestCur = b.dataset.b; store.set("best", bestCur); bestShow(); } });
    bestCur = store.get("best", "layout");
  }
  bestShow();
}

function bestShow() {
  $$("#bestTabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.b === bestCur ? "true" : "false"));
  const box = $("#bestBody");
  let h = "";
  if (bestCur === "layout") {
    h += '<p class="lead" style="color:var(--ink)">Không có một cấu trúc đúng cho mọi dự án. Chọn theo ai sở hữu cấu hình, có bao nhiêu môi trường và cluster, và cấu hình có cần phát hành cho người khác cài không.</p>';
    h += '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(min(420px,100%),1fr))">' + BEST_LAYOUTS.map(l => '<div class="panel col"><h4>' + kEsc(l[0]) + '</h4><p class="small muted">' + kEsc(l[1]) + "</p>" + tree(l[2]) + "</div>").join("") + "</div>";
    h += '<div class="panel"><h4>Nguyên tắc</h4><ul class="tight"><li>Môi trường là <b>thư mục</b>, không phải nhánh Git. Đưa lên môi trường sau bằng một PR đổi tag image.</li><li>Hạ tầng dùng chung (controller, CRD, StorageClass, GatewayClass) tách khỏi ứng dụng và được cài trước.</li><li>Không commit bí mật: External Secrets, Sealed Secrets hoặc SOPS; cấu hình chỉ tham chiếu tên Secret.</li><li>Mọi thứ trong Git phải render và kiểm tra được trong CI.</li><li>Mỗi file một object (hoặc một nhóm nhỏ liên quan), tên file theo kind: <code>deployment.yaml</code>, <code>service.yaml</code>.</li></ul><p class="small" style="margin-top:10px">Bộ mẫu đầy đủ: <a href="' + REPO_EX + '" target="_blank" rel="noopener">examples/web-api trên GitHub ↗</a></p></div>';
  } else if (bestCur === "yaml") {
    h += '<p class="lead" style="color:var(--ink)">Bộ YAML dưới đây là <code>examples/web-api/base</code> trong repo: chạy được với Pod Security <code>restricted</code>, đã kiểm tra bằng <code>kubectl apply --dry-run=server</code>. Mỗi dòng quan trọng có chú thích vì sao.</p>';
    h += '<div class="panel"><h4>Checklist và lý do</h4><div class="tbl"><table><thead><tr><th>Nhóm</th><th>Quy tắc</th><th>Vì sao</th></tr></thead><tbody>' + BEST_RULES.map(r => "<tr><td><span class=\"pill\">" + kEsc(r[0]) + "</span></td><td>" + kEsc(r[1]) + '</td><td class="small muted">' + kEsc(r[2]) + "</td></tr>").join("") + "</tbody></table></div></div>";
    h += '<div class="panel col"><h4>Các file</h4>' + ["base/deployment.yaml", "base/namespace.yaml", "base/serviceaccount.yaml", "base/configmap.yaml", "base/service.yaml", "base/hpa.yaml", "base/pdb.yaml", "base/networkpolicy.yaml", "base/httproute.yaml"].map((p, i) => fileBlock(p, i === 0)).join("") + "</div>";
  } else if (bestCur === "kustomize") {
    h += '<p class="lead" style="color:var(--ink)">Base chứa cấu hình chung. Mỗi overlay chỉ ghi phần khác: namespace, label môi trường, image, số bản sao, tài nguyên. Kustomize có sẵn trong kubectl.</p>';
    h += '<div class="split even"><div class="panel col"><h4>Cây thư mục</h4>' + tree(`examples/web-api/
├── base/
│   ├── kustomization.yaml
│   └── deployment.yaml  service.yaml  …
└── overlays/
    ├── dev/kustomization.yaml
    └── prod/
        ├── kustomization.yaml
        └── deployment-resources.yaml`) + '</div><div class="panel col"><h4>Lệnh</h4>' +
      [["kubectl kustomize overlays/prod", "Xem YAML cuối cùng, chưa áp"], ["kubectl diff -k overlays/prod", "So với cluster trước khi áp"], ["kubectl apply -k overlays/prod", "Áp overlay"], ["kustomize edit set image ghcr.io/stefanprodan/podinfo:6.16.0", "CI đổi tag image (chạy trong thư mục overlay)"], ["kubectl delete -k overlays/dev", "Gỡ toàn bộ"]].map(c => '<div class="cmdrow"><code>' + kEsc(c[0]) + "</code><span>" + kEsc(c[1]) + "</span></div>").join("") + "</div></div>";
    h += '<div class="panel"><h4>Quy tắc</h4><ul class="tight"><li><code>labels</code> với <code>includeSelectors: false</code> để thêm label môi trường mà không đụng selector bất biến.</li><li>Patch nhỏ dùng JSON 6902 (<code>op: replace</code>); patch nhiều trường dùng strategic merge (file YAML một phần, container khớp theo <code>name</code>).</li><li><code>configMapGenerator</code> thêm hash vào tên ConfigMap: đổi nội dung là Deployment tự rollout.</li><li><code>$patch: delete</code> để bỏ một object của base ở một môi trường (ví dụ PDB ở dev).</li><li>Đừng dùng <code>namePrefix</code> khi object được tham chiếu bằng tên ở nơi Kustomize không biết (ví dụ HTTPRoute ở namespace khác).</li></ul></div>';
    h += '<div class="panel col"><h4>Các file</h4>' + ["base/kustomization.yaml", "overlays/dev/kustomization.yaml", "overlays/prod/kustomization.yaml", "overlays/prod/deployment-resources.yaml"].map((p, i) => fileBlock(p, i < 2)).join("") + "</div>";
  } else if (bestCur === "helm") {
    h += '<p class="lead" style="color:var(--ink)">Cùng ứng dụng, đóng gói thành chart. Chart này ở <code>examples/web-api/helm/web-api</code>, render ra YAML giống bản Kustomize và cũng đạt Pod Security <code>restricted</code>.</p>';
    h += '<div class="split even"><div class="panel col"><h4>Quy tắc viết chart</h4><ul class="tight">' +
      ["<b>version</b> là phiên bản chart (SemVer, tăng mỗi lần đổi template); <b>appVersion</b> là phiên bản ứng dụng, làm tag image mặc định.",
       "<code>values.yaml</code> chạy được ngay, mỗi khóa có chú thích, tên camelCase, không chứa bí mật.",
       "<code>values.schema.json</code> chặn giá trị sai trước khi render.",
       "Mọi tên và label đi qua <code>_helpers.tpl</code>; <code>selectorLabels</code> không bao giờ đổi giữa các phiên bản.",
       "Mỗi template một loại object; tính năng tùy chọn bật bằng <code>enabled</code> và bọc trong <code>if</code>.",
       "Khối lồng nhau dùng <code>toYaml … | nindent N</code>; chuỗi dùng <code>quote</code>.",
       "Không ghi cứng namespace: dùng <code>.Release.Namespace</code> và <code>helm -n</code>.",
       "Annotation <code>checksum/config</code> để đổi ConfigMap là Pod được rollout lại.",
       "CRD để trong <code>crds/</code>: Helm cài một lần và không nâng cấp; CRD cần nâng cấp thì quản lý riêng.",
       "Có <code>NOTES.txt</code> và <code>templates/tests/</code> cho <code>helm test</code>."].map(x => "<li>" + x + "</li>").join("") +
      '</ul></div><div class="panel col"><h4>Lệnh</h4>' +
      [["helm lint ./web-api", "Kiểm tra cấu trúc và cú pháp"], ["helm template web-api ./web-api -n web-api -f values-prod.yaml", "Render ra YAML, không cài"], ["helm upgrade --install web-api ./web-api -n web-api --create-namespace -f values-prod.yaml --wait", "Cài hoặc nâng cấp, chờ sẵn sàng"], ["helm diff upgrade …", "(plugin helm-diff) xem trước thay đổi"], ["helm test web-api -n web-api", "Chạy Pod kiểm tra trong templates/tests"], ["helm history web-api -n web-api", "Các revision"], ["helm rollback web-api 3 -n web-api", "Quay về revision 3"], ["helm package ./web-api && helm push web-api-0.1.0.tgz oci://ghcr.io/<org>/charts", "Phát hành lên OCI registry"]].map(c => '<div class="cmdrow"><code>' + kEsc(c[0]) + "</code><span>" + kEsc(c[1]) + "</span></div>").join("") + "</div></div>";
    h += '<div class="panel col"><h4>Các file</h4>' + ["helm/web-api/Chart.yaml", "helm/web-api/values.yaml", "helm/web-api/values-prod.yaml", "helm/web-api/templates/_helpers.tpl", "helm/web-api/templates/deployment.yaml", "helm/web-api/templates/hpa.yaml", "helm/web-api/templates/networkpolicy.yaml", "helm/web-api/templates/httproute.yaml", "helm/web-api/templates/NOTES.txt", "helm/web-api/templates/tests/test-connection.yaml", "helm/web-api/values.schema.json"].map((p, i) => fileBlock(p, i < 3)).join("") + "</div>";
  } else if (bestCur === "choose") {
    const rows = [["Cách làm", "Template Go + values", "Patch trên YAML thuần"], ["Đóng gói, phiên bản", "Có: chart .tgz, OCI registry", "Không: chỉ là thư mục"], ["Lịch sử release, rollback", "Có (helm history, rollback)", "Không, nhờ Git hoặc kubectl rollout"], ["Logic (if, range)", "Có", "Không (cố ý)"], ["Đọc hiểu", "Phải render mới thấy kết quả", "Gần như thấy ngay"], ["Phần mềm bên thứ ba", "Hầu hết phát hành bằng chart", "Ít"], ["Có sẵn trong kubectl", "Không", "Có (kubectl -k)"]];
    h += '<div class="panel"><div class="tbl"><table><thead><tr><th></th><th>Helm</th><th>Kustomize</th></tr></thead><tbody>' + rows.map(r => "<tr><th>" + kEsc(r[0]) + "</th><td>" + kEsc(r[1]) + "</td><td>" + kEsc(r[2]) + "</td></tr>").join("") + "</tbody></table></div></div>";
    h += '<div class="split even"><div class="panel"><h4>Chọn Helm khi</h4><ul class="tight"><li>Cài phần mềm bên thứ ba (cert-manager, ingress, Prometheus…).</li><li>Phát hành ứng dụng cho nhiều đội hoặc khách hàng cài.</li><li>Cần nhiều tùy chọn bật tắt và lịch sử release.</li></ul></div><div class="panel"><h4>Chọn Kustomize khi</h4><ul class="tight"><li>Ứng dụng nội bộ, vài môi trường, muốn YAML dễ đọc.</li><li>Cần sửa nhẹ một chart của người khác mà không fork: <code>helm template</code> rồi Kustomize patch, hoặc <code>helmCharts</code> trong kustomization.</li></ul></div></div>';
  } else if (bestCur === "cicd") {
    h += '<div class="panel col"><h4>Pipeline</h4>' + mmd(BEST_CI) + '</div><div class="panel col"><h4>GitOps: Git là nguồn sự thật</h4>' + mmd(BEST_GITOPS) + "</div>";
    h += '<div class="panel"><h4>Công cụ kiểm tra hay dùng</h4><div class="tbl"><table><tbody>' + [["helm lint, helm template", "Cấu trúc chart, render được không"], ["kubectl kustomize", "Overlay render được không"], ["kubeconform", "YAML khớp schema API của đúng phiên bản Kubernetes (kể cả CRD)"], ["kube-linter, Polaris", "Thiếu probe, resources, chạy root…"], ["Kyverno, Gatekeeper", "Chính sách của tổ chức, chạy cả trong CI và trong cluster"], ["kubectl diff, helm diff", "Xem trước thay đổi so với cluster"], ["kubectl apply --dry-run=server", "Để API server và admission kiểm tra mà không tạo gì"]].map(r => "<tr><td><code>" + kEsc(r[0]) + "</code></td><td>" + kEsc(r[1]) + "</td></tr>").join("") + "</tbody></table></div></div>";
  } else {
    const st = store.get("bestChk", {});
    const done = BEST_CHECK.filter((_, i) => st[i]).length;
    h += '<div class="panel col"><h4>Checklist trước khi đưa lên production <span class="small muted" id="bestChkN">' + done + "/" + BEST_CHECK.length + "</span></h4>" +
      BEST_CHECK.map((c, i) => '<label class="check"><input type="checkbox" data-c="' + i + '"' + (st[i] ? " checked" : "") + "> " + kEsc(c) + "</label>").join("") + '<p class="small muted" style="margin-top:8px">Đánh dấu lưu trong trình duyệt này.</p></div>';
  }
  box.innerHTML = h;
  $$("#bestBody input[data-c]").forEach(c => c.onchange = () => { const st = store.get("bestChk", {}); st[c.dataset.c] = c.checked; store.set("bestChk", st); $("#bestChkN").textContent = BEST_CHECK.filter((_, i) => st[i]).length + "/" + BEST_CHECK.length; });
  $$("#bestBody pre.code").forEach(pre => { if (pre.parentElement.querySelector(".copy")) return; const b = document.createElement("button"); b.className = "copy"; b.type = "button"; b.textContent = "Chép"; b.onclick = () => { try { navigator.clipboard.writeText(pre.textContent); b.textContent = "Đã chép"; } catch (e) {} setTimeout(() => b.textContent = "Chép", 1200); }; pre.parentElement.appendChild(b); });
  mmdRender(box);
}
onShow.best = bestInit;
if (current === "best" || (location.hash || "").slice(1) === "best") bestInit();
