/* ---------- chương 4 Mạng: mô phỏng cho 4.1, 4.3, 4.4, 4.5, 4.6 ----------
   Dùng helper của learn.html ($, $$, el, txt, esc, sleep) và learn-ckad.js (lcPkt, lcBox, lcCode, lcEnhance, lcOnce). Tên toàn cục có tiền tố pn/dn/ig/gw/np. */
const netSeg = (opts, cur, attr) => '<div class="seg" role="group">' + opts.map(([k, v]) => '<button type="button" ' + attr + '="' + k + '" aria-pressed="' + (k === cur) + '">' + v + "</button>").join("") + "</div>";
const netPress = (root, attr, val) => $$("[" + attr + "]", root).forEach(b => b.setAttribute("aria-pressed", b.getAttribute(attr) === val ? "true" : "false"));

/* ---------- 4.1 gói tin giữa hai Pod ---------- */
const PN_MODES = {
  same: { n: "Cùng node", dst: "B", steps: [
    ["Pod A gửi tới 10.244.1.6", "Đích cùng dải Pod của worker-1. Gói rời eth0 của Pod A, đó là một đầu của cặp veth.", [[105, 106], [105, 150]], "src 10.244.1.5 → dst 10.244.1.6"],
    ["Qua bridge cni0 trên node", "Đầu kia của veth gắn vào bridge cni0 (hoặc có route riêng với CNI kiểu routed). Bridge chuyển gói sang veth của Pod B. Không NAT, không rời node.", [[105, 168], [275, 168]], "src 10.244.1.5 → dst 10.244.1.6"],
    ["Tới Pod B", "Pod B thấy đúng IP nguồn 10.244.1.5. Đây là luật “không NAT” của mô hình mạng.", [[275, 150], [275, 106]], "src 10.244.1.5 → dst 10.244.1.6"]] },
  vxlan: { n: "Khác node · VXLAN", dst: "C", steps: [
    ["Pod A gửi tới 10.244.2.7", "Đích thuộc dải 10.244.2.0/24 của worker-2. Route trên worker-1 chỉ dải đó qua thiết bị VXLAN (VTEP).", [[105, 106], [105, 150]], "src 10.244.1.5 → dst 10.244.2.7"],
    ["Bọc gói (encapsulation)", "VTEP bọc nguyên gói Pod trong UDP 4789 (Flannel: 8472) với IP ngoài là IP hai node. Thêm khoảng 50 byte, nên MTU trong Pod nhỏ hơn.", [[105, 186], [190, 228]], "[ngoài 192.168.1.11 → 192.168.1.12 · UDP 4789] [trong 10.244.1.5 → 10.244.2.7]"],
    ["Qua mạng của node", "Router giữa hai node chỉ thấy gói UDP giữa hai IP node. Nó không cần biết gì về dải Pod.", [[340, 228], [440, 228]], "[ngoài 192.168.1.11 → 192.168.1.12 · UDP 4789] [trong 10.244.1.5 → 10.244.2.7]"],
    ["Mở gói và giao cho Pod C", "VTEP của worker-2 bỏ lớp ngoài, đưa gói gốc vào cni0 rồi veth của Pod C. Pod C thấy nguồn 10.244.1.5.", [[580, 228], [580, 168], [505, 168], [505, 106]], "src 10.244.1.5 → dst 10.244.2.7"]] },
  routed: { n: "Khác node · định tuyến", dst: "C", steps: [
    ["Pod A gửi tới 10.244.2.7", "Không có lớp bọc. Worker-1 có route: 10.244.2.0/24 qua 192.168.1.12, học được bằng BGP (Calico) hoặc do cloud cài.", [[105, 106], [105, 150]], "src 10.244.1.5 → dst 10.244.2.7"],
    ["Đi thẳng qua mạng node", "Gói giữ nguyên IP Pod. Router ở giữa phải biết route tới dải Pod, nên mạng bên dưới phải hợp tác (cùng L2 hoặc nhận BGP).", [[105, 186], [190, 228], [440, 228]], "src 10.244.1.5 → dst 10.244.2.7 (không bọc)"],
    ["Tới Pod C", "Worker-2 nhận gói có đích thuộc dải Pod của mình, chuyển vào veth của Pod C. Không tốn 50 byte VXLAN, dễ đọc bằng tcpdump.", [[580, 228], [580, 168], [505, 168], [505, 106]], "src 10.244.1.5 → dst 10.244.2.7"]] }
};
function pnInit() {
  const p = $("#pnAnim"); let mode = "vxlan", run = 0;
  p.innerHTML = "<h3>Gói tin đi từ Pod A</h3>" + netSeg(Object.entries(PN_MODES).map(([k, v]) => [k, v.n]), mode, "data-pn") +
    '<div class="stage sm"><svg viewBox="0 0 760 300"></svg></div><div class="controls"><button class="btn primary" type="button" data-pnplay>▶ Chạy</button><span class="hint cap" aria-live="polite"></span></div>';
  const svg = $("svg", p), cap = $(".cap", p);
  const draw = () => {
    svg.innerHTML = "";
    [[20, "worker-1 · 192.168.1.11 · podCIDR 10.244.1.0/24"], [400, "worker-2 · 192.168.1.12 · podCIDR 10.244.2.0/24"]].forEach(([x, t]) => { el("rect", { x, y: 18, width: 340, height: 240, rx: 12, class: "an-pod" }, svg); txt(svg, x + 12, 38, t, "sv-s"); });
    lcBox(svg, 40, 50, 130, 56, "an-c run", "Pod A", "10.244.1.5");
    lcBox(svg, 210, 50, 130, 56, "an-c" + (PN_MODES[mode].dst === "B" ? " v2" : ""), "Pod B", "10.244.1.6");
    lcBox(svg, 440, 50, 130, 56, "an-c" + (PN_MODES[mode].dst === "C" ? " v2" : ""), "Pod C", "10.244.2.7");
    lcBox(svg, 40, 150, 300, 36, "an-vol", "cni0 · veth của từng Pod", "");
    lcBox(svg, 440, 150, 280, 36, "an-vol", "cni0 · veth của từng Pod", "");
    lcBox(svg, 40, 210, 300, 36, "an-ext", mode === "vxlan" ? "eth0 node + VTEP flannel.1" : "eth0 192.168.1.11", "");
    lcBox(svg, 440, 210, 280, 36, "an-ext", mode === "vxlan" ? "eth0 node + VTEP flannel.1" : "eth0 192.168.1.12", "");
    el("path", { d: "M340 228 H440", class: "an-l on" }, svg); txt(svg, 390, 268, "mạng node", "sv-s", "middle");
    txt(svg, 20, 284, "", "sv-tb").setAttribute("id", "pnHdr");
  };
  const play = async () => {
    const tok = ++run; draw();
    for (const [h, d, pts, hdr] of PN_MODES[mode].steps) {
      if (tok !== run || !lcVisible(svg)) return;
      cap.innerHTML = "<b>" + esc(h) + ".</b> " + esc(d); $("#pnHdr", svg).textContent = hdr;
      await lcPkt(svg, pts, { cls: hdr.startsWith("[") ? "fmt" : "v1", dur: 1100 }); await sleep(1500);
    }
  };
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-pn]"); if (b) { mode = b.dataset.pn; netPress(p, "data-pn", mode); run++; draw(); cap.textContent = "Bấm Chạy để xem từng chặng."; return; }
    if (e.target.closest("[data-pnplay]")) play();
  });
  draw(); cap.textContent = "Bấm Chạy để xem từng chặng.";
}
lcOnce("podnet", pnInit);

