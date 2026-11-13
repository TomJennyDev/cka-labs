"use strict";
/* ---------- trang CKAD: dữ liệu từ src/ckad/*.yaml (build.py nhúng vào biến CKAD) ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

/* Trang Bài tập CKAD: chỉ bài tập, sắp theo curriculum CKAD của Linux Foundation (cncf/curriculum).
   Lý thuyết của từng năng lực nằm ở learn.html; dữ liệu do build.py nhúng vào biến CKAD. */
const D = CKAD.domains, SRC = CKAD.sources, EX = CKAD.exercises, DM = Object.fromEntries(D.map(d => [d.id, d]));
const DCOL = { build: "var(--accent)", deploy: "var(--node)", obs: "var(--pkt)", env: "var(--data)", net: "var(--bad)" };
/* năng lực → module lý thuyết trong learn.html */
const HOME = { "build:0": "image", "build:1": "kinds", "build:2": "multi", "build:3": "volumes", "deploy:0": "workloads", "deploy:1": "workloads", "deploy:2": "best", "deploy:3": "best",
  "obs:0": "image", "obs:1": "probes", "obs:2": "obs", "obs:3": "obs", "obs:4": "trouble", "env:0": "ops", "env:1": "security", "env:2": "scale", "env:3": "perf", "env:4": "config", "env:5": "config",
  "env:6": "security", "env:7": "security", "net:0": "netpol", "net:1": "network", "net:2": "ingress" };
const LEARN_NAME = { image: "2.1 Container image & API", kinds: "2.2 Chọn loại workload", multi: "2.3 Pod nhiều container", jobs: "2.4 Job & CronJob", config: "2.5 ConfigMap & Secret", probes: "2.6 Probe & tự phục hồi", workloads: "2.7 Triển khai & cập nhật",
  perf: "3.2 Requests, limits & QoS", scale: "3.3 Scaling, quota & ước lượng node", network: "4.2 Service & EndpointSlice", netpol: "4.6 NetworkPolicy", ingress: "4.4 Ingress & IngressClass", volumes: "5.1 Volume trong Pod", pv: "5.2 PV, PVC & reclaim", storage: "5.3 StorageClass & CSI", security: "6.1 RBAC, ServiceAccount & securityContext",
  ops: "7.1 kubeadm, nâng cấp, etcd & HA", best: "7.2 Helm, Kustomize & best practice", trouble: "8.1 Lỗi Pod, node & control plane", obs: "8.3 Log, metric & cảnh báo" };
const theoryOf = (d, i) => HOME[d + ":" + i] || "ckadcur";
const theoryLink = (d, i) => { const m = theoryOf(d, i); return '<a class="ck-src" href="learn.html#' + m + '">Lý thuyết: ' + esc(LEARN_NAME[m] || m) + " ↗</a>"; };
function srcUrl(s) {
  const base = SRC[s[0]].url, br = { dgk: "main", bmc: "master", bmg: "master", k8sdocs: "main", helm: "main", curriculum: "main" }[s[0]];
  if (!s[1] || s[0] === "lfdocs") return base;
  return base + (/\.(md|mdx|pdf)$/.test(s[1]) ? "/blob/" : "/tree/") + br + "/" + s[1];
}
const srcChip = s => '<a class="ck-src" href="' + esc(srcUrl(s)) + '" target="_blank" rel="noopener" title="' + esc(SRC[s[0]].name + (s[1] ? " · " + s[1] : "")) + '">' + esc(SRC[s[0]].name.split("/").pop() + (s[1] ? " · " + s[1].split("/").pop().replace(/\.mdx?$/, "") : "")) + " ↗</a>";
const domPill = id => '<span class="ck-dom dom-' + id + '">' + esc(DM[id].vi) + "</span>";

