/* ---------- lý thuyết CKAD trong trang Lý thuyết ----------
   Dữ liệu: CKAD = { domains, sources, cheat, ex } do build.py nhúng từ src/ckad/*.yaml.
   Module: exam (01), multi (08), jobs (09), chiến lược trong workloads (10), image (12), ckadcur (22).
   Mọi tên toàn cục ở đây có tiền tố lc để không đụng tên của learn.html. */
const LC_D = CKAD.domains, LC_DM = Object.fromEntries(LC_D.map(d => [d.id, d]));
const LC_COL = { build: "var(--accent)", deploy: "var(--node)", obs: "var(--pkt)", env: "var(--data)", net: "var(--bad)" };
/* năng lực CKAD có module riêng trong trang này: "domain:index" → view */
const LC_HOME = { "build:0": "image", "build:1": "kinds", "build:2": "multi", "build:3": "storage", "deploy:0": "workloads", "deploy:1": "workloads", "deploy:2": "best", "deploy:3": "best",
  "obs:0": "image", "obs:1": "probes", "obs:2": "obs", "obs:3": "obs", "obs:4": "trouble", "env:0": "ops", "env:1": "security", "env:2": "scale", "env:3": "perf", "env:4": "config", "env:5": "config",
  "env:6": "security", "env:7": "security", "net:0": "netpol", "net:1": "network", "net:2": "ingress" };
const lcEa = s => esc(s).replace(/"/g, "&quot;");
const lcCode = t => '<div class="codewrap"><pre class="code" data-hl>' + esc(String(t).replace(/\n$/, "")) + "</pre></div>";
const lcTl = items => '<ul class="tldr">' + items.map(x => "<li>" + x + "</li>").join("") + "</ul>";
const lcDet = (t, b, open) => '<details class="bp more"' + (open ? " open" : "") + "><summary>" + t + '</summary><div class="body">' + b + "</div></details>";
const lcModName = id => { const m = MODULES.find(x => x.id === id); return m ? m.n + " " + m.t : id; };
const lcVisible = node => { const v = node.closest(".view"); return node.isConnected && v && !v.hidden; };
function lcEnhance(root) { $$("pre.code[data-hl]", root).forEach(p => { if (p.dataset.done) return; p.dataset.done = 1; hlPre(p); addCopy(p.parentElement, p); }); }
function lcSrcUrl(s) {
  const src = CKAD.sources[s[0]], br = { dgk: "main", bmc: "master", bmg: "master", k8sdocs: "main", helm: "main", curriculum: "main" }[s[0]];
  if (!s[1] || s[0] === "lfdocs") return src.url;
  return src.url + (/\.(md|mdx|pdf)$/.test(s[1]) ? "/blob/" : "/tree/") + br + "/" + s[1];
}
const lcSrcChip = s => '<a class="ck-src" href="' + lcEa(lcSrcUrl(s)) + '" target="_blank" rel="noopener" title="' + lcEa(CKAD.sources[s[0]].name + (s[1] ? " · " + s[1] : "")) + '">' + esc(CKAD.sources[s[0]].name.split("/").pop() + (s[1] ? " · " + s[1].split("/").pop().replace(/\.mdx?$/, "") : "")) + " ↗</a>";
const lcExLinks = (dom, tp) => {
  const xs = CKAD.ex.filter(e => e.d === dom && e.tp === tp);
  return xs.length ? '<div class="ck-links"><span class="small muted">Luyện:</span>' + xs.map(e => '<a class="pill cp" href="ckad.html#ex-' + e.id + '">' + esc(e.title) + " ↗</a>").join("") + "</div>" : "";
};
const lcExById = (...ids) => '<div class="ck-links"><span class="small muted">Bài tập CKAD:</span>' + ids.map(id => { const e = CKAD.ex.find(x => x.id === id); return e ? '<a class="pill cp" href="ckad.html#ex-' + id + '">' + esc(e.title) + " ↗</a>" : ""; }).join("") + "</div>";
/* thẻ năng lực: full = đủ lệnh, mẫu, bẫy; compact = chỉ chỗ học */
function lcCard(dom, i) {
  const t = LC_DM[dom].topics[i];
  return '<article class="ck-topic"><span class="en">CKAD · ' + esc(LC_DM[dom].vi) + " · " + esc(t.t) + '</span><span class="vi">' + esc(t.vi) + "</span>" +
    lcCode(t.cmd) + (t.yaml ? lcDet("Mẫu YAML", lcCode(t.yaml)) : "") + '<div class="trap"><b>Bẫy:</b> ' + esc(t.trap) + "</div>" +
    '<div class="ck-links"><a class="ck-src" href="' + lcEa(t.docs) + '" target="_blank" rel="noopener">' + (t.docs.includes("helm.sh") ? "helm.sh/docs" : "kubernetes.io") + " ↗</a>" + (t.src || []).map(lcSrcChip).join("") + "</div>" +
    lcExLinks(dom, i) + "</article>";
}
function lcPkt(svg, pts, opt = {}) {
  return new Promise(res => {
    if (RM || pts.length < 2 || !svg.isConnected) { res(); return; }
    const segs = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); total += d; }
    const dur = opt.dur || Math.max(500, Math.min(1400, total * 2.2));
    const c = el("circle", { r: opt.r || 7, class: "pkt" + (opt.cls ? " " + opt.cls : ""), cx: pts[0][0], cy: pts[0][1] }, svg);
    const t0 = performance.now();
    const f = t => {
      const p = ease(Math.min(1, (t - t0) / dur)); let d = p * total, i = 0;
      while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
      const k = segs[i] ? d / segs[i] : 1;
      c.setAttribute("cx", pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k); c.setAttribute("cy", pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k);
      if (p < 1 && c.isConnected) requestAnimationFrame(f); else { c.remove(); res(); }
    };
    requestAnimationFrame(f);
  });
}
function lcBox(parent, x, y, w, h, cls, t, sub) {
  const g = el("g", null, parent);
  el("rect", { x, y, width: w, height: h, rx: 8, class: cls }, g);
  if (sub) { txt(g, x + w / 2, y + h / 2 - 3, t, "sv-t", "middle"); txt(g, x + w / 2, y + h / 2 + 14, sub, "sv-s", "middle"); }
  else txt(g, x + w / 2, y + h / 2 + 5, t, "sv-t", "middle");
  return g;
}
const lcOnce = (id, fn) => { const prev = onShow[id]; let done = false; onShow[id] = () => { if (prev) prev(); if (!done) { done = true; fn(); } else if (LC_REPLAY[id]) LC_REPLAY[id](); }; };
const LC_REPLAY = {};