/* ---------- 4.3 Pod tra một cái tên thế nào ---------- */
const DN_SVC = { "web.shop": "A 10.96.120.5", "api.payments": "A 10.96.40.2", "kubernetes.default": "A 10.96.0.1", "db.shop": "A 10.244.1.9, 10.244.2.4 (headless: IP từng Pod)", "kube-dns.kube-system": "A 10.96.0.10" };
const DN_POD = { "db-0.db.shop": "A 10.244.1.9", "db-1.db.shop": "A 10.244.2.4" };
const DN_EXT = { "api.example.com": "A 203.0.113.20 (DNS ngoài trả lời)", "registry.k8s.io": "A 34.96.108.209 (DNS ngoài trả lời)" };
function dnResolve(q) {
  const n = q.replace(/\.$/, "");
  if (n.endsWith(".svc.cluster.local")) { const k = n.slice(0, -".svc.cluster.local".length); return DN_SVC[k] || DN_POD[k] || null; }
  if (n.endsWith(".cluster.local")) return null;
  return DN_EXT[n] || null;
}
function dnInit() {
  const box = $("#dnsSim"); let ns = "shop";
  box.innerHTML = "<h3>Pod tra một cái tên thế nào</h3>" +
    '<p class="hint" style="margin:0">Cluster mẫu: Service <code>web</code> và headless <code>db</code> (Pod db-0, db-1) ở <code>shop</code>, Service <code>api</code> ở <code>payments</code>. Gõ tên như app vẫn gọi.</p>' +
    '<div class="formrow"><label class="f">Pod đang ở namespace' + netSeg([["shop", "shop"], ["payments", "payments"]], ns, "data-dns") + '</label><input type="text" id="dnQ" value="web" style="flex:1;min-width:200px;font-family:var(--f-mono)" aria-label="Tên cần tra"></div>' +
    '<div class="chips">' + ["web", "api.payments", "db-0.db", "kubernetes.default", "api.example.com", "api.example.com.", "web.shop.svc.cluster.local"].map(x => '<button type="button" data-dq="' + x + '">' + x + "</button>").join("") + "</div>" +
    '<div class="codewrap"><pre class="code" id="dnConf"></pre></div><div id="dnOut"></div>';
  const show = () => {
    const name = $("#dnQ").value.trim(), search = [ns + ".svc.cluster.local", "svc.cluster.local", "cluster.local"];
    $("#dnConf").textContent = "# /etc/resolv.conf của Pod trong namespace " + ns + "\nnameserver 10.96.0.10\nsearch " + search.join(" ") + "\noptions ndots:5";
    if (!name) { $("#dnOut").innerHTML = ""; return; }
    const abs = name.endsWith("."), dots = (name.replace(/\.$/, "").match(/\./g) || []).length;
    const cands = abs ? [name] : dots >= 5 ? [name + ".", ...search.map(s => name + "." + s + ".")] : [...search.map(s => name + "." + s + "."), name + "."];
    let hit = -1; const rows = cands.map((c, i) => { const r = hit < 0 ? dnResolve(c) : undefined; if (r && hit < 0) hit = i; return [c, r, i]; });
    const why = abs ? "Tên kết thúc bằng dấu chấm là tên tuyệt đối: hỏi đúng một lần." : dots >= 5 ? "Tên có từ 5 dấu chấm trở lên: hỏi nguyên tên trước." : "Tên có " + dots + " dấu chấm, ít hơn ndots 5: thử ghép từng search domain trước, nguyên tên sau cùng.";
    $("#dnOut").innerHTML = '<p class="small" style="margin:6px 0">' + esc(why) + '</p><div class="tbl"><table><thead><tr><th>#</th><th>Câu hỏi gửi CoreDNS</th><th>Kết quả</th></tr></thead><tbody>' +
      rows.map(([c, r, i]) => "<tr" + (i === hit ? ' style="background:var(--node-soft)"' : i > hit && hit >= 0 ? ' style="opacity:.4"' : "") + "><td>" + (i + 1) + "</td><td><code>" + esc(c) + "</code></td><td>" + (i > hit && hit >= 0 ? "không hỏi nữa" : r ? "<b>" + esc(r) + "</b>" : "NXDOMAIN") + "</td></tr>").join("") + "</tbody></table></div>" +
      '<p class="small muted" style="margin:6px 0 0">' + (hit < 0 ? "Không tên nào trả lời: app báo lỗi không phân giải được tên." : hit === 0 ? "Trúng ngay lần đầu." : "Mất " + hit + " câu hỏi thừa trước khi trúng" + (hit >= 3 ? ", nhân đôi nếu app hỏi cả A và AAAA. Tên ngoài dùng nhiều thì thêm dấu chấm cuối hoặc hạ ndots." : ".")) + "</p>";
  };
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-dns]"); if (b) { ns = b.dataset.dns; netPress(box, "data-dns", ns); show(); return; }
    const q = e.target.closest("[data-dq]"); if (q) { $("#dnQ").value = q.dataset.dq; show(); }
  });
  box.addEventListener("input", show); show();
}
lcOnce("dns", dnInit);