/* ---------- điều hướng ---------- */
const MODS = [{ g: "Bài tập CKAD" }, { id: "overview", n: "00", t: "Đề cương & tiến độ" }];
D.forEach((d, i) => MODS.push({ id: d.id, n: "0" + (i + 1), t: d.vi + " · " + d.w + "%" }));
MODS.push({ g: "Luyện tổng hợp" }, { id: "ex", n: "06", t: "Tất cả bài (" + EX.length + ")" }, { id: "mock", n: "07", t: "Thi thử 2 giờ" }, { g: "Tham khảo" }, { id: "src", n: "08", t: "Nguồn bài tập" });
let current = "overview";
const built = {};
function buildRail() {
  $("#rail").innerHTML = MODS.map(m => m.g ? '<li class="grp">' + esc(m.g) + "</li>" : '<li><a href="#' + m.id + '" data-go="' + m.id + '"><span class="n">' + m.n + "</span><span>" + esc(m.t) + "</span></a></li>").join("");
  $("#main").innerHTML = MODS.filter(m => m.id).map(m => '<section class="view" data-view="' + m.id + '" hidden></section>').join("");
}
function show(name) {
  const xm = /^ex-(.+)$/.exec(name), xe = xm && EX.find(e => e.id === xm[1]);
  if (xe) { exOpen = xe.id; name = xe.d; }
  if (!MODS.some(m => m.id === name)) name = "overview";
  current = name;
  $$(".view").forEach(v => v.hidden = v.dataset.view !== name);
  $$(".rail a").forEach(a => a.setAttribute("aria-current", a.dataset.go === name ? "page" : "false"));
  const sec = $('.view[data-view="' + name + '"]');
  if (!built[name]) { built[name] = 1; sec.innerHTML = RENDER[name] ? RENDER[name]() : domainHTML(name); addCopies(sec); if (AFTER[name]) AFTER[name](sec); else if (DM[name]) domainAfter(sec, name); }
  else if (ON[name]) ON[name](sec); else if (DM[name]) domainOn(sec);
  try { history.replaceState(null, "", "#" + (xe ? "ex-" + xe.id : name)); } catch (e) {}
  window.scrollTo(0, 0);
  if (xe) openEx(sec, xe.id);
  const act = $('.rail a[data-go="' + name + '"]'); if (act && innerWidth < 1024) act.scrollIntoView({ block: "nearest", inline: "center" });
  store.set("view", name);
}
document.addEventListener("click", e => { const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); show(a.dataset.go); } });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h && h !== current) show(h); });
const RENDER = {}, AFTER = {}, ON = {};
function openEx(root, id) { const t = $("#" + (root.dataset.view === "ex" ? "ex-" : "dx-") + id, root); if (t) { t.open = true; setTimeout(() => t.scrollIntoView({ block: "start" }), 40); } exOpen = null; }

/* ---------- 00 đề cương ---------- */
RENDER.overview = () => {
  const d0 = done();
  return '<header class="vh"><p class="eyebrow">Bài tập CKAD · Kubernetes v1.37 · curriculum CNCF</p><h2>Bài tập theo đề cương CKAD</h2><p class="lead">' + EX.length + " bài viết theo giọng đề thi, xếp đúng 5 domain và từng năng lực của Linux Foundation. Lời giải có lệnh tự kiểm tra; hầu hết đã chạy thử trên cluster.</p></header>" +
    '<div class="panel col">' + tl(["Chọn một domain, làm lần lượt các bài dưới từng năng lực. Chưa nắm thì bấm <b>Lý thuyết</b> để sang trang Lý thuyết.", "Làm xong thì chạy <b>lệnh kiểm tra</b> rồi tick <b>Đã làm xong</b>; tiến độ lưu trong trình duyệt này.", "Cuối cùng làm <a href=\"#mock\" data-go=\"mock\">đề thi thử 2 giờ</a> bốc 15 task theo tỉ trọng. Thông tin kỳ thi, mẹo làm bài: <a href=\"learn.html#exam\">Lý thuyết 0.2</a>; cheatsheet: <a href=\"learn.html#commands\">Lý thuyết R.2</a>; gõ ít khi thi: <a href=\"learn.html#fast\">Lý thuyết R.3</a>."]) + "</div>" +
    '<div class="panel col"><h4>5 domain, tỉ trọng và tiến độ</h4><div class="ck-bars" id="ckBars">' +
    D.map(d => { const xs = EX.filter(e => e.d === d.id), n = xs.filter(e => d0[e.id]).length;
      return '<button type="button" class="ck-bar" data-go="' + d.id + '"><span class="lab"><b>' + esc(d.vi) + "</b><small>" + esc(d.t) + " · " + d.topics.length + " năng lực · " + n + "/" + xs.length + ' bài đã làm</small><span class="track"><i style="background:' + DCOL[d.id] + '" data-w="' + (xs.length ? n / xs.length * 100 : 0) + '"></i></span></span><span class="w">' + d.w + '%</span><span class="m">≈ ' + Math.round(d.w * 1.2) + " phút</span></button>"; }).join("") + "</div>" +
    '<p class="small muted" style="margin:0">Thanh màu là phần bài đã làm của domain. Phút gợi ý = tỉ trọng × 120 phút.</p></div>' +
    '<div class="panel col"><h4>Năng lực và số bài</h4><div class="tbl"><table><thead><tr><th>Năng lực (cncf/curriculum)</th><th>Bài</th></tr></thead><tbody>' +
    D.map(d => '<tr><td colspan="2">' + domPill(d.id) + " <b>" + d.w + "%</b></td></tr>" + d.topics.map((t, i) => { const xs = EX.filter(e => e.d === d.id && e.tp === i); return "<tr><td>" + esc(t.t) + '<br><span class="small muted">' + esc(t.vi) + '</span></td><td><button type="button" class="pill cp" data-go="' + d.id + '">' + xs.length + " bài</button></td></tr>"; }).join("")).join("") + "</tbody></table></div></div>";
};
AFTER.overview = ON.overview = sec => {
  if (ON.overview.stale) { sec.innerHTML = RENDER.overview(); ON.overview.stale = 0; }
  $$("#ckBars i", sec).forEach(i => { i.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = i.dataset.w + "%"; })); });
};