/* ---------- 01 kỳ thi ---------- */
function lcExam() {
  const box = $("#lcExam"), row = (k, a, b) => "<tr><td><b>" + k + "</b></td><td>" + a + "</td><td>" + b + "</td></tr>";
  const bars = (list, go) => '<div class="ck-bars">' + list.map(d => '<button type="button" class="ck-bar" ' + go(d) + '><span class="lab"><b>' + esc(d.vi) + "</b><small>" + esc(d.en) + '</small><span class="track"><i style="background:' + d.col + '" data-w="' + d.w + '"></i></span></span><span class="w">' + d.w + '%</span><span class="m">≈ ' + Math.round(d.w * 1.2) + " phút</span></button>").join("") + "</div>";
  const cka = DOMAINS.map(d => ({ vi: d.name, en: "CKA · " + d.items.length + " năng lực", w: d.w, col: d.color, mod: d.mod }));
  const ckad = LC_D.map(d => ({ vi: d.vi, en: d.t, w: d.w, col: LC_COL[d.id], id: d.id }));
  box.innerHTML = '<div class="panel col">' + lcTl(["Cả hai: <b>2 giờ</b>, đậu từ <b>66%</b>, làm thật bằng <code>kubectl</code> trên cluster Kubernetes <b>v1.37</b>, được mở tài liệu chính thức.", "<b>CKA</b> nặng về vận hành: kubeadm, etcd, node, troubleshooting chiếm 30%.", "<b>CKAD</b> nặng về ứng dụng: Pod, cấu hình, probe, Service; 15–20 task nên cần tốc độ."]) + "</div>" +
    '<div class="panel col"><h4>Thông tin kỳ thi</h4><div class="tbl"><table><thead><tr><th></th><th>CKA</th><th>CKAD</th></tr></thead><tbody>' +
    row("Dành cho", "Người vận hành cluster", "Người viết và chạy ứng dụng") + row("Thời gian", "2 giờ", "2 giờ") + row("Điểm đậu", "66%", "66%") + row("Phiên bản", "Kubernetes v1.37", "Kubernetes v1.37") +
row("Thi lại", "1 lần, miễn phí", "1 lần, miễn phí") + row("Thi thử", "killer.sh × 2", "killer.sh × 2") + row("Hiệu lực", "2 năm", "2 năm") + row("Giá (chỉ thi)", "$445", "$445") +
    row("Tài liệu được mở", "kubernetes.io/docs, kubernetes.io/blog, helm.sh/docs, gateway-api.sigs.k8s.io", "kubernetes.io/docs, kubernetes.io/blog, helm.sh/docs") +
    '</tbody></table></div><p class="small muted" style="margin:0">Theo trang của Linux Foundation, kiểm tra ngày 12/11/2026 (<a href="https://docs.linuxfoundation.org/tc-docs/certification/certification-resources-allowed" target="_blank" rel="noopener">Resources Allowed</a>). Giá và quy định có thể đổi: xem lại trước khi đăng ký.</p></div>' +
    '<div class="lc-two"><div class="panel col"><h4>CKA · 5 domain</h4><p class="hint" style="margin:0">Bấm để tới module lý thuyết chính của domain.</p>' + bars(cka, d => 'data-go="' + d.mod + '"') + "</div>" +
    '<div class="panel col"><h4>CKAD · 5 domain</h4><p class="hint" style="margin:0">Bấm để xem các năng lực của domain trong Curriculum CKAD.</p>' + bars(ckad, d => 'data-lccur="' + d.id + '"') + "</div></div>" +
    '<div class="panel col"><h4>Hai đề chồng lên nhau ở đâu</h4><div class="ck-cmp">' +
    '<div class="a"><b>Chỉ CKAD hỏi sâu</b><ul>' + [["image", "Build, tag, lưu container image"], ["multi", "Init, sidecar, adapter, ambassador"], ["workloads", "Blue/green, canary bằng primitive có sẵn"], ["image", "API bị gỡ và cách sửa manifest"], ["jobs", "Job, CronJob đủ các trường"], ["security", "SecurityContext, capabilities"]].map(x => '<li><a href="#' + x[0] + '" data-go="' + x[0] + '">' + esc(x[1]) + "</a></li>").join("") + "</ul></div>" +
    '<div class="b"><b>Chung</b><ul>' + [["workloads", "Deployment, rolling update"], ["probes", "Probe"], ["network", "Service"], ["ingress", "Ingress"], ["netpol", "NetworkPolicy"], ["security", "RBAC, ServiceAccount"], ["scale", "requests, limits, quota"], ["best", "Helm, Kustomize"], ["trouble", "Đọc log, gỡ lỗi Pod"], ["kinds", "Chọn đúng workload"]].map(x => '<li><a href="#' + x[0] + '" data-go="' + x[0] + '">' + esc(x[1]) + "</a></li>").join("") + "</ul></div>" +
    '<div class="c"><b>Chỉ CKA</b><ul>' + [["ops", "Cài và nâng cấp cluster bằng kubeadm"], ["ops", "Sao lưu, khôi phục etcd"], ["trouble", "Gỡ lỗi node, control plane"], ["linux", "CNI, CSI, CRI"], ["gateway", "Gateway API"]].map(x => '<li><a href="#' + x[0] + '" data-go="' + x[0] + '">' + esc(x[1]) + "</a></li>").join("") + "</ul></div></div></div>" +
    '<div class="panel col"><h4>30 giây đầu giờ</h4>' + lcCode(`# máy thi đã có alias k và tự hoàn thành lệnh
export do="--dry-run=client -o yaml"     # k run web --image=nginx:1.27 $do > web.yaml
export now="--force --grace-period=0"    # k delete pod web $now
echo 'set expandtab tabstop=2 shiftwidth=2' >> ~/.vimrc`) + "</div>" +
    '<div class="panel col"><h4>Tra trường YAML không cần mở web</h4>' + lcCode(`k explain pod.spec.containers.securityContext
k explain deploy.spec.strategy --recursive
k api-resources | grep -i cronjob        # tên ngắn, apiVersion, namespaced?`) + "</div>" +
    '<div class="panel col"><h4>Chia thời gian</h4>' + lcTl(["Mỗi task: đọc ô thông tin, <b>ssh</b> đúng máy, đổi đúng <b>context</b>, làm xong thì <b>exit</b> (không ssh lồng nhau).", "Khoảng 6–8 phút mỗi task. Task dễ, điểm cao làm trước; kẹt quá 10 phút thì đánh dấu và quay lại.", "Pod đang chạy hầu như không sửa được spec: <code>k get pod x -o yaml > x.yaml</code>, sửa, <code>k replace --force -f x.yaml</code>.", "Trước khi sang task: <code>k get</code> lại object, đúng tên, đúng namespace, file lưu đúng chỗ đề hỏi."]) +
    '<p class="small muted" style="margin:0">Lệnh sinh YAML nhanh và mọi lệnh hay dùng: xem <a href="#commands" data-go="commands">25 Lệnh &amp; cheatsheet</a>.</p></div>' +
    '<div class="panel col"><h4>Học ở đây, luyện ở đâu</h4><div class="ck-links"><a class="btn primary" href="index.html#home">Bài tập CKA: 46 lab tự chấm</a><a class="btn" href="index.html#bank">Bài tập CKA theo domain + đề thử</a><a class="btn" href="ckad.html#overview">Bài tập CKAD: ' + CKAD.ex.length + " bài + đề thử</a></div></div>";
  lcEnhance(box); lcBars(box);
  box.addEventListener("click", e => { const b = e.target.closest("[data-lccur]"); if (b) { lcCurDom = b.dataset.lccur; show("ckadcur"); } });
}
function lcBars(root) { $$(".ck-bar i[data-w]", root).forEach(i => { i.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = (+i.dataset.w * 3.3) + "%"; })); }); }
lcOnce("exam", lcExam);
LC_REPLAY.exam = () => lcBars($("#lcExam"));

