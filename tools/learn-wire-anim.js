/* ---------- Giao tiếp & mã hóa: phần animation ---------- */
/* Bản đồ kết nối vẽ tay (gói tin chạy trên từng kết nối), sơ đồ tuần tự phát từng bước,
   animation đóng gói / gửi / mở gói, và hành trình của một Secret. build.py chèn trước learn-wire.js. */

const WM_W = 1000, WM_H = 560;
const WM_BOX = [
  { id: "kc", x: 20, y: 30, w: 130, h: 50, t: "kubectl / CI", cls: "sv-box", c: "kubectl" },
  { id: "ext", x: 20, y: 500, w: 130, h: 56, t: "Client Internet", cls: "sv-box", c: "edge" },
  { id: "ctrl", x: 260, y: 110, w: 140, h: 56, t: "controller-mgr", sub: "scheduler", cls: "sv-cp", c: "ctrl" },
  { id: "api", x: 450, y: 80, w: 170, h: 64, t: "kube-apiserver", sub: ":6443", cls: "sv-cp", c: "kubectl" },
  { id: "etcd", x: 680, y: 80, w: 120, h: 64, t: "etcd", sub: ":2379", cls: "sv-data", c: "etcd" },
  { id: "etcd2", x: 850, y: 80, w: 115, h: 64, t: "etcd khác", sub: ":2380", cls: "sv-data", c: "raft" },
  { id: "kl", x: 40, y: 260, w: 140, h: 56, t: "kubelet", sub: ":10250", cls: "sv-node", c: "kubelet" },
  { id: "cr", x: 240, y: 260, w: 140, h: 56, t: "containerd", sub: "CRI socket", cls: "sv-node", c: "cri" },
  { id: "cni", x: 440, y: 260, w: 120, h: 56, t: "CNI plugin", sub: "/opt/cni/bin", cls: "sv-node", c: "cni" },
  { id: "kp", x: 40, y: 360, w: 140, h: 56, t: "kube-proxy", sub: "iptables / nft", cls: "sv-node", c: "svc" },
  { id: "pa", x: 260, y: 360, w: 120, h: 56, t: "Pod A", sub: "10.244.1.12", cls: "sv-pkt", c: "pod" },
  { id: "wh", x: 720, y: 230, w: 160, h: 50, t: "Webhook", sub: "metrics-server", cls: "sv-box", c: "hook" },
  { id: "reg", x: 720, y: 300, w: 160, h: 50, t: "Registry", sub: ":443", cls: "sv-box", c: "reg" },
  { id: "dns", x: 720, y: 370, w: 160, h: 50, t: "CoreDNS", sub: "10.96.0.10:53", cls: "sv-box", c: "dns" },
  { id: "gw", x: 500, y: 503, w: 130, h: 50, t: "Gateway", sub: "kết thúc TLS", cls: "sv-box", c: "edge" },
  { id: "pb", x: 720, y: 503, w: 160, h: 50, t: "Pod B", sub: "node khác", cls: "sv-pkt", c: "pod" }
];
/* đường đi (SVG path), vị trí số, hai chiều? */
const WM_EDGE = {
  kubectl: ["M150 55 H535 V80", [330, 55]],
  etcd: ["M620 112 H680", [650, 112]],
  raft: ["M800 112 H850", [825, 112], 1],
  ctrl: ["M400 130 H450", [425, 130]],
  kubelet: ["M100 260 V200 H500 V144", [300, 200]],
  exec: ["M560 144 V215 H130 V260", [360, 215]],
  cri: ["M180 288 H240", [210, 288]],
  cni: ["M380 288 H440", [410, 288]],
  reg: ["M310 316 V338 H660 V325 H720", [520, 338]],
  sa: ["M380 372 H600 V144", [600, 250]],
  dns: ["M380 395 H720", [540, 395]],
  pod: ["M320 416 V470 H700 V515 H720", [520, 470], 1],
  svc: ["M180 388 H260", [220, 388]],
  hook: ["M620 130 H660 V255 H720", [660, 195]],
  edge: ["M150 530 H720", [320, 530]]
};
const WM_PCLS = { ok: "enc", bad: "plain", warn: "loc" };
const WM_TOUR = [
  ["kubectl", 0, "kubectl gửi POST Deployment tới apiserver qua TLS. Danh tính: client certificate trong kubeconfig."],
  ["hook", 0, "Nếu có admission webhook, apiserver gửi AdmissionReview qua HTTPS và chờ allowed: true."],
  ["etcd", 0, "apiserver ghi Deployment vào etcd bằng gRPC Txn qua mTLS (protobuf k8s\\0)."],
  ["raft", 0, "etcd leader nhân bản entry sang member khác qua Raft; đa số xác nhận thì mới trả lời apiserver."],
  ["kubectl", 1, "apiserver trả 201 Created cho kubectl."],
  ["ctrl", 1, "controller-manager nhận sự kiện ADDED qua watch, tạo ReplicaSet rồi Pod (POST qua cùng kết nối mTLS)."],
  ["ctrl", 0, "scheduler thấy Pod chưa có node, chọn node01 và POST binding."],
  ["kubelet", 1, "kubelet trên node01 nhận Pod qua watch của chính nó (mTLS, cert system:node:node01)."],
  ["cri", 0, "kubelet gọi RunPodSandbox qua gRPC trên unix socket, không mã hóa nhưng không ra mạng."],
  ["cni", 0, "containerd chạy CNI plugin với CNI_COMMAND=ADD; plugin trả JSON có IP 10.244.1.12."],
  ["reg", 0, "containerd kéo image qua HTTPS và kiểm sha256 từng layer."],
  ["kubelet", 0, "kubelet PATCH status Pod: Running, IP Pod. Endpoint được thêm vào Service."],
  ["svc", 0, "kube-proxy thấy EndpointSlice mới và cập nhật rule DNAT trên mọi node."],
  ["dns", 0, "Pod khác hỏi CoreDNS tên Service qua UDP 53, dạng rõ."],
  ["pod", 0, "Gói tới IP Pod ở node khác đi qua VXLAN: mặc định không mã hóa, ai bắt gói trên dây cũng đọc được."]
];