/* ---------- 01–05 domain: năng lực → bài tập ---------- */
function domainHTML(id) {
  const d = DM[id], exs = EX.filter(e => e.d === id);
  return '<header class="vh"><p class="eyebrow">Domain · ' + d.w + "% điểm · ≈ " + Math.round(d.w * 1.2) + " phút · " + exs.length + " bài</p><h2>" + esc(d.vi) + '</h2><p class="lead">' + esc(d.t) + '</p></header><div class="ck-prog"><span data-dprog></span><span class="meter"><i data-dbar></i></span></div>' +
    d.topics.map((t, i) => {
      const tex = exs.filter(e => e.tp === i);
      return '<section class="panel col ck-comp"><div class="ck-comp-h"><span class="ck-dom dom-' + id + '">' + (i + 1) + '</span><div><b>' + esc(t.t) + '</b><span class="small muted">' + esc(t.vi) + "</span></div></div>" +
        '<div class="ck-links">' + theoryLink(id, i) + "</div>" +
        (tex.length ? '<div class="col" style="gap:10px">' + tex.map(e => exItem(e, false, "dx-")).join("") + "</div>" : '<p class="small muted" style="margin:0">Chưa có bài riêng cho năng lực này: ôn ở phần lý thuyết.</p>') + "</section>";
    }).join("");
}
function domainProg(sec, id) { const d = done(), xs = EX.filter(e => e.d === id), n = xs.filter(e => d[e.id]).length; $("[data-dprog]", sec).textContent = n + "/" + xs.length + " bài đã làm"; $("[data-dbar]", sec).style.width = (xs.length ? n / xs.length * 100 : 0) + "%"; }
function domainAfter(sec, id) { exWire(sec, () => domainProg(sec, id)); domainProg(sec, id); }
function domainOn(sec) { domainProg(sec, sec.dataset.view); }

/* ---------- bài tập ---------- */
let exDom = "all", exState = "all", exQ = "", exOpen = null;
const done = () => store.get("done", {});
function progress() { const d = done(), n = EX.filter(e => d[e.id]).length; $("#progTxt").textContent = n + "/" + EX.length + " bài"; $("#progBar").style.width = (n / EX.length * 100) + "%"; if (ON.overview) ON.overview.stale = 1; }
RENDER.ex = () => '<header class="vh"><p class="eyebrow">Luyện tổng hợp · ' + EX.length + ' bài</p><h2>Tất cả bài tập CKAD</h2><p class="lead">Lọc theo domain, trạng thái hoặc từ khóa. Mỗi bài ghi nguồn chủ đề.</p></header>' +
  '<div class="panel col"><div class="chips" id="exDoms"><button type="button" data-ed="all">Tất cả · ' + EX.length + "</button>" + D.map(d => '<button type="button" data-ed="' + d.id + '">' + esc(d.vi) + " · " + EX.filter(e => e.d === d.id).length + "</button>").join("") + '</div>' +
  '<div class="formrow"><div class="seg" role="group" id="exStates"><button type="button" data-es="all">Tất cả</button><button type="button" data-es="todo">Chưa làm</button><button type="button" data-es="done">Đã làm</button></div><input type="search" id="exQ" placeholder="Tìm: job, secret, ingress…" style="flex:1;min-width:200px" aria-label="Tìm bài"></div>' +
  '<div class="ck-prog"><span id="exCount"></span><span class="meter"><i id="exBar"></i></span></div></div><div class="col" id="exList" style="gap:10px"></div>';