/* ---------- 08 Pod nhiều container ---------- */
function lcMulti() {
  const box = $("#lcMulti");
  box.innerHTML = '<div class="panel col">' + lcTl(["Các container trong Pod dùng chung <b>IP, cổng localhost</b> và <b>volume</b>; vẫn tách riêng filesystem gốc và giới hạn tài nguyên.", "<b>Init</b> chạy lần lượt trước, phải thoát 0. <b>Sidecar</b> là init container có <code>restartPolicy: Always</code>: khởi động trước app và chạy suốt đời Pod (GA từ v1.33).", "<b>Adapter</b> đổi định dạng đầu ra của app; <b>ambassador</b> làm proxy để app chỉ gọi localhost."]) + "</div>" +
    '<div class="panel col ck-anim" id="lcMultiAnim"></div>' +
    '<div class="panel col"><h4>Bốn mẫu, so nhanh</h4><div class="tbl"><table><thead><tr><th>Mẫu</th><th>Khai báo ở</th><th>Chạy khi nào</th><th>Ví dụ</th></tr></thead><tbody>' + [
      ["Init", "initContainers", "Trước app, lần lượt, thoát 0 mới qua", "Chờ DB, tải cấu hình, chạy migration"],
      ["Sidecar", "initContainers + restartPolicy: Always", "Trước app và suốt đời Pod; dừng sau app", "Đẩy log, proxy mesh, đồng bộ file"],
      ["Adapter", "containers", "Song song với app", "Đổi log hoặc metric sang định dạng chuẩn"],
      ["Ambassador", "containers", "Song song với app", "Proxy tới DB, chia shard, thêm TLS hay retry"]
    ].map(r => "<tr>" + r.map((c, i) => "<td>" + (i === 1 ? "<code>" + esc(c) + "</code>" : i ? esc(c) : "<b>" + esc(c) + "</b>") + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>" +
    '<p class="small muted" style="margin:0">Pod đứng <code>Init:0/1</code> hay <code>Init:CrashLoopBackOff</code>: đọc log của init bằng <code>k logs pod -c &lt;tên-init&gt;</code>.</p></div>' +
    "";
  lcEnhance(box); lcAnimMulti($("#lcMultiAnim"));
}
lcOnce("multi", lcMulti);
LC_REPLAY.multi = () => { const p = $("#lcMultiAnim"); if (p && p.lcReplay) p.lcReplay(); };
function lcAnimMulti(p) {
  const MODES = { init: "Init", sidecar: "Sidecar", adapter: "Adapter", ambassador: "Ambassador" };
  p.innerHTML = "<h4>Mẫu nhiều container trong một Pod</h4>" + '<div class="seg" role="group">' + Object.entries(MODES).map(([k, v], i) => '<button type="button" data-m="' + k + '" aria-pressed="' + !i + '">' + v + "</button>").join("") + '</div><div class="stage sm"><svg viewBox="0 0 760 270"></svg></div><p class="hint cap" aria-live="polite"></p>';
  const svg = $("svg", p), cap = $(".cap", p); let run = 0, mode = "init";
  const go = async m => {
    mode = m;
    const tok = ++run, alive = () => tok === run && lcVisible(svg);
    svg.innerHTML = "";
    el("rect", { x: 20, y: 20, width: 540, height: 230, rx: 14, class: "an-pod" }, svg); txt(svg, 36, 42, "Pod", "sv-lbl");
    lcBox(svg, 220, 190, 130, 44, "an-vol", "emptyDir", "volume chung");
    const C = (x, y, t, sub) => lcBox(svg, x, y, 150, 56, "an-c", t, sub).querySelector("rect");
    const set = (r, c) => r.setAttribute("class", "an-c " + c);
    if (m === "init") {
      const a = C(50, 70, "init: prepare", "chạy trước, thoát 0"), b = C(360, 70, "nginx", "chờ init xong");
      cap.textContent = "Init container chạy lần lượt và phải thoát 0 thì container chính mới khởi động. Lỗi thì Pod đứng Init:CrashLoopBackOff.";
      while (alive()) {
        set(a, "start"); set(b, ""); await sleep(700); set(a, "run");
        await lcPkt(svg, [[125, 126], [125, 212], [220, 212]], { cls: "raw", dur: 800 });
        set(a, "done"); await sleep(400); set(b, "start"); await sleep(500); set(b, "run");
        await lcPkt(svg, [[350, 212], [435, 212], [435, 126]], { cls: "fmt", dur: 800 });
        await sleep(1600);
      }
    } else if (m === "sidecar") {
      const s = C(50, 70, "log-tail (sidecar)", "restartPolicy: Always"), a = C(360, 70, "app", "ghi log");
      lcBox(svg, 590, 90, 150, 56, "an-ext", "Log backend", "ngoài Pod");
      cap.textContent = "Sidecar kiểu mới khởi động trước app và chạy suốt đời Pod; nó đọc file log app ghi vào volume chung rồi gửi đi.";
      set(s, "start"); await sleep(600); set(s, "run"); set(a, "start"); await sleep(500); set(a, "run");
      while (alive()) { await lcPkt(svg, [[435, 126], [435, 212], [350, 212]], { cls: "raw", dur: 650 }); await lcPkt(svg, [[220, 212], [125, 212], [125, 126]], { cls: "raw", dur: 650 }); await lcPkt(svg, [[125, 70], [125, 55], [665, 55], [665, 90]], { cls: "fmt", dur: 900 }); }
    } else if (m === "adapter") {
      const a = C(50, 70, "app", "in cpu=37,mem=512"), ad = C(360, 70, "adapter", "đổi định dạng");
      lcBox(svg, 590, 90, 150, 56, "an-ext", "Monitoring", "CPU 37% MEM 512Mi");
      set(a, "run"); set(ad, "run");
      cap.textContent = "Adapter chuẩn hóa đầu ra của app (log, metric) sang định dạng hệ thống bên ngoài cần, không phải sửa app.";
      while (alive()) { await lcPkt(svg, [[125, 126], [125, 212], [220, 212]], { cls: "raw", dur: 650 }); await lcPkt(svg, [[350, 212], [435, 212], [435, 126]], { cls: "raw", dur: 650 }); await lcPkt(svg, [[510, 98], [590, 118]], { cls: "fmt", dur: 600 }); await sleep(300); }
    } else {
      const a = C(50, 70, "app", "gọi localhost:6379"), am = C(360, 70, "ambassador", "proxy ra ngoài");
      lcBox(svg, 590, 40, 150, 50, "an-ext", "Redis shard 1", ""); lcBox(svg, 590, 150, 150, 50, "an-ext", "Redis shard 2", "");
      set(a, "run"); set(am, "run");
      cap.textContent = "Ambassador nằm cùng Pod, app chỉ gọi localhost; ambassador lo kết nối, chia shard, TLS hay retry ra dịch vụ ngoài.";
      let k = 0;
      while (alive()) { await lcPkt(svg, [[200, 98], [360, 98]], { cls: "raw", dur: 600 }); await lcPkt(svg, [[510, 98], [590, k % 2 ? 175 : 65]], { cls: "fmt", dur: 600 }); k++; await sleep(250); }
    }
  };
  p.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) { $$("[data-m]", p).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); go(b.dataset.m); } });
  p.lcReplay = () => go(mode);
  go("init");
}

