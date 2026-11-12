"use strict";
/* ---------- trang CKAD: dữ liệu từ src/ckad/*.yaml (build.py nhúng vào biến CKAD) ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const SVGNS = "http://www.w3.org/2000/svg";
const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sleep = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 60) : ms));
const ease = p => (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
function el(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function txt(parent, x, y, s, cls, anchor) { const t = el("text", { x, y, class: cls || "sv-t" }, parent); if (anchor) t.setAttribute("text-anchor", anchor); t.textContent = s; return t; }
function rbox(parent, x, y, w, h, cls, t, sub) {
  const g = el("g", null, parent);
  el("rect", { x, y, width: w, height: h, rx: 8, class: cls }, g);
  if (sub) { txt(g, x + w / 2, y + h / 2 - 3, t, "sv-t", "middle"); txt(g, x + w / 2, y + h / 2 + 14, sub, "sv-s", "middle"); }
  else txt(g, x + w / 2, y + h / 2 + 5, t, "sv-t", "middle");
  return g;
}
function packetAlong(svg, pts, opt = {}) {
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
const store = {
  get(k, d) { try { const v = localStorage.getItem("ckad:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ckad:" + k, JSON.stringify(v)); } catch (e) {} }
};
function hl(text) {
  return text.split("\n").map(line => {
    let m = line.match(/^(\s*)(#.*)$/);
    if (m) return esc(m[1]) + '<span class="c">' + esc(m[2]) + "</span>";
    let comment = "";
    const ci = line.search(/\s#\s/);
    if (ci > 0 && !/['"][^'"]*\s#\s/.test(line.slice(0, ci + 3))) { comment = line.slice(ci); line = line.slice(0, ci); }
    m = line.match(/^(\s*(?:- )?)([A-Za-z_][\w.\/-]*)(:)(\s.*|)$/);
    const out = m && !/^\s*(https?)$/.test(m[2]) ? esc(m[1]) + '<span class="k">' + esc(m[2]) + "</span>" + esc(m[3] + m[4]) : esc(line);
    return out + (comment ? '<span class="c">' + esc(comment) + "</span>" : "");
  }).join("\n");
}
const code = t => '<div class="codewrap"><pre class="code">' + hl(t.replace(/\n$/, "")) + "</pre></div>";
function addCopies(root) {
  $$("pre.code", root).forEach(pre => {
    if (pre.parentElement.querySelector(".copy")) return;
    const b = document.createElement("button"); b.className = "copy"; b.type = "button"; b.textContent = "Chép";
    b.onclick = async () => { try { await navigator.clipboard.writeText(pre.textContent); b.textContent = "Đã chép"; } catch (e) { b.textContent = "Chọn tay"; } setTimeout(() => b.textContent = "Chép", 1200); };
    pre.parentElement.appendChild(b);
  });
}
const tl = items => '<ul class="tldr">' + items.map(x => "<li>" + x + "</li>").join("") + "</ul>";
const det = (t, b, open) => '<details class="bp more"' + (open ? " open" : "") + "><summary>" + t + '</summary><div class="body">' + b + "</div></details>";

const D = CKAD.domains, SRC = CKAD.sources, EX = CKAD.exercises, DM = Object.fromEntries(D.map(d => [d.id, d]));
const DCOL = { build: "var(--accent)", deploy: "var(--node)", obs: "var(--pkt)", env: "var(--data)", net: "var(--bad)" };
const LEARN = { kinds: "Workload resources", storage: "Storage", workloads: "Rolling update", best: "Helm & Kustomize", probes: "Probes", scale: "Scaling & quota", trouble: "Troubleshooting", security: "RBAC & bảo mật", perf: "Hiệu năng & QoS", wire: "Giao tiếp & mã hóa", network: "Mạng & Service" };
function srcUrl(s) {
  const base = SRC[s[0]].url, br = { dgk: "main", bmc: "master", bmg: "master", k8sdocs: "main", helm: "main", curriculum: "main" }[s[0]];
  if (!s[1]) return base;
  if (s[0] === "lfdocs") return base;
  return base + (/\.(md|mdx|pdf)$/.test(s[1]) ? "/blob/" : "/tree/") + br + "/" + s[1];
}
const srcChip = s => '<a class="ck-src" href="' + esc(srcUrl(s)) + '" target="_blank" rel="noopener" title="' + esc(SRC[s[0]].name + (s[1] ? " · " + s[1] : "")) + '">' + esc(SRC[s[0]].name.split("/").pop() + (s[1] ? " · " + s[1].split("/").pop().replace(/\.md$/, "") : "")) + " ↗</a>";
const domPill = id => '<span class="ck-dom dom-' + id + '">' + esc(DM[id].vi) + "</span>";

/* ---------- điều hướng ---------- */
const MODS = [{ g: "CKAD" }, { id: "overview", n: "00", t: "Tổng quan" }];
D.forEach((d, i) => MODS.push({ id: d.id, n: "0" + (i + 1), t: d.vi + " · " + d.w + "%" }));
MODS.push({ g: "Khái niệm" }, { id: "jobs", n: "06", t: "Job & CronJob" }, { g: "Luyện" }, { id: "ex", n: "07", t: "Bài tập (" + EX.length + ")" }, { id: "mock", n: "08", t: "Thi thử 2 giờ" }, { g: "Tra cứu" }, { id: "cheat", n: "09", t: "Cheatsheet lệnh" }, { id: "tips", n: "10", t: "Mẹo làm bài" }, { id: "src", n: "11", t: "Nguồn tham khảo" });
let current = "overview";
const built = {};
function buildRail() {
  $("#rail").innerHTML = MODS.map(m => m.g ? '<li class="grp">' + esc(m.g) + "</li>" : '<li><a href="#' + m.id + '" data-go="' + m.id + '"><span class="n">' + m.n + "</span><span>" + esc(m.t) + "</span></a></li>").join("");
  $("#main").innerHTML = MODS.filter(m => m.id).map(m => '<section class="view" data-view="' + m.id + '" hidden></section>').join("");
}
function show(name) {
  if (!MODS.some(m => m.id === name)) name = "overview";
  current = name;
  $$(".view").forEach(v => v.hidden = v.dataset.view !== name);
  $$(".rail a").forEach(a => a.setAttribute("aria-current", a.dataset.go === name ? "page" : "false"));
  const sec = $('.view[data-view="' + name + '"]');
  if (!built[name]) { built[name] = 1; sec.innerHTML = RENDER[name] ? RENDER[name]() : domainHTML(name); addCopies(sec); if (AFTER[name]) AFTER[name](sec); else if (DM[name]) domainAfter(sec, name); }
  else if (ON[name]) ON[name](sec);
  try { history.replaceState(null, "", "#" + name); } catch (e) {}
  window.scrollTo(0, 0);
  const act = $('.rail a[data-go="' + name + '"]'); if (act && innerWidth < 1024) act.scrollIntoView({ block: "nearest", inline: "center" });
  store.set("view", name);
}
document.addEventListener("click", e => { const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); show(a.dataset.go); } });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h && h !== current) show(h); });
const RENDER = {}, AFTER = {}, ON = {};