let wmTok = 0, wmTourOn = false;
function wmPkt(svg, path, o) {
  return new Promise(res => {
    if (RM || !svg.isConnected) { res(); return; }
    const L = path.getTotalLength(), dur = o.dur || Math.max(700, Math.min(1700, L * 2.6));
    const g = el("g", { class: "wpk " + o.cls }, svg);
    el("rect", { x: -10, y: -7, width: 20, height: 14, rx: 3 }, g);
    if (o.cls === "enc") el("path", { d: "M-3.5 -1 v-2 a3.5 3.5 0 0 1 7 0 v2 M-5 -1 h10 v6 h-10z", class: "wlk" }, g);
    else el("path", { d: "M-6 -3 h12 M-6 0 h12 M-6 3 h8", class: "wln" }, g);
    const t0 = performance.now();
    const f = t => {
      if (!g.isConnected) { res(); return; }
      const p = ease(Math.min(1, (t - t0) / dur));
      const pt = path.getPointAtLength((o.rev ? 1 - p : p) * L);
      g.setAttribute("transform", "translate(" + pt.x + " " + pt.y + ")");
      if (o.switchAt && (o.rev ? 1 - p : p) > o.switchAt && !g.dataset.sw) { g.dataset.sw = 1; g.setAttribute("class", "wpk plain"); g.querySelector("path").setAttribute("d", "M-6 -3 h12 M-6 0 h12 M-6 3 h8"); g.querySelector("path").setAttribute("class", "wln"); }
      if (p < 1) requestAnimationFrame(f); else { g.remove(); res(); }
    };
    requestAnimationFrame(f);
  });
}
function wmBuild(host) {
  host.innerHTML = "";
  const svg = el("svg", { viewBox: "0 0 " + WM_W + " " + WM_H, role: "img", "aria-label": "Bản đồ 15 kết nối trong cluster" }, host);
  const defs = el("defs", null, svg);
  const mk = el("marker", { id: "wmA", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
  el("path", { d: "M0 0 L10 5 L0 10z", class: "wm-arrow" }, mk);
  el("rect", { x: 240, y: 10, width: 740, height: 185, rx: 12, class: "sv-zonefill" }, svg);
  txt(svg, 256, 32, "CONTROL PLANE", "sv-lbl");
  el("rect", { x: 20, y: 225, width: 640, height: 225, rx: 12, class: "sv-zonefill" }, svg);
  txt(svg, 36, 248, "MỖI NODE", "sv-lbl");
  const eg = el("g", null, svg);
  WIRE_CONNS.forEach(c => {
    const e = WM_EDGE[c.id];
    const p = el("path", { d: e[0], class: "sv-wire wm-e", id: "wmE-" + c.id, "marker-end": "url(#wmA)" }, eg);
    if (e[2]) p.setAttribute("marker-start", "url(#wmA)");
    if (c.id === "svc") p.setAttribute("stroke-dasharray", "5 4");
    const hit = el("path", { d: e[0], class: "wm-hit", "data-conn": c.id }, eg);
    hit.appendChild(document.createElementNS(SVGNS, "title")).textContent = c.n + ". " + c.t;
  });
  WM_BOX.forEach(b => { const g = box(svg, b); g.classList.add("comp"); g.setAttribute("data-conn", b.c); g.id = "wmB-" + b.id; });
  WIRE_CONNS.forEach(c => {
    const e = WM_EDGE[c.id], g = el("g", { class: "wm-n", "data-conn": c.id, id: "wmN-" + c.id, tabindex: 0, role: "button", "aria-label": c.n + ". " + c.t }, svg);
    el("circle", { cx: e[1][0], cy: e[1][1], r: 11 }, g);
    txt(g, e[1][0], e[1][1] + 4, String(c.n), "wm-nt", "middle");
  });
  el("g", { id: "wmPk" }, svg);
  return svg;
}
function wmSelect(id) {
  $$(".wm-e").forEach(p => p.classList.toggle("on", p.id === "wmE-" + id));
  $$(".wm-n").forEach(g => g.classList.toggle("on", g.id === "wmN-" + id));
  const c = WIRE_CONNS.find(x => x.id === id);
  const ends = { kubectl: ["kc", "api"], etcd: ["api", "etcd"], raft: ["etcd", "etcd2"], ctrl: ["ctrl", "api"], kubelet: ["kl", "api"], exec: ["api", "kl"], cri: ["kl", "cr"], cni: ["cr", "cni"], reg: ["cr", "reg"], sa: ["pa", "api"], dns: ["pa", "dns"], pod: ["pa", "pb"], svc: ["kp", "pa"], hook: ["api", "wh"], edge: ["ext", "pb"] }[id] || [];
  $$("#wmStage .comp").forEach(g => g.classList.toggle("lit", ends.includes(g.id.slice(4)) || (id === "edge" && g.id === "wmB-gw")));
  return c;
}
async function wmLoop(id) {
  const tok = ++wmTok;
  const c = wmSelect(id);
  const svg = $("#wmStage svg"); if (!svg || !c) return;
  const path = $("#wmE-" + id), layer = $("#wmPk");
  while (tok === wmTok && svg.isConnected && current === "wire" && wireCur === "map" && !RM) {
    const cls = WM_PCLS[c.cr[0]];
    await wmPkt(layer, path, { cls, switchAt: id === "edge" ? .62 : 0 });
    if (tok !== wmTok) return;
    await wmPkt(layer, path, { cls: id === "edge" ? "plain" : cls, rev: 1, switchAt: 0 });
    await sleep(350);
  }
}
async function wmTour() {
  if (wmTourOn) { wmTourOn = false; wmTok++; $("#wmTour").textContent = "▶ Hành trình một lệnh kubectl"; return; }
  wmTourOn = true; const tok = ++wmTok;
  $("#wmTour").textContent = "■ Dừng";
  const svg = $("#wmStage svg"), layer = $("#wmPk");
  for (let i = 0; i < WM_TOUR.length; i++) {
    if (tok !== wmTok || !svg.isConnected) break;
    const [id, rev, cap] = WM_TOUR[i]; const c = wmSelect(id);
    $("#wmCap").innerHTML = '<span class="stepnum">BƯỚC ' + (i + 1) + "/" + WM_TOUR.length + " · KẾT NỐI " + W_CIRC[c.n - 1] + "</span><br>" + kEsc(cap);
    await wmPkt(layer, $("#wmE-" + id), { cls: WM_PCLS[c.cr[0]], rev, dur: 1300 });
    await sleep(RM ? 900 : 700);
  }
  if (tok === wmTok) { wmTourOn = false; $("#wmTour").textContent = "▶ Hành trình một lệnh kubectl"; wmLoop(wireConn); }
}

/* ---------- sơ đồ tuần tự phát từng bước ---------- */
/* step: [từ, tới, nhãn, mã hóa?]  ·  ["note", từ, tới, nhãn]  ·  ["self", actor, nhãn] */
function seqStage(host, actors, steps, W) {
  W = W || 760;
  const xs = actors.map((_, i) => actors.length === 2 ? [170, W - 170][i] : 110 + i * ((W - 220) / (actors.length - 1)));
  const H = 92 + steps.length * 46;
  host.innerHTML = '<div class="stage sm seq"></div><div class="controls" style="margin-top:10px"><button class="btn primary" type="button" data-sq="play">▶ Phát</button><button class="btn" type="button" data-sq="next">Từng bước ›</button><button class="btn" type="button" data-sq="all">Hiện hết</button><span class="hint" data-sq="cap"></span></div>';
  const svg = el("svg", { viewBox: "0 0 " + W + " " + H }, host.firstChild);
  actors.forEach((a, i) => {
    el("line", { x1: xs[i], y1: 58, x2: xs[i], y2: H - 10, class: "sv-life" }, svg);
    box(svg, { x: xs[i] - 92, y: 10, w: 184, h: 44, t: a, cls: "sv-cp", tcls: "sv-t" });
  });
  const gs = steps.map((s, i) => {
    const y = 92 + i * 46, g = el("g", { class: "sq-s", opacity: 0 }, svg);
    if (s[0] === "note" || s[0] === "self") {
      const a = s[0] === "note" ? Math.min(xs[s[1]], xs[s[2]]) : xs[s[1]], b = s[0] === "note" ? Math.max(xs[s[1]], xs[s[2]]) : xs[s[1]];
      const lab = s[0] === "note" ? s[3] : s[2];
      const w = Math.max(b - a + 60, Math.min(W - 20, lab.length * 6.6 + 24)), x = Math.max(10, Math.min(W - 10 - w, (a + b) / 2 - w / 2));
      el("rect", { x, y: y - 16, width: w, height: 26, rx: 5, class: s[0] === "note" ? "sq-note key" : "sq-note" }, g);
      txt(g, x + w / 2, y + 1, lab, "sq-nt", "middle");
    } else {
      const x1 = xs[s[0]], x2 = xs[s[1]];
      el("line", { x1, y1: y, x2: x2 + (x2 > x1 ? -4 : 4), y2: y, class: "sq-l" + (s[3] ? " enc" : ""), "marker-end": "url(#sqA" + (s[3] ? "e" : "") + ")" }, g);
      const t = txt(g, (x1 + x2) / 2, y - 8, (s[3] ? "🔒 " : "") + s[2], "sq-t" + (s[3] ? " enc" : ""), "middle");
      g.dataset.x1 = x1; g.dataset.x2 = x2; g.dataset.y = y; g.dataset.e = s[3] ? 1 : 0;
    }
    return g;
  });
  const defs = el("defs", null, svg);
  [["sqA", "sq-ar"], ["sqAe", "sq-ar enc"]].forEach(([id, cls]) => { const m = el("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, defs); el("path", { d: "M0 0 L10 5 L0 10z", class: cls }, m); });
  let i = 0, playing = false;
  const cap = host.querySelector('[data-sq="cap"]');
  const showStep = async (k, anim) => {
    const g = gs[k];
    if (anim && g.dataset.x1 && !RM) {
      const p = el("path", { d: "M" + g.dataset.x1 + " " + g.dataset.y + " H" + g.dataset.x2 }, svg); p.setAttribute("visibility", "hidden");
      await wmPkt(svg, p, { cls: g.dataset.e === "1" ? "enc" : "plain", dur: 750 }); p.remove();
    }
    g.setAttribute("opacity", 1); g.classList.add("fade-in");
    cap.textContent = "Bước " + (k + 1) + "/" + gs.length;
  };
  const reset = () => { gs.forEach(g => g.setAttribute("opacity", 0)); i = 0; cap.textContent = ""; };
  host.addEventListener("click", async e => {
    const b = e.target.closest("[data-sq]"); if (!b || !b.dataset.sq) return;
    const a = b.dataset.sq;
    if (a === "next") { if (i >= gs.length) reset(); await showStep(i++, true); }
    else if (a === "all") { playing = false; gs.forEach(g => g.setAttribute("opacity", 1)); i = gs.length; cap.textContent = ""; }
    else if (a === "play") {
      if (playing) { playing = false; return; }
      playing = true; reset(); b.textContent = "■ Dừng";
      while (playing && i < gs.length && svg.isConnected) { await showStep(i++, true); await sleep(380); }
      playing = false; b.textContent = "▶ Phát";
    }
  });
  gs.forEach(g => g.setAttribute("opacity", 1));
  i = gs.length;
}
const SEQ_TLS = [["kubelet (client)", "kube-apiserver :6443"], [
  [0, 1, "ClientHello: TLS 1.3, cipher, key_share (ECDHE), SNI", 0],
  [1, 0, "ServerHello: chọn cipher, key_share", 0],
  ["note", 0, 1, "Hai bên tính ra cùng khóa phiên từ ECDHE. Từ đây mọi thứ đã mã hóa"],
  [1, 0, "CertificateRequest: xin cert của client", 1],
  [1, 0, "Certificate apiserver.crt + CertificateVerify + Finished", 1],
  ["self", 0, "kiểm bằng ca.crt: chữ ký, SAN có địa chỉ đã gọi, còn hạn"],
  [0, 1, "Certificate kubelet-client-current.pem + CertificateVerify + Finished", 1],
  ["self", 1, "kiểm bằng --client-ca-file → user system:node:node01"],
  [0, 1, "HTTP/2: PUT lease, watch Pod (AES-GCM)", 1],
  ["self", 1, "authz (Node, RBAC) → admission → etcd"]
]];
const SEQ_BOOT = [["node04 (join, kubelet)", "kube-apiserver", "controller-manager"], [
  [0, 1, "GET cluster-info (kube-public, ẩn danh)", 0],
  [1, 0, "CA + chữ ký JWS bằng token", 0],
  ["self", 0, "kiểm JWS; hash khóa CA khớp --discovery-token-ca-cert-hash"],
  ["note", 0, 1, "Từ đây node04 tin CA: TLS kiểm được cert server"],
  [0, 1, "Bearer abcdef.…: tạo CSR, CN system:node:node04", 1],
  [1, 2, "watch: có CSR mới", 1],
  ["self", 2, "csrapproving duyệt, csrsigning ký bằng ca.key"],
  [2, 1, "ghi status.certificate", 1],
  [1, 0, "cert đã ký", 1],
  ["self", 0, "ghi kubelet-client-current.pem và kubelet.conf"],
  [0, 1, "mọi request sau: mTLS bằng cert của chính node", 1]
]];

/* ---------- đóng gói → gửi → mở gói ---------- */
let pkBusy = false;
async function pkPlay(sc, layers) {
  if (pkBusy) return; pkBusy = true;
  const btn = $("#pkPlay"); if (btn) btn.disabled = true;
  const segs = $$(".pk-bar button"), rows = $$(".pk-row"), eaves = wireEye === 0;
  const encIdx = layers.map((l, i) => l[5] ? i : -1).filter(i => i >= 0);
  const wrapAt = encIdx.length ? Math.min(...encIdx) - 1 : -1;
  const say = t => { const c = $("#pkCap"); if (c) c.innerHTML = t; };
  const svg = $("#pkStage svg");
  const lit = i => { rows.forEach(r => r.classList.remove("hl")); if (rows[i]) rows[i].classList.add("hl"); };
  segs.forEach(s => { s.classList.add("pk-off"); s.classList.remove("enc"); });
  rows.forEach(r => r.classList.add("pk-dim"));
  say("<b>1 · Đóng gói ở " + kEsc(sc.from) + ":</b> mỗi tầng bọc thêm header ra ngoài tầng bên trong.");
  for (let i = layers.length - 1; i >= 0; i--) {
    if (!svg || !svg.isConnected) break;
    segs[i].classList.remove("pk-off"); rows[i].classList.remove("pk-dim"); lit(i);
    if (i === wrapAt && eaves) { await sleep(300); say("<b>Mã hóa:</b> " + kEsc(layers[i][1]) + " mã hóa toàn bộ phần bên trong bằng khóa phiên."); encIdx.forEach(k => { segs[k].classList.add("enc", "pk-flash"); rows[k].classList.add("enc"); }); await sleep(700); }
    await sleep(RM ? 40 : 420);
  }
  if (svg && svg.isConnected && !RM) {
    say("<b>2 · Trên dây:</b> người bắt gói thấy " + kEsc(sc.see.charAt(0).toLowerCase() + sc.see.slice(1)));
    const g = $("#pkMove"), eye = $("#pkEye");
    g.setAttribute("opacity", 1);
    const t0 = performance.now(), dur = 2200;
    await new Promise(res => { const f = t => { const p = Math.min(1, (t - t0) / dur); g.setAttribute("transform", "translate(" + (140 + ease(p) * 420) + " 0)"); if (eye) eye.classList.toggle("on", p > .35 && p < .75); if (p < 1 && g.isConnected) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    if (eye) eye.classList.remove("on");
    g.setAttribute("opacity", 0);
  }
  say("<b>3 · Mở gói ở " + kEsc(sc.to) + ":</b> bỏ từng header từ ngoài vào, giải mã khi tới tầng mã hóa.");
  for (let i = 0; i < layers.length - 1; i++) {
    if (!svg || !svg.isConnected) break;
    lit(i); await sleep(RM ? 40 : 360);
    segs[i].classList.add("pk-off");
    if (i === wrapAt) encIdx.forEach(k => segs[k].classList.remove("enc"));
  }
  lit(layers.length - 1);
  say("<b>Xong:</b> " + kEsc(sc.to) + " nhận được " + kEsc(layers[layers.length - 1][1]) + " nguyên vẹn.");
  await sleep(RM ? 100 : 1600);
  segs.forEach((s, i) => { s.classList.remove("pk-off", "pk-flash"); s.classList.toggle("enc", eaves && !!layers[i][5]); });
  rows.forEach(r => r.classList.remove("pk-dim", "hl"));
  pkBusy = false; if (btn) btn.disabled = false;
}
function pkStageHTML(sc, layers) {
  const tot = layers.reduce((a, l) => a + Math.max(l[2], 12), 0);
  let x = -50, rects = "";
  layers.forEach(l => { const w = Math.max(l[2], 12) / tot * 100; rects += '<rect x="' + x.toFixed(1) + '" y="40" width="' + w.toFixed(1) + '" height="22" class="pk-mv pk-' + l[0] + (wireEye === 0 && l[5] ? " enc" : "") + '"/>'; x += w; });
  return '<div class="stage sm" id="pkStage"><svg viewBox="0 0 760 120">' +
    '<line x1="140" y1="51" x2="620" y2="51" class="sv-wire"/>' +
    '<rect x="10" y="26" width="130" height="50" rx="8" class="sv-node"/><text x="75" y="56" text-anchor="middle" class="sv-t">' + kEsc(sc.from) + "</text>" +
    '<rect x="620" y="26" width="130" height="50" rx="8" class="sv-node"/><text x="685" y="56" text-anchor="middle" class="sv-t">' + kEsc(sc.to) + "</text>" +
    '<g id="pkEye" class="pk-eye"><circle cx="380" cy="96" r="14"/><path d="M369 96 q11 -9 22 0 q-11 9 -22 0z"/><circle cx="380" cy="96" r="3"/><text x="402" y="100" class="sv-s">tcpdump trên dây</text></g>' +
    '<g id="pkMove" opacity="0">' + rects + "</g></svg></div>" +
    '<div class="controls"><button class="btn primary" type="button" id="pkPlay">▶ Đóng gói → gửi → mở gói</button><span class="hint" id="pkCap" aria-live="polite">Bấm để xem gói được bọc, đi trên dây và được mở ra.</span></div>';
}

/* ---------- hành trình một Secret ---------- */
const SJ_ST = [["kubectl → apiserver", 1], ["apiserver (RAM)", 0], ["apiserver → etcd", 1], ["Đĩa etcd, snapshot", 0], ["apiserver → kubelet", 1], ["Node (tmpfs)", 0], ["Container", 0]];
let sjOn = false, sjEnc = false;
function sjHTML() {
  let s = '<div class="stage sm" id="sjStage"><svg viewBox="0 0 1000 150">';
  SJ_ST.forEach((st, i) => {
    const x = 70 + i * 143;
    if (i) s += '<line x1="' + (x - 143 + 22) + '" y1="70" x2="' + (x - 22) + '" y2="70" class="sv-wire"/>';
    s += '<g class="sj-n" id="sjN' + i + '"><circle cx="' + x + '" cy="70" r="20" class="' + (st[1] ? "sv-data" : "sv-box") + '"/><text x="' + x + '" y="75" text-anchor="middle" class="sv-tb">' + (i + 1) + '</text><text x="' + x + '" y="120" text-anchor="middle" class="sv-s">' + kEsc(st[0]) + "</text></g>";
  });
  s += '<g id="sjTok" transform="translate(70 30)"><rect x="-46" y="-13" width="92" height="24" rx="6"/><text y="4" text-anchor="middle"></text></g></svg></div>' +
    '<div class="controls"><button class="btn primary" type="button" id="sjPlay">▶ Theo dấu Secret</button><label class="check"><input type="checkbox" id="sjEnc"' + (sjEnc ? " checked" : "") + '> Đã bật EncryptionConfiguration</label><span class="hint" id="sjCap" aria-live="polite">Vòng tím: chặng truyền qua mạng có TLS. Thẻ đỏ: Secret ở dạng đọc được.</span></div>';
  return s;
}
function sjTok(i) {
  const st = SJ_ST[i], tok = $("#sjTok"); if (!tok) return;
  const readable = !(st[1] || (i === 3 && sjEnc));
  tok.setAttribute("class", readable ? "sj-plain" : "sj-enc");
  tok.querySelector("text").textContent = readable ? "S3cr3t!" : (i === 3 ? "k8s:enc:…" : "▒▒ TLS ▒▒");
  $$(".sj-n").forEach((n, k) => n.classList.toggle("on", k === i));
  $$("#wireJourney tbody tr").forEach((r, k) => r.classList.toggle("hlrow", k === i));
  const c = $("#sjCap"); if (c) c.textContent = (i + 1) + ". " + st[0] + ": " + (readable ? "đọc được nếu vào được chặng này" : i === 3 ? "đã mã hóa bằng aescbc, chỉ thấy tiền tố k8s:enc:aescbc:v1:key1:" : "được TLS che trên đường đi");
}
async function sjPlay() {
  if (sjOn) return; sjOn = true;
  const tok = $("#sjTok");
  for (let i = 0; i < SJ_ST.length; i++) {
    if (!tok || !tok.isConnected) break;
    const x0 = 70 + Math.max(0, i - 1) * 143, x1 = 70 + i * 143, t0 = performance.now();
    if (i && !RM) await new Promise(res => { const f = t => { const p = Math.min(1, (t - t0) / 650); tok.setAttribute("transform", "translate(" + (x0 + (x1 - x0) * ease(p)) + " 30)"); if (p < 1 && tok.isConnected) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    tok.setAttribute("transform", "translate(" + x1 + " 30)");
    sjTok(i); await sleep(1300);
  }
  sjOn = false;
}