function exItem(e, open, pre) {
  const pill = pre === "dx-" ? "" : domPill(e.d);
  const d = done()[e.id], tested = e.test !== false, t = DM[e.d].topics[e.tp];
  return '<details class="ck-ex' + (d ? " done" : "") + '" id="' + (pre || "ex-") + e.id + '"' + (open ? " open" : "") + '><summary>' + pill + '<span class="t">' + esc(e.title) + '</span><span class="mins">' + e.mins + " phút</span></summary><div class=\"body\">" +
    '<div class="task">' + esc(e.task.trim()) + "</div>" +
    '<div class="controls" style="margin:0"><button type="button" class="btn" data-hint>Gợi ý</button><label class="check"><input type="checkbox" data-done="' + e.id + '"' + (d ? " checked" : "") + '> Đã làm xong</label>' +
    (tested ? '<span class="ck-badge ok" title="tools/check_ckad.py">lời giải đã chạy thử trên cluster</span>' : '<span class="ck-badge no">cần podman/Helm: chưa chạy tự động</span>') + "</div>" +
    '<div class="hint" hidden data-hintbox>' + esc(e.hint) + "</div>" +
    det("Lời giải", code(e.sol)) + det("Lệnh kiểm tra", code(e.check)) +
    '<div class="ck-links"><span class="small muted">Năng lực: ' + esc(t.t) + "</span>" + theoryLink(e.d, e.tp) + e.src.map(srcChip).join("") + "</div></div></details>";
}
function exWire(sec, after) {
  sec.addEventListener("click", e => { const h = e.target.closest("[data-hint]"); if (h) { const x = $("[data-hintbox]", h.closest(".body")); x.hidden = !x.hidden; } });
  sec.addEventListener("change", e => {
    const c = e.target.closest("[data-done]"); if (!c) return;
    const d = done(); if (c.checked) d[c.dataset.done] = 1; else delete d[c.dataset.done]; store.set("done", d);
    $$('[data-done="' + c.dataset.done + '"]').forEach(x => { x.checked = c.checked; x.closest(".ck-ex").classList.toggle("done", c.checked); });
    progress(); if (after) after();
  });
}
function exRender() {
  const q = exQ.trim().toLowerCase(), d = done();
  const list = EX.filter(e => (exDom === "all" || e.d === exDom) && (exState === "all" || (exState === "done") === !!d[e.id]) && (!q || (e.title + " " + e.task + " " + e.sol).toLowerCase().includes(q)));
  $("#exList").innerHTML = list.length ? list.map(e => exItem(e, e.id === exOpen)).join("") : '<p class="muted">Không có bài khớp.</p>';
  $$("#exDoms button").forEach(b => b.setAttribute("aria-pressed", b.dataset.ed === exDom ? "true" : "false"));
  $$("#exStates button").forEach(b => b.setAttribute("aria-pressed", b.dataset.es === exState ? "true" : "false"));
  exCount(); addCopies($("#exList"));
}
function exCount() { const d = done(), n = EX.filter(e => d[e.id]).length; $("#exCount").textContent = n + "/" + EX.length + " bài đã làm"; $("#exBar").style.width = (n / EX.length * 100) + "%"; }
AFTER.ex = sec => {
  $("#exQ").value = exQ;
  sec.addEventListener("click", e => {
    const a = e.target.closest("[data-ed]"); if (a) { exDom = a.dataset.ed; exRender(); return; }
    const s = e.target.closest("[data-es]"); if (s) { exState = s.dataset.es; exRender(); return; }
  });
  exWire(sec, exCount);
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

/* ---------- nguồn ---------- */
RENDER.src = () => {
  const cnt = k => EX.filter(e => e.src.some(s => s[0] === k)).length + D.reduce((a, d) => a + d.topics.filter(t => (t.src || []).some(s => s[0] === k)).length, 0);
  return '<header class="vh"><p class="eyebrow">Tham khảo</p><h2>Nguồn bài tập</h2><p class="lead">Chỉ dùng repo chính thức hoặc được cộng đồng dùng rộng rãi. Bài tập được viết lại bằng tiếng Việt, không chép nguyên văn.</p></header>' +
    '<div class="panel col">' + tl(["<b>Danh sách domain và tỉ trọng</b> lấy từ curriculum chính thức của CNCF.", "<b>Lời giải</b> được chạy thử tự động trên cluster k3s v1.34 bằng <code>tools/check_ckad.py</code>, trừ bài cần podman hoặc Helm.", "Mỗi mục và mỗi bài ghi rõ repo đã gợi ý chủ đề đó."]) + "</div>" +
    '<div class="ck-topics">' + Object.entries(SRC).map(([k, s]) => '<article class="ck-topic"><a href="' + esc(s.url) + '" target="_blank" rel="noopener" class="vi">' + esc(s.name) + " ↗</a><span>" + esc(s.note) + '</span><div class="ck-links"><span class="ck-badge no">' + esc(s.license) + "</span>" + (cnt(k) ? '<span class="ck-badge ok">dẫn ở ' + cnt(k) + " chỗ</span>" : "") + "</div></article>").join("") + "</div>";
};

/* ---------- khởi động ---------- */
buildRail(); progress();
show((location.hash || "").slice(1) || store.get("view", "overview"));