/* ---------- 00 tổng quan ---------- */
RENDER.overview = () => {
  const tile = (k, v) => '<div class="ft"><span>' + k + "</span><b>" + v + "</b></div>";
  return '<header class="vh"><p class="eyebrow">CKAD · Kubernetes v1.37 · curriculum CNCF</p><h2>Certified Kubernetes Application Developer</h2><p class="lead">Chứng chỉ cho người viết, đóng gói và chạy ứng dụng trên Kubernetes. Thi bằng tay trên cluster thật.</p></header>' +
    '<div class="panel col">' + tl(["<b>15–20 task</b> trong <b>2 giờ</b>, đậu từ <b>66%</b>, làm trực tiếp bằng kubectl.", "Thiên về <b>ứng dụng</b>: Pod, Deployment, cấu hình, probe, Service. Không cài hay sửa cluster.", "Thắng nhờ <b>tốc độ</b>: sinh YAML bằng <code>--dry-run=client -o yaml</code>, tra kubernetes.io và helm.sh ngay trong lúc thi."]) + "</div>" +
    '<div class="panel col"><h4>Thông tin kỳ thi</h4><div class="facts4">' + tile("Thời gian", "2 giờ") + tile("Số task", "15–20") + tile("Điểm đậu", "66%") + tile("Phiên bản", "Kubernetes v1.37") + tile("Thi lại", "1 lần, miễn phí") + tile("Thi thử", "killer.sh × 2") + tile("Hiệu lực", "2 năm") + tile("Giá (chỉ thi)", "$445") + '</div><p class="small muted" style="margin:0">Theo trang của Linux Foundation, kiểm tra ngày 12/11/2026. Giá và quy định có thể đổi: xem lại trước khi đăng ký.</p></div>' +
    '<div class="panel col"><h4>5 domain và tỉ trọng điểm</h4><p class="hint" style="margin:0">Phút gợi ý = tỉ trọng × 120 phút. Bấm một domain để học.</p><div class="ck-bars" id="ckBars">' +
    D.map(d => '<button type="button" class="ck-bar" data-go="' + d.id + '"><span class="lab"><b>' + esc(d.vi) + "</b><small>" + esc(d.t) + '</small><span class="track"><i style="background:' + DCOL[d.id] + '" data-w="' + d.w + '"></i></span></span><span class="w">' + d.w + '%</span><span class="m">≈ ' + Math.round(d.w * 1.2) + " phút</span></button>").join("") + "</div></div>" +
    '<div class="panel col"><h4>CKAD khác CKA ở đâu</h4><div class="ck-cmp">' +
    '<div class="a"><b>Trọng tâm CKAD</b><ul><li>Build và lưu container image</li><li>Mẫu nhiều container: init, sidecar, adapter, ambassador</li><li>Blue/green, canary bằng primitive có sẵn</li><li>API bị gỡ và cách sửa manifest</li><li>SecurityContext, capabilities</li><li>Job, CronJob chi tiết</li></ul></div>' +
    '<div class="b"><b>Chung với CKA</b> <span class="small muted">(đã có lý thuyết bên CKA)</span><ul>' + [["workloads", "Deployment, rolling update"], ["probes", "Probe"], ["network", "Service, Ingress, NetworkPolicy"], ["security", "RBAC, ServiceAccount"], ["scale", "requests, limits, quota"], ["best", "Helm, Kustomize"], ["trouble", "Đọc log, gỡ lỗi Pod"], ["kinds", "Chọn đúng workload"]].map(x => '<li><a href="learn.html#' + x[0] + '">' + esc(x[1]) + "</a></li>").join("") + "</ul></div>" +
    '<div class="c"><b>Chỉ có ở CKA</b><ul><li>Cài và nâng cấp cluster bằng kubeadm</li><li>Sao lưu, khôi phục etcd</li><li>Gỡ lỗi node, control plane</li><li>CNI, CSI, CRI</li><li>Gateway API</li></ul></div></div></div>' +
    '<div class="panel col"><h4>Học theo thứ tự</h4><ol class="tight"><li>Đọc từng domain: mỗi mục một câu, một lệnh, một bẫy.</li><li>Làm <a href="#ex" data-go="ex">' + EX.length + " bài tập</a>, mỗi bài có lời giải và lệnh tự kiểm tra.</li><li>Làm <a href=\"#mock\" data-go=\"mock\">đề thi thử 2 giờ</a> chọn ngẫu nhiên theo tỉ trọng.</li><li>Xem lại <a href=\"#cheat\" data-go=\"cheat\">cheatsheet lệnh</a> và <a href=\"#tips\" data-go=\"tips\">mẹo làm bài</a> trước ngày thi.</li></ol></div>";
};
AFTER.overview = ON.overview = sec => { $$("#ckBars i", sec).forEach(i => { i.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = (+i.dataset.w * 4) + "%"; })); }); };

/* ---------- domain ---------- */
function domainHTML(id) {
  const d = DM[id], exs = EX.filter(e => e.d === id);
  const anims = d.topics.map(t => t.anim).filter(Boolean);
  return '<header class="vh"><p class="eyebrow">Domain · ' + d.w + "% điểm · ≈ " + Math.round(d.w * 1.2) + " phút</p><h2>" + esc(d.vi) + '</h2><p class="lead">' + esc(d.t) + "</p></header>" +
    anims.map(a => '<div class="panel col ck-anim" data-anim="' + a + '"></div>').join("") +
    '<div class="ck-topics">' + d.topics.map((t, i) => {
      const tex = exs.filter(e => e.tp === i);
      return '<article class="ck-topic"><span class="en">' + esc(t.t) + '</span><span class="vi">' + esc(t.vi) + "</span>" + code(t.cmd) +
        (t.yaml ? det("Mẫu", code(t.yaml)) : "") + '<div class="trap"><b>Bẫy:</b> ' + esc(t.trap) + "</div>" +
        '<div class="ck-links"><a class="ck-src" href="' + esc(t.docs) + '" target="_blank" rel="noopener">' + (t.docs.includes("helm.sh") ? "helm.sh/docs" : "kubernetes.io") + " ↗</a>" +
        (t.learn ? '<a class="ck-src" href="learn.html#' + t.learn + '">Lý thuyết: ' + esc(LEARN[t.learn] || t.learn) + "</a>" : "") + (/CronJob/.test(t.t) ? '<a class="ck-src" href="#jobs" data-go="jobs">Khái niệm: Job &amp; CronJob</a>' : "") + (t.src || []).map(srcChip).join("") + "</div>" +
        (tex.length ? '<div class="ck-links">' + tex.map(e => '<button type="button" class="pill cp" data-exgo="' + e.id + '">Bài: ' + esc(e.title) + "</button>").join("") + "</div>" : "") + "</article>";
    }).join("") + "</div>";
}
function domainAfter(sec, id) {
  $$("[data-anim]", sec).forEach(p => ANIM[p.dataset.anim] && ANIM[p.dataset.anim](p));
  sec.addEventListener("click", e => { const b = e.target.closest("[data-exgo]"); if (b) { exOpen = b.dataset.exgo; exDom = "all"; exQ = ""; show("ex"); } });
}