/* ---------- 4.4 Ingress khớp rule nào ---------- */
const IG_RULES = [
  { host: "shop.example.com", path: "/api", type: "Prefix", be: "api:8080" },
  { host: "shop.example.com", path: "/api/v1/health", type: "Exact", be: "health:80" },
  { host: "shop.example.com", path: "/", type: "Prefix", be: "web:80" },
  { host: "*.example.com", path: "/", type: "Prefix", be: "wildcard:80" },
  { host: "", path: "/docs", type: "Prefix", be: "docs:80" }
];
const igSplit = p => p.split("/").filter(Boolean);
function igPathOk(r, path) {
  if (r.type === "Exact") return path === r.path;
  const a = igSplit(r.path), b = igSplit(path);
  return a.length <= b.length && a.every((x, i) => x === b[i]);
}
function igHostOk(r, host) { if (!r.host) return "any"; if (r.host === host) return "exact"; if (r.host.startsWith("*.")) { const rest = r.host.slice(1); return host.endsWith(rest) && !host.slice(0, -rest.length).includes(".") && host.length > rest.length ? "wild" : false; } return false; }
function igInit() {
  const box = $("#ingSim");
  box.innerHTML = "<h3>Request này đi vào Service nào?</h3>" +
    '<div class="formrow"><label class="f">Host <input type="text" id="igH" value="shop.example.com" style="font-family:var(--f-mono)"></label><label class="f" style="flex:1">Path <input type="text" id="igP" value="/api/items" style="font-family:var(--f-mono);width:100%"></label></div>' +
    '<div class="chips">' + [["shop.example.com", "/api/items"], ["shop.example.com", "/apis"], ["shop.example.com", "/api/v1/health"], ["shop.example.com", "/api/v1/health/"], ["blog.example.com", "/"], ["a.b.example.com", "/docs/intro"], ["example.com", "/docs"], ["other.org", "/x"]].map(([h, p]) => '<button type="button" data-ig="' + h + "|" + p + '">' + h + p + "</button>").join("") + '</div><div id="igOut"></div>' +
    '<p class="small muted" style="margin:0">Chọn nhóm host theo cách của ingress-nginx: host chính xác trước, rồi wildcard, rồi rule không có host. Controller khác có thể khác ở bước này; luật khớp path là chuẩn của Kubernetes.</p>';
  const show = () => {
    const host = $("#igH").value.trim().toLowerCase(), path = $("#igP").value.trim() || "/";
    const hm = IG_RULES.map(r => igHostOk(r, host));
    const group = hm.includes("exact") ? "exact" : hm.includes("wild") ? "wild" : "any";
    let win = -1, best = null;
    IG_RULES.forEach((r, i) => { if (hm[i] !== group || !igPathOk(r, path)) return; if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.type === "Exact")) { best = r; win = i; } });
    const note = (r, i) => !hm[i] ? "host không khớp" : hm[i] !== group ? "host khớp nhưng có nhóm host cụ thể hơn" : !igPathOk(r, path) ? (r.type === "Exact" ? "Exact: chuỗi path phải giống hệt" : "Prefix: các đoạn đầu không khớp") : i === win ? "<b>thắng</b>" + (IG_RULES.some((x, k) => k !== i && hm[k] === group && igPathOk(x, path)) ? ": path dài nhất" : "") : "khớp nhưng path ngắn hơn";
    $("#igOut").innerHTML = '<div class="tbl"><table><thead><tr><th>host</th><th>path</th><th>pathType</th><th>backend</th><th>Với request này</th></tr></thead><tbody>' +
      IG_RULES.map((r, i) => "<tr" + (i === win ? ' style="background:var(--node-soft)"' : "") + "><td><code>" + esc(r.host || "(mọi host)") + "</code></td><td><code>" + esc(r.path) + "</code></td><td>" + r.type + "</td><td><code>" + r.be + "</code></td><td>" + note(r, i) + "</td></tr>").join("") +
      '<tr' + (win < 0 ? ' style="background:var(--pkt-soft)"' : "") + '><td colspan="3"><i>defaultBackend</i></td><td><code>notfound:80</code></td><td>' + (win < 0 ? "<b>không rule nào khớp → defaultBackend</b>" : "") + "</td></tr></tbody></table></div>";
  };
  box.addEventListener("click", e => { const b = e.target.closest("[data-ig]"); if (b) { const [h, p] = b.dataset.ig.split("|"); $("#igH").value = h; $("#igP").value = p; show(); } });
  box.addEventListener("input", show); show();
}
lcOnce("ingress", igInit);