/* ---------- 10 chiến lược triển khai (panel trong module workloads) ---------- */
function lcStrategy() {
  const p = $("#lcStrategy");
  const MODES = { rolling: "Rolling update", recreate: "Recreate", bluegreen: "Blue/green", canary: "Canary" };
  p.innerHTML = "<h3>Bốn cách đưa phiên bản mới lên</h3>" + lcTl(["<b>Rolling</b> và <b>Recreate</b> là <code>strategy.type</code> của Deployment.", "<b>Blue/green</b> và <b>canary</b> không có field riêng: ghép từ hai Deployment và một Service bằng label."]) +
    '<div class="seg" role="group">' + Object.entries(MODES).map(([k, v], i) => '<button type="button" data-m="' + k + '" aria-pressed="' + !i + '">' + v + "</button>").join("") + '</div><div class="stage sm"><svg viewBox="0 0 760 260"></svg></div><div class="controls"><button class="btn primary" type="button" data-play>▶ Chạy</button><span class="hint cap" aria-live="polite"></span></div>';
  lcEnhance(p);
  const svg = $("svg", p), cap = $(".cap", p); let mode = "rolling", run = 0, pods = [], sel = "v1", hits = { v1: 0, v2: 0 };
  const SX = 380, slot = i => 20 + i * 90;
  const draw = () => {
    let base = $("g.base", svg); if (!base) { base = el("g", { class: "base" }); svg.insertBefore(base, svg.firstChild); }
    base.innerHTML = "";
    const down = !pods.some(q => q.ready && (sel === "all" || q.v === sel));
    lcBox(base, SX - 90, 20, 180, 56, "an-svc" + (down ? " down" : ""), "Service shop", sel === "all" ? "selector: app=shop" : "selector: version=" + (sel === "v1" ? "blue" : "green"));
    pods.forEach(q => {
      const x = slot(q.slot), on = q.ready && (sel === "all" || q.v === sel);
      el("path", { d: "M" + SX + " 76 V110 H" + (x + 40) + " V160", class: "an-l" + (on ? (q.v === "v1" ? " on" : " g") : "") }, base);
      lcBox(base, x, 160, 80, 56, "an-c " + (q.term ? "term" : q.ready ? q.v : "start"), q.v === "v1" ? "v1" : "v2", q.term ? "đang xóa" : q.ready ? "Ready" : "khởi động");
    });
    txt(base, 20, 248, "Request vào v1: " + hits.v1 + " · v2: " + hits.v2 + (hits.v1 + hits.v2 ? " (" + Math.round(hits.v2 / (hits.v1 + hits.v2) * 100) + "% v2)" : ""), "sv-s");
    if (down) txt(base, SX, 100, "không có endpoint: người dùng gặp lỗi", "sv-s", "middle").setAttribute("fill", "var(--bad)");
  };
  const traffic = async tok => {
    while (tok === run && lcVisible(svg)) {
      const ok = pods.filter(q => q.ready && !q.term && (sel === "all" || q.v === sel));
      if (ok.length) { const q = ok[Math.floor(Math.random() * ok.length)]; hits[q.v]++; const x = slot(q.slot) + 40; lcPkt(svg, [[SX, 76], [SX, 110], [x, 110], [x, 160]], { cls: q.v, dur: 500 }); }
      await sleep(260); if (tok === run) draw();
    }
  };
  const reset = () => { hits = { v1: 0, v2: 0 }; sel = mode === "bluegreen" ? "v1" : "all"; pods = [0, 1, 2, 3].map(i => ({ slot: i, v: "v1", ready: 1 })); draw(); };
  const play = async () => {
    const tok = ++run; reset(); traffic(tok); const alive = () => tok === run && lcVisible(svg); await sleep(1200);
    if (mode === "rolling") {
      cap.textContent = "maxSurge 1, maxUnavailable 0: thêm 1 Pod mới, chờ Ready, rồi mới xóa 1 Pod cũ. Không lúc nào thiếu Pod.";
      for (let i = 0; i < 4 && alive(); i++) { const n = { slot: 4 + i, v: "v2", ready: 0 }; pods.push(n); await sleep(1100); n.ready = 1; await sleep(500); const old = pods.find(q => q.v === "v1" && !q.term); old.term = 1; await sleep(700); pods.splice(pods.indexOf(old), 1); await sleep(300); }
    } else if (mode === "recreate") {
      cap.textContent = "Recreate: xóa hết Pod cũ rồi mới tạo Pod mới. Có khoảng trống không phục vụ: chỉ dùng khi hai bản không được chạy cùng lúc.";
      pods.forEach(q => q.term = 1); await sleep(900); pods = []; await sleep(1500);
      pods = [4, 5, 6, 7].map(i => ({ slot: i, v: "v2", ready: 0 })); await sleep(1300); pods.forEach(q => q.ready = 1);
    } else if (mode === "bluegreen") {
      cap.textContent = "Blue/green: dựng đủ bản green song song (chưa nhận traffic), kiểm tra xong thì đổi selector của Service một lần.";
      for (let i = 0; i < 4; i++) pods.push({ slot: 4 + i, v: "v2", ready: 0 });
      await sleep(1400); pods.filter(q => q.v === "v2").forEach(q => q.ready = 1); await sleep(1600);
      cap.textContent = "k patch svc shop -p '{\"spec\":{\"selector\":{\"version\":\"green\"}}}': toàn bộ traffic chuyển ngay; quay lại cũng chỉ một lệnh.";
      sel = "v2"; await sleep(2200); pods.filter(q => q.v === "v1").forEach(q => q.term = 1); await sleep(900); pods = pods.filter(q => q.v === "v2");
    } else {
      cap.textContent = "Canary: thêm 1 Pod bản mới cạnh 4 Pod bản cũ, Service chọn chung label app=shop nên khoảng 20% request vào bản mới.";
      pods.push({ slot: 4, v: "v2", ready: 0 }); await sleep(1100); pods[4].ready = 1; await sleep(9000);
    }
    if (alive()) { await sleep(2500); run++; draw(); }
  };
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-m]"); if (b) { $$("[data-m]", p).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); mode = b.dataset.m; run++; reset(); cap.textContent = "Bấm Chạy."; }
    if (e.target.closest("[data-play]")) play();
  });
  reset(); cap.textContent = "Bấm Chạy để xem từng Pod được thay.";
}
lcOnce("workloads", lcStrategy);