/* ---------- animation ---------- */
const ANIM = {};
ANIM.layers = p => {
  const lines = [["FROM nginx:1.27-alpine", "nhiều layer của image gốc", 8, "var(--muted)"], ["COPY index.html /usr/share/nginx/html/", "+1 layer · vài KB", 1, "var(--accent)"], ["USER 101", "0 B · chỉ đổi metadata", .3, "var(--data)"], ["EXPOSE 8080", "0 B · chỉ đổi metadata", .3, "var(--data)"]];
  p.innerHTML = "<h4>Build image: mỗi dòng Dockerfile là một bước</h4>" + '<div class="stage sm"><svg viewBox="0 0 760 270"></svg></div><div class="controls"><button class="btn primary" type="button">▶ podman build</button><span class="hint cap" aria-live="polite">Lệnh đổi file (COPY, RUN) tạo layer có dữ liệu; USER, EXPOSE, ENV chỉ ghi metadata.</span></div>';
  const svg = $("svg", p), cap = $(".cap", p), btn = $("button", p);
  const draw = () => {
    svg.innerHTML = "";
    txt(svg, 20, 24, "Dockerfile", "sv-tb");
    lines.forEach((l, i) => txt(svg, 20, 56 + i * 30, l[0], "an-dl").id = "dl" + i);
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
      await packetAlong(svg, [[300, 52 + i * 30], [500, y - h / 2]], { dur: 700 });
      el("rect", { x: 410, y: y - h, width: 180, height: h, rx: 4, class: "an-layer", fill: lines[i][3] }, svg);
      const lb = ["layer image gốc", "+1 layer", "", "0 B: USER, EXPOSE"][i]; if (lb) txt(svg, 615, i === 3 ? y - h - 6 : y - h / 2 + 4, lb, "sv-s");
      y -= h + 3; await sleep(500);
    }
    cap.textContent = "Xong: podman tag web:1.0 registry.lab:5000/web:1.0 → podman push; hoặc podman save -o web.tar web:1.0.";
    btn.disabled = false;
  };
};
ANIM.multi = p => {
  const MODES = { init: "Init", sidecar: "Sidecar", adapter: "Adapter", ambassador: "Ambassador" };
  p.innerHTML = "<h4>Mẫu nhiều container trong một Pod</h4>" + '<div class="seg" role="group">' + Object.entries(MODES).map(([k, v], i) => '<button type="button" data-m="' + k + '" aria-pressed="' + !i + '">' + v + "</button>").join("") + '</div><div class="stage sm"><svg viewBox="0 0 760 270"></svg></div><p class="hint cap" aria-live="polite"></p>';
  const svg = $("svg", p), cap = $(".cap", p); let run = 0;
  const go = async m => {
    const tok = ++run, alive = () => tok === run && svg.isConnected;
    svg.innerHTML = "";
    el("rect", { x: 20, y: 20, width: 540, height: 230, rx: 14, class: "an-pod" }, svg); txt(svg, 36, 42, "Pod", "sv-lbl");
    const vol = rbox(svg, 220, 190, 130, 44, "an-vol", "emptyDir", "volume chung");
    const C = (x, y, t, sub, id) => { const g = rbox(svg, x, y, 150, 56, "an-c", t, sub); g.querySelector("rect").id = id; return g.querySelector("rect"); };
    const set = (r, c) => r.setAttribute("class", "an-c " + c);
    if (m === "init") {
      const a = C(50, 70, "init: prepare", "chạy trước, thoát 0", "ci"), b = C(360, 70, "nginx", "chờ init xong", "cm");
      cap.textContent = "Init container chạy lần lượt và phải thoát 0 thì container chính mới khởi động. Lỗi thì Pod đứng Init:CrashLoopBackOff.";
      while (alive()) {
        set(a, "start"); set(b, ""); await sleep(700); set(a, "run");
        await packetAlong(svg, [[125, 126], [125, 212], [220, 212]], { cls: "raw", dur: 800 });
        set(a, "done"); await sleep(400); set(b, "start"); await sleep(500); set(b, "run");
        await packetAlong(svg, [[350, 212], [435, 212], [435, 126]], { cls: "fmt", dur: 800 });
        await sleep(1600);
      }
    } else if (m === "sidecar") {
      const s = C(50, 70, "log-tail (sidecar)", "restartPolicy: Always", "cs"), a = C(360, 70, "app", "ghi log", "ca");
      rbox(svg, 590, 90, 150, 56, "an-ext", "Log backend", "ngoài Pod");
      cap.textContent = "Sidecar kiểu mới khởi động trước app và chạy suốt đời Pod; nó đọc file log app ghi vào volume chung rồi gửi đi.";
      set(s, "start"); await sleep(600); set(s, "run"); set(a, "start"); await sleep(500); set(a, "run");
      while (alive()) { await packetAlong(svg, [[435, 126], [435, 212], [350, 212]], { cls: "raw", dur: 650 }); await packetAlong(svg, [[220, 212], [125, 212], [125, 126]], { cls: "raw", dur: 650 }); await packetAlong(svg, [[125, 70], [125, 55], [665, 55], [665, 90]], { cls: "fmt", dur: 900 }); }
    } else if (m === "adapter") {
      const a = C(50, 70, "app", "in cpu=37,mem=512", "ca"), ad = C(360, 70, "adapter", "đổi định dạng", "cd");
      rbox(svg, 590, 90, 150, 56, "an-ext", "Monitoring", "CPU 37% MEM 512Mi");
      set(a, "run"); set(ad, "run");
      cap.textContent = "Adapter chuẩn hóa đầu ra của app (log, metric) sang định dạng hệ thống bên ngoài cần, không phải sửa app.";
      while (alive()) { await packetAlong(svg, [[125, 126], [125, 212], [220, 212]], { cls: "raw", dur: 650 }); await packetAlong(svg, [[350, 212], [435, 212], [435, 126]], { cls: "raw", dur: 650 }); await packetAlong(svg, [[510, 98], [590, 118]], { cls: "fmt", dur: 600 }); await sleep(300); }
    } else {
      const a = C(50, 70, "app", "gọi localhost:6379", "ca"), am = C(360, 70, "ambassador", "proxy ra ngoài", "cb");
      rbox(svg, 590, 40, 150, 50, "an-ext", "Redis shard 1", ""); rbox(svg, 590, 150, 150, 50, "an-ext", "Redis shard 2", "");
      set(a, "run"); set(am, "run");
      cap.textContent = "Ambassador nằm cùng Pod, app chỉ gọi localhost; ambassador lo kết nối, chia shard, TLS hay retry ra dịch vụ ngoài.";
      let k = 0;
      while (alive()) { await packetAlong(svg, [[200, 98], [360, 98]], { cls: "raw", dur: 600 }); await packetAlong(svg, [[510, 98], [590, k % 2 ? 175 : 65]], { cls: "fmt", dur: 600 }); k++; await sleep(250); }
    }
  };
  p.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) { $$("[data-m]", p).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); go(b.dataset.m); } });
  go("init");
};
ANIM.strategy = p => {
  const MODES = { rolling: "Rolling update", recreate: "Recreate", bluegreen: "Blue/green", canary: "Canary" };
  p.innerHTML = "<h4>Bốn cách đưa phiên bản mới lên</h4>" + '<div class="seg" role="group">' + Object.entries(MODES).map(([k, v], i) => '<button type="button" data-m="' + k + '" aria-pressed="' + !i + '">' + v + "</button>").join("") + '</div><div class="stage sm"><svg viewBox="0 0 760 260"></svg></div><div class="controls"><button class="btn primary" type="button" data-play>▶ Chạy</button><span class="hint cap" aria-live="polite"></span></div>';
  const svg = $("svg", p), cap = $(".cap", p); let mode = "rolling", run = 0, pods = [], sel = "v1", hits = { v1: 0, v2: 0 };
  const SX = 380, slot = i => 20 + i * 90;
  const draw = () => {
    let base = $("g.base", svg); if (!base) { base = el("g", { class: "base" }); svg.insertBefore(base, svg.firstChild); }
    base.innerHTML = ""; const svgB = base;
    const down = !pods.some(q => q.ready && (sel === "all" || q.v === sel));
    rbox(svgB, SX - 90, 20, 180, 56, "an-svc" + (down ? " down" : ""), "Service shop", sel === "all" ? "selector: app=shop" : "selector: version=" + (sel === "v1" ? "blue" : "green"));
    pods.forEach((q, i) => {
      const x = slot(q.slot), on = q.ready && (sel === "all" || q.v === sel);
      el("path", { d: "M" + SX + " 76 V110 H" + (x + 40) + " V160", class: "an-l" + (on ? (q.v === "v1" ? " on" : " g") : "") }, svgB);
      const g = rbox(svgB, x, 160, 80, 56, "an-c " + (q.term ? "term" : q.ready ? q.v : "start"), q.v === "v1" ? "v1" : "v2", q.term ? "đang xóa" : q.ready ? "Ready" : "khởi động");
      g.dataset.i = i;
    });
    txt(svgB, 20, 248, "Request vào v1: " + hits.v1 + " · v2: " + hits.v2 + (hits.v1 + hits.v2 ? " (" + Math.round(hits.v2 / (hits.v1 + hits.v2) * 100) + "% v2)" : ""), "sv-s");
    if (down) txt(svgB, SX, 100, "không có endpoint: người dùng gặp lỗi", "sv-s", "middle").setAttribute("fill", "var(--bad)");
  };
  const traffic = async tok => {
    while (tok === run && svg.isConnected) {
      const ok = pods.filter(q => q.ready && !q.term && (sel === "all" || q.v === sel));
      if (ok.length) { const q = ok[Math.floor(Math.random() * ok.length)]; hits[q.v]++; const x = slot(q.slot) + 40; packetAlong(svg, [[SX, 76], [SX, 110], [x, 110], [x, 160]], { cls: q.v, dur: 500 }); }
      await sleep(260); if (tok === run) draw();
    }
  };
  const reset = () => { hits = { v1: 0, v2: 0 }; sel = mode === "bluegreen" ? "v1" : "all"; pods = [0, 1, 2, 3].map(i => ({ slot: i, v: "v1", ready: 1 })); draw(); };
  const play = async () => {
    const tok = ++run; reset(); traffic(tok); const alive = () => tok === run && svg.isConnected; await sleep(1200);
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
};

/* ---------- bài tập ---------- */
let exDom = "all", exState = "all", exQ = "", exOpen = null;
const done = () => store.get("done", {});
function progress() { const d = done(), n = EX.filter(e => d[e.id]).length; $("#progTxt").textContent = n + "/" + EX.length + " bài"; $("#progBar").style.width = (n / EX.length * 100) + "%"; }
RENDER.ex = () => '<header class="vh"><p class="eyebrow">Luyện · ' + EX.length + ' bài</p><h2>Bài tập CKAD</h2><p class="lead">Tự làm trên cluster của bạn, rồi chạy lệnh kiểm tra. Mỗi bài ghi nguồn chủ đề.</p></header>' +
  '<div class="panel col"><div class="chips" id="exDoms"><button type="button" data-ed="all">Tất cả · ' + EX.length + "</button>" + D.map(d => '<button type="button" data-ed="' + d.id + '">' + esc(d.vi) + " · " + EX.filter(e => e.d === d.id).length + "</button>").join("") + '</div>' +
  '<div class="formrow"><div class="seg" role="group" id="exStates"><button type="button" data-es="all">Tất cả</button><button type="button" data-es="todo">Chưa làm</button><button type="button" data-es="done">Đã làm</button></div><input type="search" id="exQ" placeholder="Tìm: job, secret, ingress…" style="flex:1;min-width:200px" aria-label="Tìm bài"></div>' +
  '<div class="ck-prog"><span id="exCount"></span><span class="meter"><i id="exBar"></i></span></div></div><div class="col" id="exList" style="gap:10px"></div>';
function exItem(e, open) {
  const d = done()[e.id], tested = e.test !== false;
  return '<details class="ck-ex' + (d ? " done" : "") + '" id="ex-' + e.id + '"' + (open ? " open" : "") + '><summary>' + domPill(e.d) + '<span class="t">' + esc(e.title) + '</span><span class="mins">' + e.mins + " phút</span></summary><div class=\"body\">" +
    '<div class="task">' + esc(e.task.trim()) + "</div>" +
    '<div class="controls" style="margin:0"><button type="button" class="btn" data-hint="' + e.id + '">Gợi ý</button><label class="check"><input type="checkbox" data-done="' + e.id + '"' + (d ? " checked" : "") + '> Đã làm xong</label>' +
    (tested ? '<span class="ck-badge ok" title="tools/check_ckad.py">lời giải đã chạy thử trên cluster</span>' : '<span class="ck-badge no">cần podman/Helm: chưa chạy tự động</span>') + "</div>" +
    '<div class="hint" hidden id="hint-' + e.id + '">' + esc(e.hint) + "</div>" +
    det("Lời giải", code(e.sol)) + det("Lệnh kiểm tra", code(e.check)) +
    '<div class="ck-links"><span class="small muted">Nguồn chủ đề:</span>' + e.src.map(srcChip).join("") + "</div></div></details>";
}
function exRender() {
  const q = exQ.trim().toLowerCase(), d = done();
  const list = EX.filter(e => (exDom === "all" || e.d === exDom) && (exState === "all" || (exState === "done") === !!d[e.id]) && (!q || (e.title + " " + e.task + " " + e.sol).toLowerCase().includes(q)));
  $("#exList").innerHTML = list.length ? list.map(e => exItem(e, e.id === exOpen)).join("") : '<p class="muted">Không có bài khớp.</p>';
  $$("#exDoms button").forEach(b => b.setAttribute("aria-pressed", b.dataset.ed === exDom ? "true" : "false"));
  $$("#exStates button").forEach(b => b.setAttribute("aria-pressed", b.dataset.es === exState ? "true" : "false"));
  const n = EX.filter(e => d[e.id]).length; $("#exCount").textContent = n + "/" + EX.length + " bài đã làm"; $("#exBar").style.width = (n / EX.length * 100) + "%";
  addCopies($("#exList"));
  if (exOpen) { const t = $("#ex-" + exOpen); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 50); exOpen = null; }
}
AFTER.ex = sec => {
  $("#exQ").value = exQ;
  sec.addEventListener("click", e => {
    const a = e.target.closest("[data-ed]"); if (a) { exDom = a.dataset.ed; exRender(); return; }
    const s = e.target.closest("[data-es]"); if (s) { exState = s.dataset.es; exRender(); return; }
    const h = e.target.closest("[data-hint]"); if (h) { const x = $("#hint-" + h.dataset.hint); x.hidden = !x.hidden; return; }
  });
  sec.addEventListener("change", e => { const c = e.target.closest("[data-done]"); if (c) { const d = done(); if (c.checked) d[c.dataset.done] = 1; else delete d[c.dataset.done]; store.set("done", d); c.closest(".ck-ex").classList.toggle("done", c.checked); progress(); const n = EX.filter(x => d[x.id]).length; $("#exCount").textContent = n + "/" + EX.length + " bài đã làm"; $("#exBar").style.width = (n / EX.length * 100) + "%"; } });
  sec.addEventListener("input", e => { if (e.target.id === "exQ") { exQ = e.target.value; exRender(); } });
  exRender();
};
ON.ex = () => { $("#exQ").value = exQ; exRender(); };