/* ---------- 4.5 request đi qua Gateway ---------- */
const GW_REQ = [
  ["http", "shop.example.com", "/api/items", "", "HTTP tới shop"], ["https", "shop.example.com", "/api/items", "", "HTTPS /api"], ["https", "shop.example.com", "/api/items", "x-beta: 1", "HTTPS /api + header beta"],
  ["https", "shop.example.com", "/", "", "HTTPS trang chủ"], ["https", "pay.example.com", "/", "", "pay: Service ở namespace khác"], ["https", "other.org", "/", "", "host lạ"]
];
function gwRoute(r, grant) {
  const [scheme, host, path, hdr] = r;
  if (scheme === "http") return { lis: "http :80", route: "shop/to-https", rule: "RequestRedirect", be: null, redirect: true, cap: "Listener http nhận mọi host. Route to-https chỉ có filter RequestRedirect: Gateway trả 301 về https://" + host + path + ", không chạm tới Service nào." };
  if (!/\.example\.com$/.test(host)) return { lis: null, cap: "Listener https chỉ nhận hostname *.example.com. Không listener nào khớp " + host + ": Gateway trả 404 (hoặc từ chối bắt tay TLS vì không có chứng chỉ khớp)." };
  if (host === "pay.example.com") return grant ? { lis: "https :443", route: "payments/pay", rule: "PathPrefix /", be: "finance/ledger:8080", cap: "Route pay ở namespace payments trỏ tới Service ledger ở namespace finance. Có ReferenceGrant ở finance nên ResolvedRefs=True, request đi qua." }
    : { lis: "https :443", route: "payments/pay", rule: "PathPrefix /", be: null, err: true, cap: "Route được nhận nhưng backend ở namespace finance không có ReferenceGrant: ResolvedRefs=False, lý do RefNotPermitted. Gateway trả 500 cho request này." };
  if (path.startsWith("/api") && hdr) return { lis: "https :443", route: "shop/shop", rule: "/api + header x-beta=1", be: "api-beta:8080", cap: "Hai rule cùng khớp /api; rule có thêm điều kiện header cụ thể hơn nên thắng. Người dùng beta vào api-beta." };
  if (path.startsWith("/api")) { const c = Math.random() < .1; return { lis: "https :443", route: "shop/shop", rule: "/api · URLRewrite", be: c ? "api-canary:8080" : "api:8080", cap: "Khớp /api, filter URLRewrite đổi /api/items thành /items trước khi gửi. Chia 90/10 theo weight: lần này vào " + (c ? "api-canary" : "api") + ". Bấm lại vài lần để thấy tỉ lệ." }; }
  return { lis: "https :443", route: "shop/shop", rule: "PathPrefix /", be: "web:80", cap: "Không khớp /api, rơi vào rule PathPrefix / của route shop: vào Service web." };
}
function gwInit() {
  const p = $("#gwAnim"); let grant = false, cur = 1;
  p.innerHTML = "<h3>Một request đi qua Gateway</h3>" + '<div class="chips">' + GW_REQ.map((r, i) => '<button type="button" data-gw="' + i + '" aria-pressed="' + (i === cur) + '">' + esc(r[4]) + "</button>").join("") + '</div><label class="check"><input type="checkbox" id="gwGrant"> Có ReferenceGrant ở namespace finance</label>' +
    '<div class="stage sm"><svg viewBox="0 0 760 230"></svg></div><p class="hint cap" aria-live="polite"></p>';
  const svg = $("svg", p), cap = $(".cap", p); let tok = 0;
  const go = async () => {
    const t = ++tok, r = GW_REQ[cur], o = gwRoute(r, grant);
    svg.innerHTML = "";
    const col = (x, title, val, on, bad) => { lcBox(svg, x, 70, 160, 64, "an-c" + (bad ? " term" : on ? " run" : ""), title, val || "—"); };
    txt(svg, 20, 30, r[0] + "://" + r[1] + r[2] + (r[3] ? "   [" + r[3] + "]" : ""), "sv-tb");
    col(20, "Client", r[0].toUpperCase(), true);
    col(205, "Gateway infra/public", o.lis ? "listener " + o.lis : "không listener khớp", !!o.lis, !o.lis);
    col(390, "HTTPRoute", o.route ? o.route : "—", !!o.route);
    col(575, "Service", o.be || (o.redirect ? "301 → https" : o.err ? "500 RefNotPermitted" : "—"), !!o.be, o.err);
    if (o.rule) txt(svg, 470, 160, "rule: " + o.rule, "sv-s", "middle");
    cap.textContent = "";
    const hops = [[180, 102], [205, 102]]; if (o.lis) hops.push([365, 102], [390, 102]); if (o.be) hops.push([550, 102], [575, 102]);
    await lcPkt(svg, hops, { cls: o.be ? "v2" : "raw", dur: 1300 });
    if (t !== tok) return;
    if (o.redirect) await lcPkt(svg, [[365, 120], [180, 120]], { cls: "fmt", dur: 700 });
    cap.textContent = o.cap;
  };
  p.addEventListener("click", e => { const b = e.target.closest("[data-gw]"); if (b) { cur = +b.dataset.gw; netPress(p, "data-gw", String(cur)); go(); } });
  p.addEventListener("change", e => { if (e.target.id === "gwGrant") { grant = e.target.checked; go(); } });
  LC_REPLAY.gateway = go; go();
}
lcOnce("gateway", gwInit);