/* ---------- 12 container image & API ---------- */
function lcImage() {
  const box = $("#lcImage");
  box.innerHTML = '<div class="panel col">' + lcTl(["Mỗi lệnh đổi file trong Dockerfile (<code>COPY</code>, <code>RUN</code>) tạo một <b>layer</b>; <code>USER</code>, <code>ENV</code>, <code>EXPOSE</code> chỉ ghi metadata.", "Đề cho <b>podman</b> hoặc docker: <code>build -t</code>, <code>tag</code>, <code>push</code>, <code>save -o</code> ra file tar.", "API bị gỡ: <code>apply</code> báo <i>no matches for kind</i>. Tra apiVersion mới bằng <code>k api-resources</code>, <code>k explain</code>."]) + "</div>" +
    '<div class="panel col ck-anim" id="lcLayers"></div>' +
    '<div class="panel col"><h4>API hay bị hỏi khi nâng phiên bản</h4><div class="tbl"><table><thead><tr><th>Kind</th><th>apiVersion cũ (đã gỡ)</th><th>Dùng bây giờ</th></tr></thead><tbody>' + [
      ["Deployment, DaemonSet, StatefulSet", "extensions/v1beta1, apps/v1beta1, apps/v1beta2", "apps/v1"], ["Ingress", "extensions/v1beta1, networking.k8s.io/v1beta1", "networking.k8s.io/v1"],
      ["CronJob", "batch/v1beta1", "batch/v1"], ["HorizontalPodAutoscaler", "autoscaling/v2beta1, v2beta2", "autoscaling/v2"], ["PodDisruptionBudget", "policy/v1beta1", "policy/v1"], ["PodSecurityPolicy", "policy/v1beta1", "đã gỡ hẳn: dùng Pod Security Admission"]
    ].map(r => "<tr><td><b>" + esc(r[0]) + "</b></td><td><code>" + esc(r[1]) + "</code></td><td><code>" + esc(r[2]) + "</code></td></tr>").join("") + '</tbody></table></div><p class="small muted" style="margin:0">Theo <a href="https://kubernetes.io/docs/reference/using-api/deprecation-guide/" target="_blank" rel="noopener">Deprecated API Migration Guide</a>. Đổi apiVersion thường kéo theo đổi trường, ví dụ Ingress v1 cần <code>pathType</code> và <code>backend.service.name</code>.</p></div>';
  lcEnhance(box); lcAnimLayers($("#lcLayers"));
}
lcOnce("image", lcImage);
function lcAnimLayers(p) {
  const lines = [["FROM nginx:1.27-alpine", "nhiều layer của image gốc", 8, "var(--muted)"], ["COPY index.html /usr/share/nginx/html/", "+1 layer · vài KB", 1, "var(--accent)"], ["USER 101", "0 B · chỉ đổi metadata", .3, "var(--data)"], ["EXPOSE 8080", "0 B · chỉ đổi metadata", .3, "var(--data)"]];
  p.innerHTML = "<h4>Build image: mỗi dòng Dockerfile là một bước</h4>" + '<div class="stage sm"><svg viewBox="0 0 760 270"></svg></div><div class="controls"><button class="btn primary" type="button">▶ podman build</button><span class="hint cap" aria-live="polite">Lệnh đổi file (COPY, RUN) tạo layer có dữ liệu; USER, EXPOSE, ENV chỉ ghi metadata.</span></div>';
  const svg = $("svg", p), cap = $(".cap", p), btn = $("button", p);
  const draw = () => {
    svg.innerHTML = "";
    txt(svg, 20, 24, "Dockerfile", "sv-tb");
    lines.forEach((l, i) => txt(svg, 20, 56 + i * 30, l[0], "an-dl"));
    el("rect", { x: 400, y: 30, width: 200, height: 200, rx: 10, class: "an-pod" }, svg);
    txt(svg, 500, 252, "image web:1.0", "sv-tb", "middle");
  };
  draw();
  btn.onclick = async () => {
    draw(); btn.disabled = true; let y = 222;
    for (let i = 0; i < lines.length; i++) {
      $$(".an-dl", svg).forEach((t, k) => t.setAttribute("class", "an-dl" + (k === i ? " on" : "")));
      cap.textContent = "Bước " + (i + 1) + ": " + lines[i][0] + " → " + lines[i][1];
      const h = Math.max(6, lines[i][2] * 14);
      await lcPkt(svg, [[300, 52 + i * 30], [500, y - h / 2]], { dur: 700 });
      el("rect", { x: 410, y: y - h, width: 180, height: h, rx: 4, class: "an-layer", fill: lines[i][3] }, svg);
      const lb = ["layer image gốc", "+1 layer", "", "0 B: USER, EXPOSE"][i]; if (lb) txt(svg, 615, i === 3 ? y - h - 6 : y - h / 2 + 4, lb, "sv-s");
      y -= h + 3; await sleep(500);
    }
    cap.textContent = "Xong: podman tag web:1.0 registry.lab:5000/web:1.0 → podman push; hoặc podman save -o web.tar web:1.0.";
    btn.disabled = false;
  };
}