/* ---------- thi thử ---------- */
let mockTimer = null;
const MOCK_N = { build: 3, deploy: 3, obs: 2, env: 4, net: 3 };
RENDER.mock = () => '<header class="vh"><p class="eyebrow">Luyện · đề ngẫu nhiên</p><h2>Thi thử 2 giờ</h2><p class="lead">15 task chọn ngẫu nhiên theo tỉ trọng domain. Tự làm trên cluster, tự chấm bằng lệnh kiểm tra.</p></header><div id="mockBox" class="col" style="gap:12px"></div>';
function mockState() { return store.get("mock", null); }
function mockNew() {
  const pick = [];
  Object.entries(MOCK_N).forEach(([d, n]) => { const pool = EX.filter(e => e.d === d).sort(() => Math.random() - .5); pick.push(...pool.slice(0, n).map(e => e.id)); });
  store.set("mock", { ids: pick, start: Date.now(), res: {}, end: 0 }); mockRender();
}
function mockScore(m) {
  const tot = m.ids.reduce((a, id) => a + EX.find(e => e.id === id).mins, 0);
  const got = m.ids.filter(id => m.res[id] === "pass").reduce((a, id) => a + EX.find(e => e.id === id).mins, 0);
  return Math.round(got / tot * 100);
}
function mockRender() {
  const box = $("#mockBox"), m = mockState();
  clearInterval(mockTimer);
  if (!m) { box.innerHTML = '<div class="panel col">' + tl(["Phân bổ: Build 3 · Deploy 3 · Observability 2 · Environment 4 · Networking 3.", "Điểm mỗi task tính theo số phút ước tính; đậu từ <b>66%</b> như đề thật.", "Lời giải ẩn tới khi bấm, nên tự kiểm tra trước bằng lệnh check."]) + '<div class="controls"><button class="btn primary" type="button" id="mockGo">▶ Bắt đầu đề mới</button></div></div>'; $("#mockGo").onclick = mockNew; return; }
  const finished = !!m.end;
  const score = mockScore(m);
  let h = '<div class="ck-mock-top"><div><span class="small muted">Còn lại</span><div class="ck-clock" id="mockClock">--:--</div></div><div><span class="small muted">Điểm tự chấm</span><div class="ck-clock">' + score + "%</div></div>" +
    '<div class="controls" style="margin:0">' + (finished ? "" : '<button class="btn primary" type="button" id="mockEnd">Nộp bài</button>') + '<button class="btn" type="button" id="mockNew">Đề mới</button></div></div>';
  if (finished) {
    const per = D.map(d => { const ids = m.ids.filter(id => EX.find(e => e.id === id).d === d.id); return [d, ids.filter(id => m.res[id] === "pass").length, ids.length]; });
    h += '<div class="panel col"><div class="ck-score" style="color:' + (score >= 66 ? "var(--node)" : "var(--bad)") + '">' + score + "% · " + (score >= 66 ? "Đậu" : "Chưa đậu") + "</div>" +
      per.map(([d, a, b]) => '<div class="ck-bar" style="cursor:default"><span class="lab"><b>' + esc(d.vi) + '</b><span class="track"><i style="width:' + (b ? a / b * 100 : 0) + "%;background:" + DCOL[d.id] + '"></i></span></span><span class="w">' + a + "/" + b + '</span><span class="m"></span></div>').join("") + "</div>";
  }
  h += m.ids.map((id, i) => {
    const e = EX.find(x => x.id === id), r = m.res[id];
    return '<div class="ck-mtask' + (r ? " " + r : "") + '"><div class="hd"><span class="ck-dom dom-' + e.d + '">' + (i + 1) + "</span><b>" + esc(e.title) + '</b><span class="mins small muted">' + e.mins + " điểm</span></div>" +
      '<div class="task" style="white-space:pre-line;font-size:14px">' + esc(e.task.trim()) + "</div>" + det("Lệnh kiểm tra", code(e.check)) + det("Lời giải", code(e.sol)) +
      '<div class="controls" style="margin:0"><button class="btn" type="button" data-mr="pass" data-id="' + id + '"' + (r === "pass" ? ' aria-pressed="true"' : "") + ">✓ Đạt</button><button class=\"btn\" type=\"button\" data-mr=\"fail\" data-id=\"" + id + '"' + (r === "fail" ? ' aria-pressed="true"' : "") + ">✕ Chưa đạt</button></div></div>";
  }).join("");
  box.innerHTML = h; addCopies(box);
  const tick = () => { const left = Math.max(0, 7200 - Math.floor(((m.end || Date.now()) - m.start) / 1000)); const c = $("#mockClock"); if (!c) return; c.textContent = String(Math.floor(left / 3600)) + ":" + String(Math.floor(left % 3600 / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0"); c.classList.toggle("low", left < 900); if (!left && !m.end) { m.end = Date.now(); store.set("mock", m); mockRender(); } };
  tick(); if (!finished) mockTimer = setInterval(tick, 1000);
  box.onclick = e => {
    const b = e.target.closest("[data-mr]"); if (b) { const s = mockState(); s.res[b.dataset.id] = b.dataset.mr; store.set("mock", s); mockRender(); return; }
    if (e.target.closest("#mockEnd")) { const s = mockState(); s.end = Date.now(); store.set("mock", s); mockRender(); }
    if (e.target.closest("#mockNew")) { if (!m.end && !confirm("Bỏ đề đang làm và tạo đề mới?")) return; mockNew(); }
  };
}
AFTER.mock = ON.mock = () => mockRender();

/* ---------- mẹo ---------- */
RENDER.tips = () => '<header class="vh"><p class="eyebrow">Tra cứu</p><h2>Mẹo làm bài CKAD</h2><p class="lead">Ít gõ YAML tay, đúng namespace, kiểm tra lại trước khi sang task khác.</p></header>' +
  '<div class="panel col">' + tl(["Mỗi task: đọc ô thông tin, <b>ssh</b> đúng máy, làm xong thì <b>exit</b> (không ssh lồng nhau).", "Sinh YAML bằng lệnh, chỉ sửa phần còn thiếu: nhanh và ít lỗi thụt dòng.", "Sai tên, sai namespace, sai đường dẫn file là mất trọn điểm task."]) + "</div>" +
  '<div class="panel col"><h4>30 giây đầu giờ</h4>' + code(`# máy thi đã có alias k và tự hoàn thành lệnh
export do="--dry-run=client -o yaml"     # k run web --image=nginx:1.27 $do > web.yaml
export now="--force --grace-period=0"    # k delete pod web $now
echo 'set expandtab tabstop=2 shiftwidth=2' >> ~/.vimrc`) + "</div>" +
  '<div class="panel col"><h4>Lệnh sinh YAML nhanh</h4><div class="tbl ck-cheat"><table><thead><tr><th>Cần</th><th>Lệnh</th></tr></thead><tbody>' + [
    ["Pod", "k run web --image=nginx:1.27 --port=80 -l app=web $do"], ["Pod chạy lệnh", "k run t --image=busybox:1.36 $do -- sh -c 'sleep 3600'"], ["Deployment", "k create deploy web --image=nginx:1.27 --replicas=3 $do"],
    ["Job", "k create job calc --image=busybox:1.36 $do -- sh -c 'echo hi'"], ["CronJob", "k create cronjob r --image=busybox:1.36 --schedule='*/5 * * * *' $do -- date"], ["Job từ CronJob", "k create job r-now --from=cronjob/r"],
    ["Service", "k expose deploy web --port=80 --target-port=8080 [--type=NodePort]"], ["Ingress", "k create ingress web --class=nginx --rule='web.lab/*=web:80'"], ["ConfigMap", "k create cm cfg --from-literal=A=1 --from-file=app.conf"],
    ["Secret", "k create secret generic db --from-literal=pass=x"], ["ServiceAccount, token", "k create sa app; k create token app"], ["Role, RoleBinding", "k create role r --verb=get,list --resource=pods; k create rolebinding rb --role=r --serviceaccount=ns:app"],
    ["ResourceQuota", "k create quota q --hard=pods=5,requests.cpu=1"], ["HPA", "k autoscale deploy web --min=2 --max=6 --cpu=70%"], ["Đổi image, resources, env", "k set image | k set resources | k set env deploy/web"]
  ].map(r => "<tr><td><b>" + esc(r[0]) + "</b></td><td><code>" + esc(r[1]) + "</code></td></tr>").join("") + "</tbody></table></div></div>" +
  '<div class="panel col"><h4>Tra trường YAML không cần mở web</h4>' + code(`k explain pod.spec.containers.securityContext
k explain deploy.spec.strategy --recursive
k api-resources | grep -i cronjob        # tên ngắn, apiVersion, namespaced?`) + "</div>" +
  '<div class="panel col"><h4>Tài liệu được mở trong lúc thi</h4><ul class="tight"><li><a href="https://kubernetes.io/docs" target="_blank" rel="noopener">kubernetes.io/docs</a> và <a href="https://kubernetes.io/blog/" target="_blank" rel="noopener">kubernetes.io/blog</a></li><li><a href="https://helm.sh/docs" target="_blank" rel="noopener">helm.sh/docs</a></li><li>Tài liệu riêng được dẫn trong ô Quick Reference của từng task</li></ul><p class="small muted" style="margin:0">Theo <a href="https://docs.linuxfoundation.org/tc-docs/certification/certification-resources-allowed" target="_blank" rel="noopener">Linux Foundation: Resources Allowed</a>. Gateway API docs chỉ dành cho CKA.</p></div>' +
  '<div class="panel col"><h4>Chia thời gian</h4><ul class="tight"><li>Khoảng 6–8 phút mỗi task. Task dễ, điểm cao làm trước; task kẹt quá 10 phút thì đánh dấu và quay lại.</li><li>Pod đang chạy hầu như không sửa được spec: <code>k get pod x -o yaml > x.yaml</code>, sửa, <code>k replace --force -f x.yaml</code>.</li><li>Trước khi sang task: <code>k get</code> lại object, đúng tên, đúng namespace, file lưu đúng chỗ đề hỏi.</li></ul></div>';

/* ---------- nguồn ---------- */
RENDER.src = () => {
  const cnt = k => EX.filter(e => e.src.some(s => s[0] === k)).length + D.reduce((a, d) => a + d.topics.filter(t => (t.src || []).some(s => s[0] === k)).length, 0);
  return '<header class="vh"><p class="eyebrow">Tra cứu</p><h2>Nguồn tham khảo</h2><p class="lead">Chỉ dùng repo chính thức hoặc được cộng đồng dùng rộng rãi. Bài tập được viết lại bằng tiếng Việt, không chép nguyên văn.</p></header>' +
    '<div class="panel col">' + tl(["<b>Danh sách domain và tỉ trọng</b> lấy từ curriculum chính thức của CNCF.", "<b>Lời giải</b> được chạy thử tự động trên cluster k3s v1.34 bằng <code>tools/check_ckad.py</code>, trừ bài cần podman hoặc Helm.", "Mỗi mục và mỗi bài ghi rõ repo đã gợi ý chủ đề đó."]) + "</div>" +
    '<div class="ck-topics">' + Object.entries(SRC).map(([k, s]) => '<article class="ck-topic"><a href="' + esc(s.url) + '" target="_blank" rel="noopener" class="vi">' + esc(s.name) + " ↗</a><span>" + esc(s.note) + '</span><div class="ck-links"><span class="ck-badge no">' + esc(s.license) + "</span>" + (cnt(k) ? '<span class="ck-badge ok">dẫn ở ' + cnt(k) + " chỗ</span>" : "") + "</div></article>").join("") + "</div>";
};

/* ---------- Job & CronJob ---------- */
RENDER.jobs = () => '<header class="vh"><p class="eyebrow">Khái niệm · Application Design and Build</p><h2>Job &amp; CronJob</h2><p class="lead">Job chạy Pod tới khi xong. CronJob tạo Job theo lịch.</p></header>' +
  '<div class="panel col">' + tl(["<b>Job</b> cần đủ <code>completions</code> lần thành công, chạy tối đa <code>parallelism</code> Pod cùng lúc, lỗi quá <code>backoffLimit</code> thì Failed.", "<b>CronJob</b> mỗi lần tới giờ tạo một Job; <code>concurrencyPolicy</code> quyết định khi lần trước chưa xong.", "Pod của Job phải có <code>restartPolicy</code> Never hoặc OnFailure, không được Always."]) + "</div>" +
  '<div class="panel col ck-anim" id="jobSim"><h4>Mô phỏng Job</h4><div class="formrow">' +
  '<label class="f">completions <b id="jcV">4</b><input type="range" id="jc" min="1" max="8" value="4"></label>' +
  '<label class="f">parallelism <b id="jpV">2</b><input type="range" id="jp" min="1" max="4" value="2"></label>' +
  '<label class="f">backoffLimit <b id="jbV">2</b><input type="range" id="jb" min="0" max="4" value="2"></label></div>' +
  '<div class="formrow"><div class="seg" role="group" id="jMode"><button type="button" data-jm="ok" aria-pressed="true">Mọi Pod thành công</button><button type="button" data-jm="one" aria-pressed="false">Một lần lỗi</button><button type="button" data-jm="all" aria-pressed="false">Lỗi liên tục</button></div>' +
  '<div class="seg" role="group" id="jRp"><button type="button" data-jr="Never" aria-pressed="true">restartPolicy: Never</button><button type="button" data-jr="OnFailure" aria-pressed="false">OnFailure</button></div></div>' +
  '<div class="stage sm"><svg id="jSvg" viewBox="0 0 760 230"></svg></div><div class="controls"><button class="btn primary" type="button" id="jPlay">▶ Chạy Job</button><span class="hint cap" id="jCap" aria-live="polite"></span></div>' + code("") + "</div>" +
  '<div class="panel col ck-anim" id="cjSim"><h4>Mô phỏng CronJob trong 60 phút</h4><div class="formrow">' +
  '<div class="seg" role="group" id="cjSch"><button type="button" data-cs="10" aria-pressed="true">*/10 * * * *</button><button type="button" data-cs="15" aria-pressed="false">*/15 * * * *</button><button type="button" data-cs="20" aria-pressed="false">*/20 * * * *</button></div>' +
  '<label class="f">Thời gian chạy mỗi Job (phút) <b id="cdV">14</b><input type="range" id="cd" min="3" max="35" value="14"></label></div>' +
  '<div class="formrow"><div class="seg" role="group" id="cjPol"><button type="button" data-cp="Allow" aria-pressed="true">Allow</button><button type="button" data-cp="Forbid" aria-pressed="false">Forbid</button><button type="button" data-cp="Replace" aria-pressed="false">Replace</button></div>' +
  '<label class="check"><input type="checkbox" id="cjSusp"> suspend từ phút 30</label><span class="small muted">successfulJobsHistoryLimit: 3</span></div>' +
  '<div class="stage sm"><svg id="cjSvg" viewBox="0 0 760 260"></svg></div><div class="controls"><button class="btn primary" type="button" id="cjPlay">▶ Chạy 60 phút</button><span class="hint cap" id="cjCap" aria-live="polite"></span></div></div>' +
  '<div class="panel col"><h4>Đọc lịch cron</h4><p class="hint" style="margin:0">phút · giờ · ngày trong tháng · tháng · thứ (0 hoặc 7 là Chủ nhật). Hỗ trợ <code>*</code> <code>*/n</code> <code>a-b</code> <code>a,b</code> và @hourly, @daily, @weekly, @monthly.</p>' +
  '<div class="formrow"><input type="text" id="cronIn" value="0 9 * * 1-5" style="flex:1;min-width:200px;font-family:var(--f-mono)" aria-label="Lịch cron"><div class="chips" id="cronEx">' + ["*/5 * * * *", "0 2 * * *", "0 9 * * 1-5", "30 8 1 * *", "0 */6 * * *", "@weekly"].map(x => '<button type="button" data-cron="' + x + '">' + x + "</button>").join("") + '</div></div><div id="cronOut"></div>' +
  '<p class="small muted" style="margin:0">CronJob tính giờ theo múi giờ của kube-controller-manager (thường UTC) nếu không đặt <code>spec.timeZone</code>, ví dụ <code>timeZone: Asia/Ho_Chi_Minh</code>. Bảng trên dùng giờ máy bạn.</p></div>' +
  '<div class="ck-topics"><article class="ck-topic"><span class="vi">Trường của Job</span><div class="tbl"><table><tbody>' + [
    ["completions", "số lần thành công cần có (mặc định 1)"], ["parallelism", "số Pod chạy cùng lúc (mặc định 1)"], ["backoffLimit", "số lần lỗi cho phép trước khi Failed (mặc định 6)"], ["activeDeadlineSeconds", "giới hạn thời gian cả Job, quá là Failed: DeadlineExceeded"],
    ["ttlSecondsAfterFinished", "tự xóa Job và Pod sau khi xong"], ["completionMode: Indexed", "mỗi Pod một chỉ số, biến JOB_COMPLETION_INDEX"], ["template.spec.restartPolicy", "Never: lỗi thì tạo Pod mới; OnFailure: restart container tại chỗ"]
  ].map(r => "<tr><td><code>" + r[0] + "</code></td><td>" + esc(r[1]) + "</td></tr>").join("") + "</tbody></table></div></article>" +
  '<article class="ck-topic"><span class="vi">Trường của CronJob</span><div class="tbl"><table><tbody>' + [
    ["schedule", "lịch cron, luôn để trong nháy"], ["timeZone", "múi giờ IANA, ví dụ Asia/Ho_Chi_Minh"], ["concurrencyPolicy", "Allow (mặc định), Forbid, Replace"], ["startingDeadlineSeconds", "lỡ giờ quá số giây này thì bỏ lần đó"],
    ["successfulJobsHistoryLimit", "giữ bao nhiêu Job thành công (mặc định 3)"], ["failedJobsHistoryLimit", "giữ bao nhiêu Job lỗi (mặc định 1)"], ["suspend", "true: ngừng tạo Job mới, Job đang chạy vẫn chạy"], ["jobTemplate", "spec của Job sẽ được tạo"]
  ].map(r => "<tr><td><code>" + r[0] + "</code></td><td>" + esc(r[1]) + "</td></tr>").join("") + "</tbody></table></div></article>" +
  '<article class="ck-topic"><span class="vi">Mẫu đầy đủ</span>' + code(`apiVersion: batch/v1
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
              command: ["sh", "-c", "date; echo backup done"]`) + "</article>" +
  '<article class="ck-topic"><span class="vi">Bẫy hay gặp</span><ul class="tight"><li>Không có cờ cho completions, parallelism, concurrencyPolicy: sinh YAML rồi sửa, hoặc <code>k patch</code>.</li><li>Template của Job bất biến: muốn chạy lại thì xóa Job và tạo lại.</li><li>Tạo CronJob xong không chạy ngay: thử bằng <code>k create job x --from=cronjob/…</code>.</li><li>OnFailure: restart tại chỗ vẫn tính vào backoffLimit; Pod lỗi không còn để đọc log như Never.</li><li>Schedule không để trong nháy thì shell bung dấu <code>*</code> thành tên file.</li></ul>' +
  '<div class="ck-links"><a class="ck-src" href="learn.html#kinds">Lý thuyết: Workload resources (sơ đồ, sequence)</a><button type="button" class="pill cp" data-exgo="b-job">Bài: Job</button><button type="button" class="pill cp" data-exgo="b-cron">Bài: CronJob</button><a class="ck-src" href="https://kubernetes.io/docs/concepts/workloads/controllers/job/" target="_blank" rel="noopener">Job ↗</a><a class="ck-src" href="https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/" target="_blank" rel="noopener">CronJob ↗</a></div></article></div>';

let jMode = "ok", jRp = "Never", jRun = 0, cjEvery = 10, cjPol = "Allow", cjRun = 0;
function jYaml() {
  const c = +$("#jc").value, p = +$("#jp").value, b = +$("#jb").value;
  const pre = $("#jobSim pre.code"); if (pre) pre.innerHTML = hl(`apiVersion: batch/v1
kind: Job
metadata: {name: calc}
spec:
  completions: ${c}
  parallelism: ${p}
  backoffLimit: ${b}
  template:
    spec:
      restartPolicy: ${jRp}
      containers:
        - {name: calc, image: busybox:1.36, command: ["sh", "-c", "echo $((6*7))"]}`);
}
function jPlan(C, P, B) {
  /* sự kiện: mỗi lần chạy [lane, start, end, ok, podIdx, restart] ; t tính bằng giây giả lập */
  const runs = [], lanes = Array(P).fill(0); let succ = 0, fail = 0, attempt = 0, started = 0, nextAllowed = 0, t = 0, status = "", pods = 0;
  const DUR_OK = 8, DUR_FAIL = 5;
  const pending = [];
  while (succ < C && t < 400) {
    for (let l = 0; l < P; l++) {
      if (lanes[l] <= t && started < C + fail && t >= nextAllowed && succ + runs.filter(r => r.end > t).length < C) {
        attempt++;
        const willFail = jMode === "all" || (jMode === "one" && attempt === 2);
        const reuse = jRp === "OnFailure" && pending.length;
        const pod = reuse ? pending.shift() : ++pods;
        const d = willFail ? DUR_FAIL : DUR_OK;
        runs.push({ lane: l, start: t, end: t + d, ok: !willFail, pod, restart: reuse });
        lanes[l] = t + d; started++;
      }
    }
    t++;
    runs.filter(r => r.end === t).forEach(r => {
      if (r.ok) succ++; else { fail++; nextAllowed = t + Math.min(10 * Math.pow(2, fail - 1), 60); if (jRp === "OnFailure") pending.push(r.pod); }
    });
    if (fail > B) { status = "Failed"; runs.filter(r => r.end > t).forEach(r => { r.end = t; r.killed = 1; }); break; }
  }
  if (!status) status = succ >= C ? "Complete" : "Running";
  return { runs, succ, fail, status, T: Math.max(t, 20), pods };
}
async function jPlay() {
  const tok = ++jRun, svg = $("#jSvg"), cap = $("#jCap");
  const C = +$("#jc").value, P = +$("#jp").value, B = +$("#jb").value, plan = jPlan(C, P, B);
  const X = s => 90 + s / plan.T * 640, LH = Math.min(40, 150 / P);
  svg.innerHTML = "";
  for (let l = 0; l < P; l++) txt(svg, 10, 40 + l * (LH + 8) + LH / 2 + 4, "luồng " + (l + 1), "sv-s");
  const axisY = 40 + P * (LH + 8) + 6;
  el("line", { x1: 90, x2: 730, y1: axisY, y2: axisY, class: "an-l" }, svg);
  const stp = plan.T > 80 ? 20 : 10;
  for (let s = 0; s <= plan.T; s += stp) txt(svg, X(s), axisY + 16, s + "s", "sv-s", "middle");
  const head = el("line", { x1: 90, x2: 90, y1: 30, y2: axisY, stroke: "var(--ink)", "stroke-width": 1, opacity: .4 }, svg);
  const stat = txt(svg, 90, 22, "", "sv-tb");
  const t0 = performance.now(), dur = RM ? 50 : Math.min(9000, plan.T * 110);
  const drawn = new Set();
  await new Promise(res => {
    const f = now => {
      if (tok !== jRun || !svg.isConnected) return res();
      const p = Math.min(1, (now - t0) / dur), t = p * plan.T;
      head.setAttribute("x1", X(t)); head.setAttribute("x2", X(t));
      plan.runs.forEach((r, i) => {
        if (t < r.start) return;
        let g = svg.querySelector("#jr" + i);
        if (!g) { g = el("g", { id: "jr" + i }, svg); el("rect", { x: X(r.start), y: 40 + r.lane * (LH + 8), height: LH, width: 1, rx: 4, class: "an-c start" }, g); txt(g, X(r.start) + 6, 40 + r.lane * (LH + 8) + LH / 2 + 4, (r.restart ? "↻ " : "") + "Pod " + r.pod, "sv-s"); }
        const rect = g.querySelector("rect"), e = Math.min(t, r.end);
        rect.setAttribute("width", Math.max(1, X(e) - X(r.start)));
        if (t >= r.end && !drawn.has(i)) { drawn.add(i); rect.setAttribute("class", "an-c " + (r.ok ? "run" : "term")); }
      });
      const s = plan.runs.filter(r => r.end <= t && r.ok).length, fl = plan.runs.filter(r => r.end <= t && !r.ok && !r.killed).length;
      stat.textContent = "Succeeded " + s + "/" + C + " · Failed " + fl + " (backoffLimit " + B + ")";
      if (p < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  if (tok !== jRun) return;
  stat.textContent = (plan.status === "Complete" ? "Complete ✓ " : "Failed ✕ ") + "· Succeeded " + plan.succ + "/" + C + " · Failed " + plan.fail;
  stat.setAttribute("fill", plan.status === "Complete" ? "var(--node)" : "var(--bad)");
  cap.innerHTML = plan.status === "Complete"
    ? "Đủ " + C + " lần thành công nên Job <b>Complete</b>. " + (plan.fail ? "Lần lỗi được thử lại sau thời gian chờ (10s, 20s, 40s…). " : "") + (jRp === "OnFailure" && plan.fail ? "OnFailure: container restart trong cùng Pod (↻)." : jRp === "Never" && plan.fail ? "Never: lỗi thì tạo Pod mới, Pod lỗi còn lại để đọc log." : "")
    : "Lỗi " + plan.fail + " lần, vượt backoffLimit " + B + ": Job <b>Failed</b> với lý do <code>BackoffLimitExceeded</code>, Pod đang chạy bị dừng.";
}
async function cjPlay() {
  const tok = ++cjRun, svg = $("#cjSvg"), cap = $("#cjCap"), D = +$("#cd").value, susp = $("#cjSusp").checked;
  const X = m => 70 + m / 60 * 660;
  const jobs = []; let row = 0;
  svg.innerHTML = "";
  for (let m = 0; m <= 60; m += 10) { el("line", { x1: X(m), x2: X(m), y1: 20, y2: 225, class: "an-l" }, svg); txt(svg, X(m), 245, m + "′", "sv-s", "middle"); }
  const head = el("line", { x1: X(0), x2: X(0), y1: 20, y2: 228, stroke: "var(--ink)", "stroke-width": 1.4 }, svg);
  const notes = el("g", null, svg);
  const t0 = performance.now(), dur = RM ? 50 : 12000; let lastTick = -1;
  await new Promise(res => {
    const f = now => {
      if (tok !== cjRun || !svg.isConnected) return res();
      const p = Math.min(1, (now - t0) / dur), m = p * 60;
      head.setAttribute("x1", X(m)); head.setAttribute("x2", X(m));
      const tick = Math.floor(m / cjEvery) * cjEvery;
      if (tick !== lastTick && tick < 60) {
        lastTick = tick;
        const active = jobs.filter(j => !j.end || j.end > tick).filter(j => j.start + D > tick && !j.killed);
        if (susp && tick >= 30) txt(notes, X(tick) + 3, 34, "suspend", "sv-s");
        else if (active.length && cjPol === "Forbid") txt(notes, X(tick) + 3, 34, "✕ bỏ qua", "sv-s").setAttribute("fill", "var(--bad)");
        else {
          if (active.length && cjPol === "Replace") active.forEach(j => { j.killed = tick; });
          jobs.push({ start: tick, row: row++ % 5, id: "rpt-" + (29000000 + tick) });
        }
      }
      jobs.forEach((j, i) => {
        const endM = j.killed !== undefined ? j.killed : j.start + D;
        let g = svg.querySelector("#cj" + i);
        if (!g) { g = el("g", { id: "cj" + i }, svg); el("rect", { x: X(j.start), y: 46 + j.row * 34, height: 26, width: 1, rx: 4, class: "an-c start" }, g); txt(g, X(j.start) + 6, 46 + j.row * 34 + 17, "Job " + (i + 1), "sv-s"); }
        const r = g.querySelector("rect"); r.setAttribute("width", Math.max(1, X(Math.min(m, endM)) - X(j.start)));
        if (m >= endM) r.setAttribute("class", "an-c " + (j.killed !== undefined ? "term" : "run"));
        const doneOk = jobs.filter(x => x.killed === undefined && x.start + D <= m);
        if (doneOk.length > 3 && doneOk.indexOf(j) > -1 && doneOk.indexOf(j) < doneOk.length - 3) g.setAttribute("opacity", .25);
      });
      if (p < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  if (tok !== cjRun) return;
  const overlap = D > cjEvery;
  cap.innerHTML = (!overlap ? "Job xong trước lần chạy sau nên ba chính sách giống nhau. Kéo thời gian chạy dài hơn " + cjEvery + " phút để thấy khác biệt. "
    : cjPol === "Allow" ? "<b>Allow</b>: Job mới chạy chồng lên Job cũ: tốn tài nguyên gấp đôi, dữ liệu có thể bị ghi đè. "
    : cjPol === "Forbid" ? "<b>Forbid</b>: tới giờ mà Job trước chưa xong thì bỏ qua lần đó (✕). "
    : "<b>Replace</b>: Job cũ bị dừng (đỏ) để chạy Job mới. ") + "Job mờ là Job thành công cũ bị xóa vì vượt successfulJobsHistoryLimit 3." + (susp ? " Từ phút 30 suspend: không tạo Job mới." : "");
}
let cronBase = new Date();
function cronNext(expr, n) {
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
      if (rng !== "*") { [a, b] = rng.includes("-") ? rng.split("-").map(Number) : [+rng, step > 1 ? hi : +rng]; }
      if ([a, b].some(v => isNaN(v) || v < lo || v > hi) || a > b) throw new Error("Giá trị ngoài khoảng: " + part);
      for (let v = a; v <= b; v += step) set.add(v);
    });
    return set;
  };
  const [mi, ho, dm, mo, dw] = f.map((s, i) => parse(s, R[i]));
  if (dw.has(7)) dw.add(0);
  const domStar = f[2] === "*", dowStar = f[4] === "*";
  const out = [], d = new Date(cronBase); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  for (let i = 0; i < 600000 && out.length < n; i++) {
    const dayOk = domStar && dowStar ? true : domStar ? dw.has(d.getDay()) : dowStar ? dm.has(d.getDate()) : dm.has(d.getDate()) || dw.has(d.getDay());
    if (mo.has(d.getMonth() + 1) && dayOk && ho.has(d.getHours()) && mi.has(d.getMinutes())) out.push(new Date(d));
    d.setMinutes(d.getMinutes() + 1);
  }
  return out;
}
function cronShow() {
  const v = $("#cronIn").value, box = $("#cronOut");
  try {
    const ts = cronNext(v, 5);
    const fmt = new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    box.innerHTML = '<div class="facts4">' + ts.map((t, i) => '<div class="ft' + (i ? "" : " ok") + '"><span>lần ' + (i + 1) + "</span><b>" + esc(fmt.format(t)) + "</b></div>").join("") + "</div>";
  } catch (e) { box.innerHTML = '<p class="small" style="color:var(--bad);margin:0">' + esc(e.message) + "</p>"; }
}
AFTER.jobs = sec => {
  const upd = () => { ["jc", "jp", "jb"].forEach(id => $("#" + id + "V").textContent = $("#" + id).value); $("#cdV").textContent = $("#cd").value; jYaml(); };
  sec.addEventListener("input", e => { if (e.target.id === "cronIn") cronShow(); else upd(); });
  sec.addEventListener("click", e => {
    const seg = (sel, attr, set) => { const b = e.target.closest("[" + attr + "]"); if (!b) return false; $$(sel + " button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); set(b.getAttribute(attr)); return true; };
    if (seg("#jMode", "data-jm", v => jMode = v) || seg("#jRp", "data-jr", v => { jRp = v; jYaml(); })) return;
    if (seg("#cjSch", "data-cs", v => cjEvery = +v) || seg("#cjPol", "data-cp", v => cjPol = v)) return;
    const c = e.target.closest("[data-cron]"); if (c) { $("#cronIn").value = c.dataset.cron; cronShow(); return; }
    if (e.target.closest("#jPlay")) jPlay();
    if (e.target.closest("#cjPlay")) cjPlay();
    const x = e.target.closest("[data-exgo]"); if (x) { exOpen = x.dataset.exgo; exDom = "all"; exQ = ""; show("ex"); }
  });
  upd(); cronShow(); jPlay(); cjPlay();
};

/* ---------- cheatsheet ---------- */
let chQ = "";
RENDER.cheat = () => '<header class="vh"><p class="eyebrow">Tra cứu · ' + CKAD.cheat.reduce((a, g) => a + g.rows.length, 0) + ' lệnh</p><h2>Cheatsheet lệnh CKAD</h2><p class="lead"><code>k</code> = kubectl, <code>$do</code> = <code>--dry-run=client -o yaml</code>, <code>$now</code> = <code>--force --grace-period=0</code>.</p></header>' +
  '<div class="panel col"><div class="formrow"><input type="search" id="chQ" placeholder="Tìm: secret, rollout, jsonpath, cronjob…" style="flex:1;min-width:220px" aria-label="Tìm lệnh"></div><div class="chips" id="chJump">' + CKAD.cheat.map((g, i) => '<button type="button" data-chg="' + i + '">' + esc(g.t) + "</button>").join("") + '</div><p class="small muted" style="margin:0">Lệnh tạo object (create, run) đã chạy thử bằng <code>--dry-run=client</code> với kubectl v1.34. Bấm một dòng để chép.</p></div>' +
  '<div class="cheat ck-cheatgrid" id="chBox"></div>';
function chRender() {
  const q = chQ.trim().toLowerCase();
  $("#chBox").innerHTML = CKAD.cheat.map((g, i) => {
    const rows = g.rows.filter(r => !q || (r[0] + " " + r[1] + " " + g.t).toLowerCase().includes(q));
    if (!rows.length) return "";
    return '<div class="panel" id="chg' + i + '"><h4>' + esc(g.t) + "</h4>" + rows.map(r => '<button type="button" class="ch-row" data-cp="' + esc(r[0]) + '"><code>' + esc(r[0]) + "</code><span>" + esc(r[1]) + "</span></button>").join("") + "</div>";
  }).join("") || '<p class="muted">Không có lệnh khớp.</p>';
}
AFTER.cheat = sec => {
  sec.addEventListener("input", e => { if (e.target.id === "chQ") { chQ = e.target.value; chRender(); } });
  sec.addEventListener("click", async e => {
    const g = e.target.closest("[data-chg]"); if (g) { const t = $("#chg" + g.dataset.chg); if (t) t.scrollIntoView({ block: "start", behavior: RM ? "auto" : "smooth" }); return; }
    const r = e.target.closest(".ch-row"); if (r) { try { await navigator.clipboard.writeText(r.dataset.cp); } catch (x) {} r.classList.add("copied"); setTimeout(() => r.classList.remove("copied"), 900); }
  });
  chRender();
};

/* ---------- khởi động ---------- */
buildRail(); progress();
show((location.hash || "").slice(1) || store.get("view", "overview"));