/* ---------- 4.6 NetworkPolicy: kết nối nào qua được ---------- */
const NP_PODS = {
  frontend: { ns: "shop", l: { app: "frontend" }, x: 40, y: 60 }, web: { ns: "shop", l: { app: "web" }, x: 175, y: 175 }, db: { ns: "shop", l: { app: "db" }, x: 330, y: 60 },
  prom: { ns: "monitoring", l: { app: "prometheus" }, x: 512, y: 62 }, grafana: { ns: "monitoring", l: { app: "grafana" }, x: 628, y: 62 },
  dns: { ns: "kube-system", l: { "k8s-app": "kube-dns" }, x: 570, y: 170 }, ext: { ext: "1.1.1.1", x: 570, y: 262 }
};
const NP_FLOWS = [["frontend", "web", 8080, "TCP"], ["frontend", "db", 5432, "TCP"], ["web", "db", 5432, "TCP"], ["prom", "web", 9090, "TCP"], ["grafana", "web", 9090, "TCP"], ["web", "dns", 53, "UDP"], ["web", "ext", 443, "TCP"]];
const NP_POL = {
  p1: { n: "default-deny-ingress", sel: {}, types: ["Ingress"], ingress: [] },
  p2: { n: "web-from-frontend", sel: { app: "web" }, types: ["Ingress"], ingress: [{ peers: [{ pod: { app: "frontend" } }], ports: [[8080, "TCP"]] }] },
  p3: { n: "db-from-web", sel: { app: "db" }, types: ["Ingress"], ingress: [{ peers: [{ pod: { app: "web" } }], ports: [[5432, "TCP"]] }] },
  and: { n: "web-from-prometheus", sel: { app: "web" }, types: ["Ingress"], ingress: [{ peers: [{ ns: "monitoring", pod: { app: "prometheus" } }], ports: [[9090, "TCP"]] }] },
  or: { n: "web-from-monitoring", sel: { app: "web" }, types: ["Ingress"], ingress: [{ peers: [{ ns: "monitoring" }, { pod: { app: "prometheus" } }], ports: [[9090, "TCP"]] }] },
  p5: { n: "default-deny-egress", sel: {}, types: ["Egress"], egress: [] },
  p6: { n: "allow-dns", sel: {}, types: ["Egress"], egress: [{ peers: [{ ns: "kube-system", pod: { "k8s-app": "kube-dns" } }], ports: [[53, "UDP"], [53, "TCP"]] }] },
  p7: { n: "web-egress", sel: { app: "web" }, types: ["Egress"], egress: [{ peers: [{ pod: { app: "db" } }], ports: [[5432, "TCP"]] }, { peers: [{ ip: "0.0.0.0/0", except: "10.0.0.0/8" }], ports: [[443, "TCP"]] }] }
};
const npLab = (l, sel) => Object.entries(sel).every(([k, v]) => l && l[k] === v);
function npPeer(peer, other) {
  const o = NP_PODS[other];
  if (peer.ip) return !!o.ext;
  if (o.ext) return false;
  if (peer.ns && o.ns !== peer.ns) return false;
  if (!peer.ns && o.ns !== "shop") return false;
  return !peer.pod || npLab(o.l, peer.pod);
}
const npRuleOk = (rule, other, port, proto) => (!rule.peers || rule.peers.some(p => npPeer(p, other))) && (!rule.ports || rule.ports.some(([pt, pr]) => pt === port && pr === proto));
function npSide(on, pod, dir, other, port, proto) {
  const P = NP_PODS[pod]; if (P.ext || P.ns !== "shop") return { ok: true, txt: (P.ext ? "Internet" : P.ns + "/" + pod) + ": không có policy ở namespace này → mở" };
  const pols = on.filter(k => NP_POL[k].types.includes(dir) && npLab(P.l, NP_POL[k].sel));
  if (!pols.length) return { ok: true, txt: "không policy " + dir + " nào chọn shop/" + pod + " → mở" };
  const allow = pols.filter(k => (NP_POL[k][dir.toLowerCase()] || []).some(r => npRuleOk(r, other, port, proto)));
  return { ok: allow.length > 0, txt: "shop/" + pod + " bị chọn bởi " + pols.map(k => NP_POL[k].n).join(", ") + (allow.length ? " → " + allow.map(k => NP_POL[k].n).join(", ") + " cho phép" : " → không policy nào cho phép, chặn") };
}
function npYaml(k) {
  const p = NP_POL[k], sel = o => Object.keys(o).length ? "{matchLabels: {" + Object.entries(o).map(([a, b]) => a + ": " + b).join(", ") + "}}" : "{}";
  const peer = x => x.ip ? "    - ipBlock: {cidr: " + x.ip + (x.except ? ", except: [" + x.except + "]" : "") + "}"
    : (x.ns ? "    - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: " + x.ns + "}}" + (x.pod ? "\n      podSelector: " + sel(x.pod) : "") : "    - podSelector: " + sel(x.pod));
  const rules = (dir, list) => list.length ? "  " + dir + ":\n" + list.map(r => "  - " + (dir === "ingress" ? "from" : "to") + ":\n" + r.peers.map(peer).join("\n") + "\n    ports: [" + r.ports.map(([a, b]) => "{protocol: " + b + ", port: " + a + "}").join(", ") + "]").join("\n") : "";
  return "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: " + p.n + ", namespace: shop}\nspec:\n  podSelector: " + sel(p.sel) + "\n  policyTypes: [" + p.types.join(", ") + "]" + (p.ingress ? "\n" + rules("ingress", p.ingress) : "") + (p.egress ? "\n" + rules("egress", p.egress) : "");
}
function npInit() {
  const box = $("#npSim"); const st = { p1: true, p2: true, p3: true, mon: "and", p5: false, p6: false, p7: false }; let selF = 0;
  const chk = (k, t) => '<label class="check"><input type="checkbox" data-np="' + k + '"' + (st[k] ? " checked" : "") + "> " + t + "</label>";
  box.innerHTML = "<h3>Bật tắt policy, xem kết nối nào qua được</h3>" +
    '<div class="formrow" style="align-items:flex-start"><div class="col" style="gap:4px"><b class="small">Ingress</b>' + chk("p1", "default-deny-ingress (cả namespace shop)") + chk("p2", "web-from-frontend :8080") + chk("p3", "db-from-web :5432") +
    '<span class="small">Monitoring vào web :9090 ' + netSeg([["none", "không"], ["and", "AND"], ["or", "OR"]], st.mon, "data-npm") + "</span></div>" +
    '<div class="col" style="gap:4px"><b class="small">Egress</b>' + chk("p5", "default-deny-egress (cả namespace shop)") + chk("p6", "allow-dns tới kube-dns :53") + chk("p7", "web-egress: db :5432, Internet :443") + "</div></div>" +
    '<div class="stage sm"><svg viewBox="0 0 760 320"></svg></div><div id="npWhy" class="panel" style="padding:12px"></div><div class="tbl" id="npTbl"></div><details class="bp more"><summary>YAML của các policy đang bật</summary><div class="body" id="npYaml"></div></details>';
  const svg = $("svg", box);
  const render = () => {
    const on = ["p1", "p2", "p3"].filter(k => st[k]).concat(st.mon !== "none" ? [st.mon] : [], ["p5", "p6", "p7"].filter(k => st[k]));
    const res = NP_FLOWS.map(([s, d, port, proto]) => { const eg = npSide(on, s, "Egress", d, port, proto), ig = npSide(on, d, "Ingress", s, port, proto); return { eg, ig, ok: eg.ok && ig.ok }; });
    svg.innerHTML = "";
    [["shop", 20, 30, 460, 275], ["monitoring", 500, 30, 240, 100], ["kube-system", 500, 145, 240, 80], ["Internet", 500, 240, 240, 65]].forEach(([t, x, y, w, h]) => { el("rect", { x, y, width: w, height: h, rx: 10, class: "an-pod" }, svg); txt(svg, x + 10, y + 16, t, "sv-s"); });
    const W = 108, H = 44, c = id => [NP_PODS[id].x + W / 2, NP_PODS[id].y + H / 2];
    NP_FLOWS.forEach(([s, d], i) => {
      const [x1, y1] = c(s), [x2, y2] = c(d), mx = (x1 + x2) / 2 + (i === 4 ? 0 : i === 3 ? -14 : 0), my = (y1 + y2) / 2 + (i === 3 ? -12 : i === 4 ? 12 : 0);
      el("path", { d: "M" + x1 + " " + y1 + " Q" + mx + " " + my + " " + x2 + " " + y2, fill: "none", stroke: res[i].ok ? "var(--node)" : "var(--bad)", "stroke-width": i === selF ? 4 : 2.2, "stroke-dasharray": res[i].ok ? "" : "6 5", opacity: i === selF ? 1 : .75 }, svg);
      const g = el("g", { style: "cursor:pointer", "data-npf": i }, svg); const lx = (x1 + 2 * mx + x2) / 4, ly = (y1 + 2 * my + y2) / 4;
      el("circle", { cx: lx, cy: ly, r: 11, fill: res[i].ok ? "var(--node)" : "var(--bad)" }, g); txt(g, lx, ly + 4, String(i + 1), "sv-s", "middle").setAttribute("style", "fill:#fff;font-weight:700");
    });
    Object.entries(NP_PODS).forEach(([id, p]) => lcBox(svg, p.x, p.y, W, H, p.ext ? "an-ext" : "an-c", p.ext ? "1.1.1.1" : id, p.ext ? "ngoài cluster" : Object.entries(p.l).map(([a, b]) => a + "=" + b).join("")));
    const f = NP_FLOWS[selF], r = res[selF], nm = id => NP_PODS[id].ext ? "Internet " + NP_PODS[id].ext : NP_PODS[id].ns + "/" + id;
    $("#npWhy").innerHTML = "<b>" + (selF + 1) + ". " + esc(nm(f[0])) + " → " + esc(nm(f[1])) + " :" + f[2] + "/" + f[3] + " · " + (r.ok ? '<span style="color:var(--node)">qua được</span>' : '<span style="color:var(--bad)">bị chặn</span>') + '</b><ul class="tight" style="margin-top:6px"><li>Chiều đi (egress của nguồn): ' + esc(r.eg.txt) + "</li><li>Chiều đến (ingress của đích): " + esc(r.ig.txt) + "</li></ul>";
    $("#npTbl").innerHTML = "<table><thead><tr><th>#</th><th>Kết nối</th><th>Kết quả</th></tr></thead><tbody>" + NP_FLOWS.map((f, i) => '<tr data-npf="' + i + '" style="cursor:pointer' + (i === selF ? ";background:var(--paper-2)" : "") + '"><td>' + (i + 1) + "</td><td><code>" + esc(nm(f[0]) + " → " + nm(f[1]) + " :" + f[2] + "/" + f[3]) + "</code></td><td>" + (res[i].ok ? "✓ qua" : "✕ chặn" + (!res[i].eg.ok ? " (egress)" : "") + (!res[i].ig.ok ? " (ingress)" : "")) + "</td></tr>").join("") + "</tbody></table>";
    const y = $("#npYaml"); y.innerHTML = on.length ? on.map(k => lcCode(npYaml(k))).join("") : '<p class="small muted">Chưa bật policy nào: mọi kết nối đều mở.</p>'; lcEnhance(y);
  };
  box.addEventListener("change", e => { const c = e.target.closest("[data-np]"); if (c) { st[c.dataset.np] = c.checked; render(); } });
  box.addEventListener("click", e => {
    const m = e.target.closest("[data-npm]"); if (m) { st.mon = m.dataset.npm; netPress(box, "data-npm", st.mon); render(); return; }
    const f = e.target.closest("[data-npf]"); if (f) { selF = +f.dataset.npf; render(); }
  });
  render();
}
lcOnce("netpol", npInit);