/* ---------- 09 Job & CronJob ---------- */
let lcJMode = "ok", lcJRp = "Never", lcJRun = 0, lcCjEvery = 10, lcCjPol = "Allow", lcCjRun = 0;
function lcJobs() {
  const box = $("#lcJobs"), seg = (id, attr, opts) => '<div class="seg" role="group" id="' + id + '">' + opts.map((o, i) => '<button type="button" ' + attr + '="' + o[0] + '" aria-pressed="' + !i + '">' + o[1] + "</button>").join("") + "</div>";
  const rng = (id, label, min, max, v) => '<label class="f">' + label + ' <b id="' + id + 'V">' + v + '</b><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + v + '"></label>';
  const fields = rows => '<div class="tbl"><table><tbody>' + rows.map(r => "<tr><td><code>" + r[0] + "</code></td><td>" + esc(r[1]) + "</td></tr>").join("") + "</tbody></table></div>";
  box.innerHTML = '<div class="panel col">' + lcTl(["<b>Job</b> cần đủ <code>completions</code> lần thành công, chạy tối đa <code>parallelism</code> Pod cùng lúc, lỗi quá <code>backoffLimit</code> thì Failed.", "<b>CronJob</b> mỗi lần tới giờ tạo một Job; <code>concurrencyPolicy</code> quyết định khi lần trước chưa xong.", "Pod của Job phải có <code>restartPolicy</code> Never hoặc OnFailure, không được Always."]) + "</div>" +
    '<div class="panel col ck-anim" id="lcJobSim"><h4>Mô phỏng Job</h4><div class="formrow">' + rng("lcJc", "completions", 1, 8, 4) + rng("lcJp", "parallelism", 1, 4, 2) + rng("lcJb", "backoffLimit", 0, 4, 2) + "</div>" +
    '<div class="formrow">' + seg("lcJMode", "data-jm", [["ok", "Mọi Pod thành công"], ["one", "Một lần lỗi"], ["all", "Lỗi liên tục"]]) + seg("lcJRp", "data-jr", [["Never", "restartPolicy: Never"], ["OnFailure", "OnFailure"]]) + "</div>" +
    '<div class="stage sm"><svg id="lcJSvg" viewBox="0 0 760 230"></svg></div><div class="controls"><button class="btn primary" type="button" id="lcJPlay">▶ Chạy Job</button><span class="hint cap" id="lcJCap" aria-live="polite"></span></div>' + lcCode(" ") + "</div>" +
    '<div class="panel col ck-anim" id="lcCjSim"><h4>Mô phỏng CronJob trong 60 phút</h4><div class="formrow">' + seg("lcCjSch", "data-cs", [["10", "*/10 * * * *"], ["15", "*/15 * * * *"], ["20", "*/20 * * * *"]]) + rng("lcCd", "Thời gian chạy mỗi Job (phút)", 3, 35, 14) + "</div>" +
    '<div class="formrow">' + seg("lcCjPol", "data-cp", [["Allow", "Allow"], ["Forbid", "Forbid"], ["Replace", "Replace"]]) + '<label class="check"><input type="checkbox" id="lcCjSusp"> suspend từ phút 30</label><span class="small muted">successfulJobsHistoryLimit: 3</span></div>' +
    '<div class="stage sm"><svg id="lcCjSvg" viewBox="0 0 760 260"></svg></div><div class="controls"><button class="btn primary" type="button" id="lcCjPlay">▶ Chạy 60 phút</button><span class="hint cap" id="lcCjCap" aria-live="polite"></span></div></div>' +
    '<div class="panel col"><h4>Đọc lịch cron</h4><p class="hint" style="margin:0">phút · giờ · ngày trong tháng · tháng · thứ (0 hoặc 7 là Chủ nhật). Hỗ trợ <code>*</code> <code>*/n</code> <code>a-b</code> <code>a,b</code> và @hourly, @daily, @weekly, @monthly.</p>' +
    '<div class="formrow"><input type="text" id="lcCronIn" value="0 9 * * 1-5" style="flex:1;min-width:200px;font-family:var(--f-mono)" aria-label="Lịch cron"><div class="chips">' + ["*/5 * * * *", "0 2 * * *", "0 9 * * 1-5", "30 8 1 * *", "0 */6 * * *", "@weekly"].map(x => '<button type="button" data-cron="' + x + '">' + x + "</button>").join("") + '</div></div><div id="lcCronOut"></div>' +
    '<p class="small muted" style="margin:0">CronJob tính giờ theo múi giờ của kube-controller-manager (thường UTC) nếu không đặt <code>spec.timeZone</code>, ví dụ <code>timeZone: Asia/Ho_Chi_Minh</code>. Bảng trên dùng giờ máy bạn.</p></div>' +
    '<div class="ck-topics"><article class="ck-topic"><span class="vi">Trường của Job</span>' + fields([
      ["completions", "số lần thành công cần có (mặc định 1)"], ["parallelism", "số Pod chạy cùng lúc (mặc định 1)"], ["backoffLimit", "số lần lỗi cho phép trước khi Failed (mặc định 6)"], ["activeDeadlineSeconds", "giới hạn thời gian cả Job, quá là Failed: DeadlineExceeded"],
      ["ttlSecondsAfterFinished", "tự xóa Job và Pod sau khi xong"], ["completionMode: Indexed", "mỗi Pod một chỉ số, biến JOB_COMPLETION_INDEX"], ["template.spec.restartPolicy", "Never: lỗi thì tạo Pod mới; OnFailure: restart container tại chỗ"]]) + "</article>" +
    '<article class="ck-topic"><span class="vi">Trường của CronJob</span>' + fields([
      ["schedule", "lịch cron, luôn để trong nháy"], ["timeZone", "múi giờ IANA, ví dụ Asia/Ho_Chi_Minh"], ["concurrencyPolicy", "Allow (mặc định), Forbid, Replace"], ["startingDeadlineSeconds", "lỡ giờ quá số giây này thì bỏ lần đó"],
      ["successfulJobsHistoryLimit", "giữ bao nhiêu Job thành công (mặc định 3)"], ["failedJobsHistoryLimit", "giữ bao nhiêu Job lỗi (mặc định 1)"], ["suspend", "true: ngừng tạo Job mới, Job đang chạy vẫn chạy"], ["jobTemplate", "spec của Job sẽ được tạo"]]) + "</article>" +
    '<article class="ck-topic"><span class="vi">Mẫu đầy đủ</span>' + lcCode(`apiVersion: batch/v1
kind: CronJob
metadata: {name: backup}
spec:
  schedule: "0 2 * * *"
  timeZone: Asia/Ho_Chi_Minh
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 2
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 600
      ttlSecondsAfterFinished: 3600
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: busybox:1.36
              command: ["sh", "-c", "date; echo backup done"]`) + lcCode(`k create job calc --image=busybox:1.36 $do -- sh -c 'echo $((6*7))' > job.yaml
k create cronjob backup --image=busybox:1.36 --schedule='0 2 * * *' $do -- date > cj.yaml
k create job backup-now --from=cronjob/backup     # chạy thử ngay
k get jobs -w ; k logs job/calc`) + "</article>" +
    '<article class="ck-topic"><span class="vi">Bẫy hay gặp</span><ul class="tight"><li>Không có cờ cho completions, parallelism, concurrencyPolicy: sinh YAML rồi sửa, hoặc <code>k patch</code>.</li><li>Template của Job bất biến: muốn chạy lại thì xóa Job và tạo lại.</li><li>Tạo CronJob xong không chạy ngay: thử bằng <code>k create job x --from=cronjob/…</code>.</li><li>OnFailure: restart tại chỗ vẫn tính vào backoffLimit; Pod lỗi không còn để đọc log như Never.</li><li>Schedule không để trong nháy thì shell bung dấu <code>*</code> thành tên file.</li></ul>' +
    '<div class="ck-links"><a class="ck-src" href="#kinds" data-go="kinds">Học sâu: ' + esc(lcModName("kinds")) + '</a><a class="ck-src" href="https://kubernetes.io/docs/concepts/workloads/controllers/job/" target="_blank" rel="noopener">Job ↗</a><a class="ck-src" href="https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/" target="_blank" rel="noopener">CronJob ↗</a></div>' + lcExById("b-job", "b-cron") +
    '<div class="ck-links"><span class="small muted">Bài tập CKA:</span><a class="pill cp" href="index.html#bank-work-3">Workloads: tự phục hồi, Job ↗</a></div></article></div>';
  lcEnhance(box);
  const upd = () => { ["lcJc", "lcJp", "lcJb", "lcCd"].forEach(id => $("#" + id + "V").textContent = $("#" + id).value); lcJYaml(); };
  box.addEventListener("input", e => { if (e.target.id === "lcCronIn") lcCronShow(); else upd(); });
  box.addEventListener("click", e => {
    const sg = (sel, attr, set) => { const b = e.target.closest(sel + " [" + attr + "]"); if (!b) return false; $$(sel + " button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); set(b.getAttribute(attr)); return true; };
    if (sg("#lcJMode", "data-jm", v => lcJMode = v) || sg("#lcJRp", "data-jr", v => { lcJRp = v; lcJYaml(); })) return;
    if (sg("#lcCjSch", "data-cs", v => lcCjEvery = +v) || sg("#lcCjPol", "data-cp", v => lcCjPol = v)) return;
    const c = e.target.closest("[data-cron]"); if (c) { $("#lcCronIn").value = c.dataset.cron; lcCronShow(); return; }
    if (e.target.closest("#lcJPlay")) lcJPlay();
    if (e.target.closest("#lcCjPlay")) lcCjPlay();
  });
  upd(); lcCronShow(); lcJPlay(); lcCjPlay();
}
lcOnce("jobs", lcJobs);
function lcJYaml() {
  const pre = $("#lcJobSim pre.code"); if (!pre) return;
  pre.textContent = `apiVersion: batch/v1
kind: Job
metadata: {name: calc}
spec:
  completions: ${$("#lcJc").value}
  parallelism: ${$("#lcJp").value}
  backoffLimit: ${$("#lcJb").value}
  template:
    spec:
      restartPolicy: ${lcJRp}
      containers:
        - {name: calc, image: busybox:1.36, command: ["sh", "-c", "echo $((6*7))"]}`;
  hlPre(pre);
}
function lcJPlan(C, P, B) {
  /* mỗi lần chạy: lane, start, end, ok, pod, restart; thời gian là giây giả lập */
  const runs = [], lanes = Array(P).fill(0), pending = [];
  let succ = 0, fail = 0, attempt = 0, started = 0, nextAllowed = 0, t = 0, status = "", pods = 0;
  while (succ < C && t < 400) {
    for (let l = 0; l < P; l++) {
      if (lanes[l] <= t && started < C + fail && t >= nextAllowed && succ + runs.filter(r => r.end > t).length < C) {
        attempt++;
        const willFail = lcJMode === "all" || (lcJMode === "one" && attempt === 2);
        const reuse = lcJRp === "OnFailure" && pending.length;
        const pod = reuse ? pending.shift() : ++pods, d = willFail ? 5 : 8;
        runs.push({ lane: l, start: t, end: t + d, ok: !willFail, pod, restart: reuse });
        lanes[l] = t + d; started++;
      }
    }
    t++;
    runs.filter(r => r.end === t).forEach(r => { if (r.ok) succ++; else { fail++; nextAllowed = t + Math.min(10 * Math.pow(2, fail - 1), 60); if (lcJRp === "OnFailure") pending.push(r.pod); } });
    if (fail > B) { status = "Failed"; runs.filter(r => r.end > t).forEach(r => { r.end = t; r.killed = 1; }); break; }
  }
  return { runs, succ, fail, status: status || (succ >= C ? "Complete" : "Running"), T: Math.max(t, 20) };
}
async function lcJPlay() {
  const tok = ++lcJRun, svg = $("#lcJSvg"), cap = $("#lcJCap");
  const C = +$("#lcJc").value, P = +$("#lcJp").value, B = +$("#lcJb").value, plan = lcJPlan(C, P, B);
  const X = s => 90 + s / plan.T * 640, LH = Math.min(40, 150 / P);
  svg.innerHTML = "";
  for (let l = 0; l < P; l++) txt(svg, 10, 40 + l * (LH + 8) + LH / 2 + 4, "luồng " + (l + 1), "sv-s");
  const axisY = 40 + P * (LH + 8) + 6;
  el("line", { x1: 90, x2: 730, y1: axisY, y2: axisY, class: "an-l" }, svg);
  const stp = plan.T > 80 ? 20 : 10;
  for (let s = 0; s <= plan.T; s += stp) txt(svg, X(s), axisY + 16, s + "s", "sv-s", "middle");
  const head = el("line", { x1: 90, x2: 90, y1: 30, y2: axisY, stroke: "var(--ink)", "stroke-width": 1, opacity: .4 }, svg);
  const stat = txt(svg, 90, 22, "", "sv-tb");
  const t0 = performance.now(), dur = RM ? 50 : Math.min(9000, plan.T * 110), drawn = new Set();
  await new Promise(res => {
    const f = now => {
      if (tok !== lcJRun || !svg.isConnected) return res();
      const p = Math.min(1, (now - t0) / dur), t = p * plan.T;
      head.setAttribute("x1", X(t)); head.setAttribute("x2", X(t));
      plan.runs.forEach((r, i) => {
        if (t < r.start) return;
        let g = svg.querySelector("#lcjr" + i);
        if (!g) { g = el("g", { id: "lcjr" + i }, svg); el("rect", { x: X(r.start), y: 40 + r.lane * (LH + 8), height: LH, width: 1, rx: 4, class: "an-c start" }, g); txt(g, X(r.start) + 6, 40 + r.lane * (LH + 8) + LH / 2 + 4, (r.restart ? "↻ " : "") + "Pod " + r.pod, "sv-s"); }
        const rect = g.querySelector("rect");
        rect.setAttribute("width", Math.max(1, X(Math.min(t, r.end)) - X(r.start)));
        if (t >= r.end && !drawn.has(i)) { drawn.add(i); rect.setAttribute("class", "an-c " + (r.ok ? "run" : "term")); }
      });
      stat.textContent = "Succeeded " + plan.runs.filter(r => r.end <= t && r.ok).length + "/" + C + " · Failed " + plan.runs.filter(r => r.end <= t && !r.ok && !r.killed).length + " (backoffLimit " + B + ")";
      if (p < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  if (tok !== lcJRun) return;
  stat.textContent = (plan.status === "Complete" ? "Complete ✓ " : "Failed ✕ ") + "· Succeeded " + plan.succ + "/" + C + " · Failed " + plan.fail;
  stat.setAttribute("fill", plan.status === "Complete" ? "var(--node)" : "var(--bad)");
  cap.innerHTML = plan.status === "Complete"
    ? "Đủ " + C + " lần thành công nên Job <b>Complete</b>. " + (plan.fail ? "Lần lỗi được thử lại sau thời gian chờ (10s, 20s, 40s…). " : "") + (lcJRp === "OnFailure" && plan.fail ? "OnFailure: container restart trong cùng Pod (↻)." : lcJRp === "Never" && plan.fail ? "Never: lỗi thì tạo Pod mới, Pod lỗi còn lại để đọc log." : "")
    : "Lỗi " + plan.fail + " lần, vượt backoffLimit " + B + ": Job <b>Failed</b> với lý do <code>BackoffLimitExceeded</code>, Pod đang chạy bị dừng.";
}
async function lcCjPlay() {
  const tok = ++lcCjRun, svg = $("#lcCjSvg"), cap = $("#lcCjCap"), D = +$("#lcCd").value, susp = $("#lcCjSusp").checked;
  const X = m => 70 + m / 60 * 660, jobs = []; let row = 0;
  svg.innerHTML = "";
  for (let m = 0; m <= 60; m += 10) { el("line", { x1: X(m), x2: X(m), y1: 20, y2: 225, class: "an-l" }, svg); txt(svg, X(m), 245, m + "′", "sv-s", "middle"); }
  const head = el("line", { x1: X(0), x2: X(0), y1: 20, y2: 228, stroke: "var(--ink)", "stroke-width": 1.4 }, svg), notes = el("g", null, svg);
  const t0 = performance.now(), dur = RM ? 50 : 12000; let lastTick = -1;
  await new Promise(res => {
    const f = now => {
      if (tok !== lcCjRun || !svg.isConnected) return res();
      const p = Math.min(1, (now - t0) / dur), m = p * 60;
      head.setAttribute("x1", X(m)); head.setAttribute("x2", X(m));
      const tick = Math.floor(m / lcCjEvery) * lcCjEvery;
      if (tick !== lastTick && tick < 60) {
        lastTick = tick;
        const active = jobs.filter(j => j.start + D > tick && j.killed === undefined);
        if (susp && tick >= 30) txt(notes, X(tick) + 3, 34, "suspend", "sv-s");
        else if (active.length && lcCjPol === "Forbid") txt(notes, X(tick) + 3, 34, "✕ bỏ qua", "sv-s").setAttribute("fill", "var(--bad)");
        else { if (active.length && lcCjPol === "Replace") active.forEach(j => { j.killed = tick; }); jobs.push({ start: tick, row: row++ % 5 }); }
      }
      jobs.forEach((j, i) => {
        const endM = j.killed !== undefined ? j.killed : j.start + D;
        let g = svg.querySelector("#lccj" + i);
        if (!g) { g = el("g", { id: "lccj" + i }, svg); el("rect", { x: X(j.start), y: 46 + j.row * 34, height: 26, width: 1, rx: 4, class: "an-c start" }, g); txt(g, X(j.start) + 6, 46 + j.row * 34 + 17, "Job " + (i + 1), "sv-s"); }
        const r = g.querySelector("rect"); r.setAttribute("width", Math.max(1, X(Math.min(m, endM)) - X(j.start)));
        if (m >= endM) r.setAttribute("class", "an-c " + (j.killed !== undefined ? "term" : "run"));
        const doneOk = jobs.filter(x => x.killed === undefined && x.start + D <= m), k = doneOk.indexOf(j);
        if (doneOk.length > 3 && k > -1 && k < doneOk.length - 3) g.setAttribute("opacity", .25);
      });
      if (p < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  if (tok !== lcCjRun) return;
  cap.innerHTML = (D <= lcCjEvery ? "Job xong trước lần chạy sau nên ba chính sách giống nhau. Kéo thời gian chạy dài hơn " + lcCjEvery + " phút để thấy khác biệt. "
    : lcCjPol === "Allow" ? "<b>Allow</b>: Job mới chạy chồng lên Job cũ: tốn tài nguyên gấp đôi, dữ liệu có thể bị ghi đè. "
    : lcCjPol === "Forbid" ? "<b>Forbid</b>: tới giờ mà Job trước chưa xong thì bỏ qua lần đó (✕). "
    : "<b>Replace</b>: Job cũ bị dừng (đỏ) để chạy Job mới. ") + "Job mờ là Job thành công cũ bị xóa vì vượt successfulJobsHistoryLimit 3." + (susp ? " Từ phút 30 suspend: không tạo Job mới." : "");
}
function lcCronNext(expr, n) {
  const mac = { "@hourly": "0 * * * *", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@weekly": "0 0 * * 0", "@monthly": "0 0 1 * *", "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *" };
  const f = (mac[expr.trim()] || expr).trim().split(/\s+/);
  if (f.length !== 5) throw new Error("Cần đúng 5 trường");
  const R = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
  const parse = (s, [lo, hi]) => {
    const set = new Set();
    s.split(",").forEach(part => {
      let [rng, step] = part.split("/"); step = step ? +step : 1;
      if (!(step > 0)) throw new Error("Bước sai: " + part);
      let a = lo, b = hi;
      if (rng !== "*") [a, b] = rng.includes("-") ? rng.split("-").map(Number) : [+rng, step > 1 ? hi : +rng];
      if ([a, b].some(v => isNaN(v) || v < lo || v > hi) || a > b) throw new Error("Giá trị ngoài khoảng: " + part);
      for (let v = a; v <= b; v += step) set.add(v);
    });
    return set;
  };
  const [mi, ho, dm, mo, dw] = f.map((s, i) => parse(s, R[i]));
  if (dw.has(7)) dw.add(0);
  const domStar = f[2] === "*", dowStar = f[4] === "*", out = [], d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  for (let i = 0; i < 600000 && out.length < n; i++) {
    const dayOk = domStar && dowStar ? true : domStar ? dw.has(d.getDay()) : dowStar ? dm.has(d.getDate()) : dm.has(d.getDate()) || dw.has(d.getDay());
    if (mo.has(d.getMonth() + 1) && dayOk && ho.has(d.getHours()) && mi.has(d.getMinutes())) out.push(new Date(d));
    d.setMinutes(d.getMinutes() + 1);
  }
  return out;
}
function lcCronShow() {
  const box = $("#lcCronOut");
  try {
    const fmt = new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    box.innerHTML = '<div class="facts4">' + lcCronNext($("#lcCronIn").value, 5).map((t, i) => '<div class="ft' + (i ? "" : " ok") + '"><span>lần ' + (i + 1) + "</span><b>" + esc(fmt.format(t)) + "</b></div>").join("") + "</div>";
  } catch (e) { box.innerHTML = '<p class="small" style="color:var(--bad);margin:0">' + esc(e.message) + "</p>"; }
}

/* ---------- 0.3 đề cương: mỗi năng lực CKAD → bài dạy nó + số bài tập ---------- */
let lcCurDom = "all";
function lcCurRender() {
  const box = $("#lcCur"), name = id => { const m = MODULES.find(x => x.id === id); return m ? m.n + " " + m.t : id; };
  box.innerHTML = '<div class="panel col"><h3 style="margin:0">CKAD: 5 domain, 24 năng lực</h3><p class="muted small" style="margin:0">Năng lực lấy nguyên văn từ <a href="https://github.com/cncf/curriculum" target="_blank" rel="noopener">cncf/curriculum</a> (CKAD v1.37). Mỗi năng lực được dạy ở đúng một bài; thẻ ôn thi nằm cuối bài đó.</p>' +
    '<div class="chips" id="lcCurDoms"><button type="button" data-cd="all" aria-pressed="' + (lcCurDom === "all") + '">Tất cả</button>' + LC_D.map(d => '<button type="button" data-cd="' + d.id + '" aria-pressed="' + (lcCurDom === d.id) + '">' + esc(d.vi) + " · " + d.w + "%</button>").join("") + "</div>" +
    '<div class="tbl"><table><thead><tr><th>Năng lực</th><th>Học ở bài</th><th>Bài tập</th></tr></thead><tbody>' +
    LC_D.filter(d => lcCurDom === "all" || d.id === lcCurDom).map(d => '<tr><td colspan="3"><span class="ck-dom dom-' + d.id + '">' + d.w + "%</span> <b>" + esc(d.vi) + "</b></td></tr>" + d.topics.map((t, i) => {
      const home = LC_HOME[d.id + ":" + i], n = CKAD.ex.filter(e => e.d === d.id && e.tp === i).length;
      return "<tr><td>" + esc(t.t) + '<br><span class="small muted">' + esc(t.vi) + '</span></td><td><a href="#' + home + '" data-go="' + home + '">' + esc(name(home)) + "</a></td><td>" + (n ? '<a href="ckad.html#' + d.id + '">' + n + " bài ↗</a>" : '<span class="muted">—</span>') + "</td></tr>";
    }).join("")).join("") + "</tbody></table></div></div>";
}
lcOnce("ckadcur", () => {
  $("#lcCur").addEventListener("click", e => { const b = e.target.closest("[data-cd]"); if (b) { lcCurDom = b.dataset.cd; lcCurRender(); } });
  lcCurRender();
});
LC_REPLAY.ckadcur = lcCurRender;
