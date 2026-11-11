/* ---------- Scaling & ước lượng node ---------- */
/* Mô phỏng HPA + Cluster Autoscaler theo nhịp 15 giây, máy tính số node (allocatable, bin-packing, chi phí),
   rightsizing requests từ số đo thật, các kiểu autoscaling và lỗi khi scale. build.py chèn vào learn.html. */

const SC_TABS = [["hpa", "Mô phỏng HPA + autoscaler"], ["node", "Ước lượng số node"], ["right", "Rightsizing requests"], ["kinds", "Các kiểu scaling"], ["err", "Lỗi khi scale"]];
let scCur = "hpa";
const scEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const scCode = t => '<div class="codewrap"><pre class="code">' + scEsc(t) + "</pre></div>";
const scDet = (t, b, open) => '<details class="bp more"' + (open ? " open" : "") + "><summary>" + t + '</summary><div class="body">' + b + "</div></details>";
const scTl = items => '<ul class="tldr">' + items.map(x => "<li>" + x + "</li>").join("") + "</ul>";

function scInit() {
  const t = $("#scTabs");
  if (!t.dataset.ready) {
    t.dataset.ready = "1";
    t.innerHTML = SC_TABS.map(x => '<button type="button" data-sc="' + x[0] + '" aria-pressed="false">' + scEsc(x[1]) + "</button>").join("");
    t.addEventListener("click", e => { const b = e.target.closest("[data-sc]"); if (b) { scCur = b.dataset.sc; store.set("scTab", scCur); scShow(); } });
    scCur = store.get("scTab", "hpa");
  }
  scShow();
}
function scShow() {
  $$("#scTabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.sc === scCur ? "true" : "false"));
  hpaStop();
  const box = $("#scBody");
  box.oninput = box.onchange = box.onclick = null;
  if (scCur === "hpa") { box.innerHTML = hpaHTML(); hpaReset(); }
  else if (scCur === "node") { box.innerHTML = nodeHTML(); nodeCalc(); }
  else if (scCur === "right") { box.innerHTML = rightHTML(); rightCalc(); }
  else if (scCur === "kinds") box.innerHTML = kindsScaleHTML();
  else box.innerHTML = scErrHTML();
  $$("#scBody pre.code").forEach(pre => { if (pre.parentElement.querySelector(".copy")) return; const b = document.createElement("button"); b.className = "copy"; b.type = "button"; b.textContent = "Chép"; b.onclick = () => { try { navigator.clipboard.writeText(pre.textContent); b.textContent = "Đã chép"; } catch (e) {} setTimeout(() => b.textContent = "Chép", 1200); }; pre.parentElement.appendChild(b); });
}

/* ================= 1. mô phỏng HPA + Cluster Autoscaler ================= */
const HPA_T = 2700, HPA_STEP = 15, POD_RPS = 100, PODS_PER_NODE = 4, NODE_BOOT = 90, POD_BOOT = 30, MAX_NODES = 7, MIN_NODES = 2;
const HPA_PROFILES = {
  spike: ["Đột biến", t => (t >= 300 && t < 1000 ? 1300 : 150)],
  wave: ["Sóng trong ngày", t => 150 + 950 * Math.pow(Math.sin(Math.PI * Math.min(t, 1800) / 1800), 2)],
  step: ["Bậc thang", t => (t < 300 ? 200 : t < 700 ? 600 : t < 1200 ? 1000 : 400)]
};
let hpa = null, hpaTimer = null, hpaProf = "spike", hpaTarget = 60, hpaCA = true, hpaSpeed = 1, hpaMin = 2, hpaMax = 20;

function hpaHTML() {
  return '<div class="panel col">' + scTl(["HPA đổi <b>số Pod</b> mỗi 15 giây theo công thức <code>ceil(Pod × hiện tại / mục tiêu)</code>.", "CPU % là so với <b>requests</b>: không đặt requests thì HPA không chạy.", "Pod mới Pending vì hết chỗ thì <b>Cluster Autoscaler</b> thêm node."]) + "</div>" +
    '<div class="panel col"><div class="formrow">' +
    '<div class="seg" role="group" aria-label="Kiểu tải" id="hpaProf">' + Object.entries(HPA_PROFILES).map(([k, v]) => '<button type="button" data-prof="' + k + '" aria-pressed="' + (k === hpaProf) + '">' + v[0] + "</button>").join("") + "</div>" +
    '<label class="f" style="min-width:200px">Mục tiêu CPU: <b id="hpaTv">' + hpaTarget + '%</b><input type="range" id="hpaTarget" min="30" max="90" step="5" value="' + hpaTarget + '"></label>' +
    '<label class="check"><input type="checkbox" id="hpaCA"' + (hpaCA ? " checked" : "") + "> Cluster Autoscaler</label></div>" +
    '<div class="controls"><button class="btn primary" type="button" id="hpaPlay">▶ Chạy</button><button class="btn" type="button" id="hpaResetB">↺ Làm lại</button><div class="seg" role="group" aria-label="Tốc độ"><button type="button" data-spd="1" aria-pressed="' + (hpaSpeed === 1) + '">1×</button><button type="button" data-spd="3" aria-pressed="' + (hpaSpeed === 3) + '">3×</button></div><span class="hint" id="hpaClock">00:00</span></div>' +
    '<div class="sc-tiles" id="hpaTiles"></div>' +
    '<div class="sc-formula" id="hpaFormula" aria-live="polite"></div>' +
    '<div class="stage sm"><svg id="hpaNodes" viewBox="0 0 1000 170" role="img" aria-label="Node và Pod"></svg></div>' +
    '<div class="stage sm"><svg id="hpaChart" viewBox="0 0 1000 200" role="img" aria-label="Biểu đồ tải và số Pod"></svg></div>' +
    '<div class="sc-leg"><span><i style="background:var(--muted)"></i>Pod cần (theo tải)</span><span><i style="background:var(--node)"></i>Pod Ready</span><span><i style="background:var(--pkt)"></i>replicas HPA đặt</span><span><i style="background:var(--accent)"></i>Node</span></div>' +
    '<div class="term sc-log" id="hpaLog"></div></div>' +
    '<div class="panel col">' + scDet("Cấu hình HPA tương ứng", scCode(`apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: {name: web}
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: web}
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: {type: Utilization, averageUtilization: 60}   # % của requests.cpu
  behavior:                      # đây là giá trị mặc định, viết ra cho rõ
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - {type: Percent, value: 100, periodSeconds: 15}
        - {type: Pods, value: 4, periodSeconds: 15}
      selectPolicy: Max          # mỗi 15s tăng tối đa max(100%, 4 Pod)
    scaleDown:
      stabilizationWindowSeconds: 300   # chờ 5 phút trước khi giảm
      policies:
        - {type: Percent, value: 100, periodSeconds: 15}`) + scCode(`k autoscale deploy web --cpu=60% --min=2 --max=20     # cách nhanh trong đề thi
k get hpa web -w
k describe hpa web          # Conditions và Events: vì sao scale / không scale`)) +
    scDet("Giả định của mô phỏng", '<p class="small">Mỗi Pod request 500m CPU và phục vụ 100 req/s ở 100% request. Pod Ready sau 30 giây, node mới sẵn sàng sau 90 giây, mỗi node chứa 4 Pod, tối đa 7 node. Cluster Autoscaler bỏ một node khi cluster dư hẳn một node trong 10 phút (thật: node dùng dưới 50% requests trong 10 phút). Bỏ qua chi tiết Pod chưa Ready bị tính 0% CPU.</p>') + "</div>";
}
function hpaReset() {
  hpaStop();
  hpa = { t: 0, spec: 3, pods: [], nodes: [], recs: [], hist: [], log: [], idle: 0, lastFormula: "" };
  for (let i = 0; i < 2; i++) hpa.nodes.push({ id: i + 1, ready: 0 });
  for (let i = 0; i < 3; i++) hpa.pods.push({ ready: 0, node: i % 2 + 1 });
  hpaLog("Bắt đầu: 3 Pod trên 2 node, HPA mục tiêu " + hpaTarget + "% CPU.");
  hpaRecord(); hpaDraw();
  const b = $("#scBody");
  b.oninput = e => { if (e.target.id === "hpaTarget") { hpaTarget = +e.target.value; $("#hpaTv").textContent = hpaTarget + "%"; hpaDraw(); } };
  b.onchange = e => { if (e.target.id === "hpaCA") hpaCA = e.target.checked; };
  b.onclick = e => {
    const p = e.target.closest("[data-prof]"); if (p) { hpaProf = p.dataset.prof; $$("#hpaProf button").forEach(x => x.setAttribute("aria-pressed", x === p ? "true" : "false")); hpaReset(); return; }
    const s = e.target.closest("[data-spd]"); if (s) { hpaSpeed = +s.dataset.spd; $$("[data-spd]").forEach(x => x.setAttribute("aria-pressed", x === s ? "true" : "false")); if (hpaTimer) { hpaStop(); hpaStart(); } return; }
    if (e.target.closest("#hpaPlay")) { if (hpaTimer) hpaStop(); else { if (hpa.t >= HPA_T) hpaReset(); hpaStart(); } return; }
    if (e.target.closest("#hpaResetB")) hpaReset();
  };
}
function hpaStart() { const b = $("#hpaPlay"); if (b) b.textContent = "❚❚ Dừng"; hpaTimer = setInterval(hpaTick, RM ? 120 : 420 / hpaSpeed); }
function hpaStop() { if (hpaTimer) clearInterval(hpaTimer); hpaTimer = null; const b = $("#hpaPlay"); if (b) b.textContent = "▶ Chạy"; }
const hpaClock = t => String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
function hpaLog(m) { if (!hpa) return; hpa.log.unshift("[" + hpaClock(hpa.t) + "] " + m); hpa.log = hpa.log.slice(0, 7); }
const hpaLoad = t => Math.round(HPA_PROFILES[hpaProf][1](t));
function hpaState() {
  const readyNodes = hpa.nodes.filter(n => n.ready <= hpa.t);
  const readyPods = hpa.pods.filter(p => p.node && p.ready <= hpa.t);
  const util = readyPods.length ? hpaLoad(hpa.t) / (readyPods.length * POD_RPS) * 100 : 0;
  return { readyNodes, readyPods, util, pending: hpa.pods.filter(p => !p.node), starting: hpa.pods.filter(p => p.node && p.ready > hpa.t) };
}
function hpaPlace() {
  const ready = hpa.nodes.filter(n => n.ready <= hpa.t);
  hpa.pods.filter(p => !p.node).forEach(p => {
    const n = ready.find(n => hpa.pods.filter(q => q.node === n.id).length < PODS_PER_NODE);
    if (n) { p.node = n.id; p.ready = hpa.t + POD_BOOT; }
  });
}
function hpaTick() {
  if (current !== "scale" || !$("#hpaTiles")) { hpaStop(); return; }
  if (hpa.t >= HPA_T) { hpaStop(); hpaLog("Hết kịch bản 45 phút."); hpaDraw(); return; }
  hpa.t += HPA_STEP;
  hpa.nodes.forEach(n => { if (n.ready === hpa.t) hpaLog("node-" + n.id + " Ready, Pod Pending được xếp lên."); });
  hpaPlace();
  const st = hpaState(), R = st.readyPods.length;
  /* HPA */
  let desired = hpa.spec, note;
  if (R > 0) {
    const ratio = st.util / hpaTarget;
    const raw = Math.ceil(R * ratio);
    if (Math.abs(ratio - 1) <= 0.1) { desired = hpa.spec; note = "CPU " + Math.round(st.util) + "% trong ngưỡng ±10% quanh " + hpaTarget + "%: giữ nguyên " + hpa.spec + " Pod."; }
    else { desired = Math.max(hpaMin, Math.min(hpaMax, raw)); note = "desired = ceil(" + R + " × " + Math.round(st.util) + "% / " + hpaTarget + "%) = " + raw + (raw > hpaMax ? " → chặn ở maxReplicas " + hpaMax : raw < hpaMin ? " → giữ minReplicas " + hpaMin : ""); }
  }
  hpa.recs.push([hpa.t, desired]); hpa.recs = hpa.recs.filter(r => r[0] > hpa.t - 300);
  let next = hpa.spec;
  if (desired > hpa.spec) { next = Math.min(desired, hpa.spec + Math.max(4, hpa.spec)); if (next < desired) note += " → mỗi 15s tăng tối đa max(4 Pod, 100%) nên lên " + next; }
  else if (desired < hpa.spec) {
    const hold = Math.max(...hpa.recs.map(r => r[1]));
    next = Math.max(desired, Math.min(hpa.spec, hold));
    if (next > desired) note += " → nhưng giữ " + next + ": cửa sổ ổn định 300s lấy đề xuất cao nhất 5 phút qua.";
  }
  hpa.lastFormula = note || "Chưa có Pod Ready để đo CPU.";
  if (next !== hpa.spec) {
    hpaLog("HPA: " + hpa.spec + " → " + next + " Pod (CPU " + Math.round(st.util) + "%, mục tiêu " + hpaTarget + "%).");
    if (next > hpa.spec) for (let i = hpa.spec; i < next; i++) hpa.pods.push({ node: 0, ready: 0 });
    else {
      let rm = hpa.spec - next;
      const order = [...hpa.pods.filter(p => !p.node), ...hpa.pods.filter(p => p.node && p.ready > hpa.t), ...hpa.pods.filter(p => p.node && p.ready <= hpa.t).reverse()];
      order.slice(0, rm).forEach(p => hpa.pods.splice(hpa.pods.indexOf(p), 1));
    }
    hpa.spec = next; hpaPlace();
  }
  /* Cluster Autoscaler */
  const pend = hpa.pods.filter(p => !p.node).length, booting = hpa.nodes.filter(n => n.ready > hpa.t).length;
  if (pend > 0) {
    if (!hpaCA) { if (hpa.t % 60 === 0) hpaLog(pend + " Pod Pending: FailedScheduling, Insufficient cpu (Cluster Autoscaler đang tắt)."); }
    else {
      const need = Math.ceil(pend / PODS_PER_NODE) - booting;
      const room = MAX_NODES - hpa.nodes.length;
      const add = Math.min(need, room);
      if (add > 0) { for (let i = 0; i < add; i++) { const id = Math.max(...hpa.nodes.map(n => n.id)) + 1; hpa.nodes.push({ id, ready: hpa.t + NODE_BOOT }); } hpaLog("Cluster Autoscaler: " + pend + " Pod Pending → thêm " + add + " node (sẵn sàng sau " + NODE_BOOT + "s)."); }
      else if (room <= 0 && need > 0 && hpa.t % 60 === 0) hpaLog("Đã tới số node tối đa " + MAX_NODES + ": Pod vẫn Pending.");
    }
  }
  const readyN = hpa.nodes.filter(n => n.ready <= hpa.t);
  if (hpaCA && readyN.length > MIN_NODES && hpa.pods.length <= (readyN.length - 1) * PODS_PER_NODE && pend === 0) {
    hpa.idle += HPA_STEP;
    if (hpa.idle >= 600) {
      const surplus = readyN.length - Math.max(MIN_NODES, Math.ceil(hpa.pods.length / PODS_PER_NODE));
      const victims = readyN.slice().sort((a, b) => hpa.pods.filter(p => p.node === a.id).length - hpa.pods.filter(p => p.node === b.id).length).slice(0, surplus);
      victims.forEach(v => { hpa.pods.filter(p => p.node === v.id).forEach(p => { p.node = 0; }); hpa.nodes.splice(hpa.nodes.indexOf(v), 1); });
      hpaPlace();
      hpaLog("Cluster Autoscaler: node dư suốt 10 phút → drain và xóa " + victims.map(v => "node-" + v.id).join(", ") + ".");
      hpa.idle = 0;
    }
  } else hpa.idle = 0;
  hpaRecord(); hpaDraw();
}
function hpaRecord() {
  const st = hpaState();
  hpa.hist.push({ t: hpa.t, need: hpaLoad(hpa.t) / (POD_RPS * hpaTarget / 100), ready: st.readyPods.length, spec: hpa.spec, nodes: hpa.nodes.filter(n => n.ready <= hpa.t).length });
}
function hpaDraw() {
  if (!$("#hpaTiles")) return;
  const st = hpaState(), load = hpaLoad(hpa.t), over = st.util > 100;
  const tile = (k, v, cls) => '<div class="ft' + (cls ? " " + cls : "") + '"><span>' + k + "</span><b>" + v + "</b></div>";
  $("#hpaTiles").innerHTML = '<div class="facts4">' + tile("Tải", load + " req/s") + tile("CPU trung bình", Math.round(st.util) + "% / " + hpaTarget + "%", over ? "bad" : Math.abs(st.util / hpaTarget - 1) <= .1 ? "ok" : "warn") +
    tile("Pod Ready / replicas", st.readyPods.length + " / " + hpa.spec) + tile("Pending", st.pending.length, st.pending.length ? "bad" : "") + tile("Node", hpa.nodes.filter(n => n.ready <= hpa.t).length + (hpa.nodes.some(n => n.ready > hpa.t) ? " + đang tạo" : ""), "") + "</div>" +
    (over ? '<p class="small" style="margin:6px 0 0;color:var(--bad)">Pod chạy quá 100% request: CPU bị tranh, độ trễ tăng cho tới khi Pod mới Ready.</p>' : "");
  $("#hpaFormula").textContent = hpa.lastFormula || "Bấm Chạy: mỗi bước là 15 giây, đúng nhịp kiểm tra của HPA.";
  $("#hpaClock").textContent = hpaClock(hpa.t) + " / 45:00";
  /* node */
  const svg = $("#hpaNodes"); let s = "";
  const W = 118, gap = 10;
  hpa.nodes.forEach((n, i) => {
    const x = 10 + i * (W + gap), ready = n.ready <= hpa.t;
    s += '<rect x="' + x + '" y="12" width="' + W + '" height="110" rx="9" class="' + (ready ? "sc-node" : "sc-node boot") + '"/>' +
      '<text x="' + (x + 10) + '" y="30" class="sv-tb">node-' + n.id + "</text>" + (ready ? "" : '<text x="' + (x + 10) + '" y="70" class="sv-s">đang tạo…</text>');
    hpa.pods.filter(p => p.node === n.id).forEach((p, k) => {
      const px = x + 8 + (k % 2) * 52, py = 40 + Math.floor(k / 2) * 40;
      s += '<rect x="' + px + '" y="' + py + '" width="46" height="32" rx="5" class="sc-pod ' + (p.ready <= hpa.t ? "on" : "start") + '"/><text x="' + (px + 23) + '" y="' + (py + 20) + '" text-anchor="middle" class="sc-pt">' + (p.ready <= hpa.t ? "Pod" : "…") + "</text>";
    });
  });
  const pend = st.pending.length;
  if (pend) {
    const x = 10 + hpa.nodes.length * (W + gap);
    s += '<rect x="' + x + '" y="12" width="' + Math.max(80, Math.min(990 - x, 150)) + '" height="110" rx="9" class="sc-pend"/><text x="' + (x + 10) + '" y="30" class="sv-tb" style="fill:var(--bad)">Pending: ' + pend + "</text>";
    for (let k = 0; k < Math.min(pend, 6); k++) s += '<rect x="' + (x + 8 + (k % 2) * 34) + '" y="' + (40 + Math.floor(k / 2) * 26) + '" width="30" height="20" rx="4" class="sc-pod pend"/>';
  }
  s += '<text x="10" y="150" class="sv-s">Mỗi node chứa ' + PODS_PER_NODE + " Pod (theo requests). Xanh: Ready. Vàng: đang khởi động. Đỏ: Pending vì hết chỗ.</text>";
  svg.innerHTML = s;
  /* chart */
  const ch = $("#hpaChart"), X = t => 40 + t / HPA_T * 940, maxY = 24, Y = v => 180 - Math.min(v, maxY) / maxY * 165;
  let c = "";
  for (let v = 0; v <= maxY; v += 6) c += '<line x1="40" x2="980" y1="' + Y(v) + '" y2="' + Y(v) + '" class="sc-grid"/><text x="32" y="' + (Y(v) + 4) + '" text-anchor="end" class="sv-s">' + v + "</text>";
  for (let t = 0; t <= HPA_T; t += 450) c += '<text x="' + X(t) + '" y="196" text-anchor="middle" class="sv-s">' + t / 60 + "′</text>";
  const prof = []; for (let t = 0; t <= HPA_T; t += 15) prof.push(X(t).toFixed(1) + "," + Y(Math.round(HPA_PROFILES[hpaProf][1](t)) / (POD_RPS * hpaTarget / 100)).toFixed(1));
  c += '<polyline points="' + prof.join(" ") + '" class="sc-l need"/>';
  const step = key => { let d = ""; hpa.hist.forEach((h, i) => { d += (i ? " L" : "M") + X(h.t).toFixed(1) + " " + Y(h[key]).toFixed(1); if (hpa.hist[i + 1]) d += " L" + X(hpa.hist[i + 1].t).toFixed(1) + " " + Y(h[key]).toFixed(1); }); return d; };
  c += '<path d="' + step("spec") + '" class="sc-l spec"/><path d="' + step("ready") + '" class="sc-l ready"/><path d="' + step("nodes") + '" class="sc-l nodes"/>';
  c += '<line x1="' + X(hpa.t) + '" x2="' + X(hpa.t) + '" y1="10" y2="180" class="sc-now"/>';
  ch.innerHTML = c;
  $("#hpaLog").innerHTML = hpa.log.map((l, i) => '<span class="' + (i ? "dim" : "") + '">' + scEsc(l) + "</span>").join("\n");
}

/* ================= 2. ước lượng số node ================= */
const NODE_PRESETS = [["2 vCPU · 8 GiB", 2, 8], ["4 vCPU · 8 GiB (compute)", 4, 8], ["4 vCPU · 16 GiB", 4, 16], ["8 vCPU · 32 GiB", 8, 32], ["16 vCPU · 64 GiB", 16, 64], ["4 vCPU · 32 GiB (memory)", 4, 32], ["8 vCPU · 64 GiB (memory)", 8, 64]];
let ndWl = null, ndPreset = 3, ndMode = "gke", ndPeak = false;
const ND_DEFAULT = [["web", 6, 20, 250, 512], ["api", 4, 12, 500, 1024], ["worker", 3, 6, 1000, 2048], ["redis", 1, 1, 500, 2048], ["postgres", 2, 2, 1000, 4096]];
function ndReserved(cpu, gib, mode, maxPods) {
  const c = cpu, m = gib * 1024;
  let rc = 0, rm = 0;
  if (mode === "gke" || mode === "eks") {
    rc = 60 + (c > 1 ? 10 * (Math.min(c, 2) - 1) : 0) + (c > 2 ? 5 * (Math.min(c, 4) - 2) : 0) + (c > 4 ? 2.5 * (c - 4) : 0);
    if (mode === "gke") { const g = gib; rm = 1024 * (0.25 * Math.min(g, 4) + 0.2 * Math.max(0, Math.min(g, 8) - 4) + 0.1 * Math.max(0, Math.min(g, 16) - 8) + 0.06 * Math.max(0, Math.min(g, 128) - 16) + 0.02 * Math.max(0, g - 128)); }
    else rm = 255 + 11 * maxPods;
  }
  return { cpu: Math.round(rc), mem: Math.round(rm), evict: 100 };
}
function nodeHTML() {
  if (!ndWl) ndWl = ND_DEFAULT.map(r => r.slice());
  const num = (id, v, lab, step, min) => '<label class="f">' + lab + '<input type="number" id="' + id + '" value="' + v + '" step="' + (step || 1) + '" min="' + (min || 0) + '"></label>';
  return '<div class="panel col">' + scTl(["Pod được xếp theo <b>requests</b>, không theo mức dùng thật.", "Chỗ dùng được = <b>allocatable</b> − DaemonSet − khoảng trống dự phòng.", "Nghẽn ở CPU hay RAM cho biết nên đổi <b>loại node</b>."]) + "</div>" +
    '<div class="panel col"><h4>1 · Workload (requests của mỗi Pod)</h4><div class="tbl"><table class="nd-wl"><thead><tr><th>Tên</th><th>Replicas</th><th>Tối đa (HPA)</th><th>CPU (m)</th><th>RAM (Mi)</th><th></th></tr></thead><tbody id="ndRows"></tbody></table></div>' +
    '<div class="controls"><button type="button" class="btn" id="ndAdd">+ Thêm workload</button><div class="seg" role="group" aria-label="Tính theo"><button type="button" data-peak="0" aria-pressed="' + !ndPeak + '">Lúc bình thường</button><button type="button" data-peak="1" aria-pressed="' + ndPeak + '">Lúc đỉnh (HPA max)</button></div><span class="hint" id="ndDemand"></span></div></div>' +
    '<div class="panel col"><h4>2 · Node</h4><div class="formrow">' +
    '<label class="f" style="min-width:220px">Loại node<select id="ndPreset">' + NODE_PRESETS.map((p, i) => '<option value="' + i + '"' + (i === ndPreset ? " selected" : "") + ">" + p[0] + "</option>").join("") + '<option value="-1">Tự nhập</option></select></label>' +
    num("ndCpu", NODE_PRESETS[ndPreset][1], "vCPU") + num("ndMem", NODE_PRESETS[ndPreset][2], "RAM (GiB)") +
    '<label class="f">Phần giữ cho hệ thống<select id="ndMode"><option value="gke"' + (ndMode === "gke" ? " selected" : "") + '>Kiểu GKE</option><option value="eks"' + (ndMode === "eks" ? " selected" : "") + '>Kiểu EKS</option><option value="kubeadm"' + (ndMode === "kubeadm" ? " selected" : "") + ">kubeadm mặc định (không giữ)</option></select></label></div>" +
    '<div class="formrow">' + num("ndDsCpu", 250, "DaemonSet mỗi node: CPU (m)", 50) + num("ndDsMem", 400, "DaemonSet: RAM (Mi)", 50) + num("ndMaxPods", 110, "maxPods") +
    '<label class="f" style="min-width:180px">Dùng tối đa: <b id="ndUtilV">80%</b><input type="range" id="ndUtil" min="50" max="95" step="5" value="80"></label>' +
    '<label class="check"><input type="checkbox" id="ndSpare" checked> Thêm 1 node dự phòng (N+1)</label></div>' +
    '<div class="formrow">' + num("ndPc", 0.033, "Giá giả định $/vCPU·giờ", 0.001) + num("ndPm", 0.0045, "$/GiB·giờ", 0.0005) + "</div></div>" +
    '<div class="panel col"><h4>3 · Kết quả</h4><div id="ndOut"></div></div>';
}
function ndRowsHTML() {
  return ndWl.map((r, i) => '<tr data-i="' + i + '"><td><input type="text" value="' + scEsc(r[0]) + '" data-k="0" aria-label="Tên"></td>' + [1, 2, 3, 4].map(k => '<td><input type="number" min="0" value="' + r[k] + '" data-k="' + k + '" step="' + (k > 2 ? 50 : 1) + '"></td>').join("") + '<td><button type="button" class="linkbtn" data-del="' + i + '" aria-label="Xóa">✕</button></td></tr>').join("");
}
function ndPack(wl, cap, maxPodsFree) {
  const items = [];
  wl.forEach((r, wi) => { const n = ndPeak ? Math.max(r[1], r[2]) : r[1]; for (let k = 0; k < n; k++) items.push({ wi, c: +r[3], m: +r[4] }); });
  items.sort((a, b) => Math.max(b.c / cap.c, b.m / cap.m) - Math.max(a.c / cap.c, a.m / cap.m));
  const bins = []; let tooBig = 0;
  items.forEach(it => {
    if (it.c > cap.c || it.m > cap.m) { tooBig++; return; }
    let b = bins.find(b => b.c + it.c <= cap.c && b.m + it.m <= cap.m && b.items.length < maxPodsFree);
    if (!b) { b = { c: 0, m: 0, items: [] }; bins.push(b); }
    b.c += it.c; b.m += it.m; b.items.push(it);
  });
  const dem = items.reduce((a, x) => ({ c: a.c + x.c, m: a.m + x.m }), { c: 0, m: 0 });
  return { bins, tooBig, dem, pods: items.length };
}
const ND_COL = ["var(--accent)", "var(--node)", "var(--pkt)", "var(--data)", "var(--bad)", "#8a6d3b", "#5b7083", "#2f8f83"];
function nodeCalc() {
  const b = $("#scBody");
  if (!$("#ndRows")) return;
  $("#ndRows").innerHTML = ndRowsHTML();
  const read = () => {
    const cpu = +$("#ndCpu").value, gib = +$("#ndMem").value, maxPods = +$("#ndMaxPods").value, util = +$("#ndUtil").value / 100;
    const res = ndReserved(cpu, gib, ndMode, maxPods);
    const dsC = +$("#ndDsCpu").value, dsM = +$("#ndDsMem").value;
    const allocC = cpu * 1000 - res.cpu, allocM = gib * 1024 - res.mem - res.evict;
    return { cpu, gib, maxPods, util, res, dsC, dsM, allocC, allocM, cap: { c: Math.max(0, (allocC - dsC) * util), m: Math.max(0, (allocM - dsM) * util) } };
  };
  const run = () => {
    const P = read(), r = ndPack(ndWl, P.cap, P.maxPods - 5);
    const spare = $("#ndSpare").checked ? 1 : 0, nodes = r.bins.length + spare;
    const price = P.cpu * +$("#ndPc").value + P.gib * +$("#ndPm").value, month = price * 730 * nodes;
    const totC = r.bins.reduce((a, x) => a + x.c, 0), totM = r.bins.reduce((a, x) => a + x.m, 0);
    const uC = r.bins.length ? totC / (r.bins.length * P.cap.c) : 0, uM = r.bins.length ? totM / (r.bins.length * P.cap.m) : 0;
    const bott = uC >= uM ? "CPU" : "RAM";
    $("#ndDemand").textContent = r.pods + " Pod · " + (r.dem.c / 1000).toFixed(1) + " vCPU · " + (r.dem.m / 1024).toFixed(1) + " GiB requests";
    const seg = (v, cls, lab) => v > 0 ? '<i class="' + cls + '" style="flex-grow:' + v + '" title="' + lab + '"><span>' + lab + "</span></i>" : "";
    const bar = (tot, parts) => '<div class="nd-bar">' + parts.map(p => seg(p[0], p[1], p[2])).join("") + "</div>";
    const ac = P.cpu * 1000, am = P.gib * 1024;
    let h = '<div class="facts4">' +
      '<div class="ft ok"><span>Số node cần</span><b>' + nodes + (spare ? " (" + r.bins.length + " + 1 dự phòng)" : "") + "</b></div>" +
      '<div class="ft ' + (bott === "CPU" ? "warn" : "") + '"><span>CPU dùng (requests)</span><b>' + Math.round(uC * 100) + "% chỗ dùng được</b></div>" +
      '<div class="ft ' + (bott === "RAM" ? "warn" : "") + '"><span>RAM dùng (requests)</span><b>' + Math.round(uM * 100) + "% chỗ dùng được</b></div>" +
      '<div class="ft"><span>Chi phí giả định</span><b>$' + Math.round(month).toLocaleString("en-US") + " / tháng</b></div></div>";
    if (r.tooBig) h += '<p class="small" style="color:var(--bad)">' + r.tooBig + " Pod lớn hơn chỗ dùng được của một node: chọn node lớn hơn hoặc giảm requests.</p>";
    h += '<p class="take">Nghẽn ở <b>' + bott + "</b>. " + (Math.abs(uC - uM) > 0.25 ? "Tài nguyên còn lại bị lãng phí: workload cần khoảng " + (r.dem.m / 1024 / Math.max(.1, r.dem.c / 1000)).toFixed(1) + " GiB mỗi vCPU, node đang là " + (P.gib / P.cpu).toFixed(1) + " GiB mỗi vCPU." : "CPU và RAM khá cân, loại node này hợp.") + "</p>";
    h += '<h4>Một node ' + P.cpu + " vCPU · " + P.gib + " GiB chia ra sao</h4>" +
      '<div class="nd-lab">CPU (m)</div>' + bar(ac, [[P.res.cpu, "r1", "hệ thống " + P.res.cpu], [P.dsC, "r2", "DaemonSet " + P.dsC], [P.allocC - P.dsC - P.cap.c, "r3", "dự phòng " + Math.round(P.allocC - P.dsC - P.cap.c)], [P.cap.c, "r4", "cho Pod " + Math.round(P.cap.c)]]) +
      '<div class="nd-lab">RAM (Mi)</div>' + bar(am, [[P.res.mem + P.res.evict, "r1", "hệ thống + eviction " + (P.res.mem + P.res.evict)], [P.dsM, "r2", "DaemonSet " + P.dsM], [P.allocM - P.dsM - P.cap.m, "r3", "dự phòng " + Math.round(P.allocM - P.dsM - P.cap.m)], [P.cap.m, "r4", "cho Pod " + Math.round(P.cap.m)]]) +
      '<p class="small muted">Allocatable = capacity − kube-reserved − system-reserved − eviction (' + Math.round(P.allocC) + "m, " + Math.round(P.allocM) + "Mi). " + (ndMode === "kubeadm" ? "kubeadm không giữ gì cho hệ thống: kubelet và containerd tranh tài nguyên với Pod, nên đặt kubeReserved và systemReserved." : "Phần hệ thống tính theo công thức gần đúng của " + ndMode.toUpperCase() + ".") + "</p>";
    h += "<h4>Xếp Pod lên node</h4><div class=\"nd-nodes\">" + r.bins.map((bn, i) => '<div class="nd-node"><b>node-' + (i + 1) + "</b>" +
      '<div class="nd-mini">' + ndWl.map((w, wi) => { const c = bn.items.filter(x => x.wi === wi).reduce((a, x) => a + x.c, 0); return c ? '<i style="flex-grow:' + c + ";background:" + ND_COL[wi % ND_COL.length] + '"></i>' : ""; }).join("") + '<i class="free" style="flex-grow:' + Math.max(0, P.cap.c - bn.c) + '"></i></div>' +
      '<div class="nd-mini">' + ndWl.map((w, wi) => { const m = bn.items.filter(x => x.wi === wi).reduce((a, x) => a + x.m, 0); return m ? '<i style="flex-grow:' + m + ";background:" + ND_COL[wi % ND_COL.length] + '"></i>' : ""; }).join("") + '<i class="free" style="flex-grow:' + Math.max(0, P.cap.m - bn.m) + '"></i></div>' +
      '<small>' + bn.items.length + " Pod · CPU " + Math.round(bn.c / P.cap.c * 100) + "% · RAM " + Math.round(bn.m / P.cap.m * 100) + "%</small></div>").join("") + (spare ? '<div class="nd-node spare"><b>dự phòng</b><small>Chịu được mất 1 node mà Pod vẫn có chỗ.</small></div>' : "") + "</div>" +
      '<div class="sc-leg">' + ndWl.map((w, wi) => '<span><i style="background:' + ND_COL[wi % ND_COL.length] + '"></i>' + scEsc(w[0]) + "</span>").join("") + '<span><i class="free"></i>trống</span></div><p class="small muted">Thanh trên: CPU. Thanh dưới: RAM.</p>';
    /* so sánh loại node */
    const rows = NODE_PRESETS.map((p, i) => {
      const res = ndReserved(p[1], p[2], ndMode, P.maxPods), aC = p[1] * 1000 - res.cpu, aM = p[2] * 1024 - res.mem - res.evict;
      const cap = { c: Math.max(0, (aC - P.dsC) * P.util), m: Math.max(0, (aM - P.dsM) * P.util) };
      const rr = ndPack(ndWl, cap, P.maxPods - 5), n = rr.bins.length + spare, pr = (p[1] * +$("#ndPc").value + p[2] * +$("#ndPm").value) * 730 * n;
      return { i, name: p[0], n, pr, bad: rr.tooBig };
    });
    const best = rows.filter(x => !x.bad).sort((a, b) => a.pr - b.pr)[0];
    h += scDet("So sánh các loại node cho cùng workload", '<div class="tbl"><table><thead><tr><th>Loại node</th><th>Số node</th><th>Chi phí / tháng</th></tr></thead><tbody>' + rows.map(x => "<tr" + (best && x.i === best.i ? ' class="hlrow"' : "") + "><td>" + scEsc(x.name) + (best && x.i === best.i ? ' <span class="pill ok">rẻ nhất</span>' : "") + "</td><td>" + (x.bad ? "Pod không vừa" : x.n) + "</td><td>" + (x.bad ? "—" : "$" + Math.round(x.pr).toLocaleString("en-US")) + "</td></tr>").join("") + '</tbody></table></div><p class="small muted">Node to thì ít lãng phí hơn cho phần hệ thống và DaemonSet nhưng mất một node là mất nhiều Pod; nên có ít nhất 3 node để rải replica.</p>', true);
    $("#ndOut").innerHTML = h;
    $("#ndUtilV").textContent = Math.round(P.util * 100) + "%";
  };
  b.oninput = e => {
    const tr = e.target.closest("tr[data-i]");
    if (tr) { const k = +e.target.dataset.k; ndWl[+tr.dataset.i][k] = k ? +e.target.value : e.target.value; }
    if (e.target.id === "ndCpu" || e.target.id === "ndMem") { $("#ndPreset").value = "-1"; }
    run();
  };
  b.onchange = e => {
    if (e.target.id === "ndPreset" && +e.target.value >= 0) { ndPreset = +e.target.value; $("#ndCpu").value = NODE_PRESETS[ndPreset][1]; $("#ndMem").value = NODE_PRESETS[ndPreset][2]; }
    if (e.target.id === "ndMode") ndMode = e.target.value;
    run();
  };
  b.onclick = e => {
    if (e.target.closest("#ndAdd")) { ndWl.push(["app-" + (ndWl.length + 1), 2, 4, 250, 256]); $("#ndRows").innerHTML = ndRowsHTML(); run(); return; }
    const d = e.target.closest("[data-del]"); if (d) { ndWl.splice(+d.dataset.del, 1); $("#ndRows").innerHTML = ndRowsHTML(); run(); return; }
    const pk = e.target.closest("[data-peak]"); if (pk) { ndPeak = pk.dataset.peak === "1"; $$("[data-peak]").forEach(x => x.setAttribute("aria-pressed", x === pk ? "true" : "false")); run(); }
  };
  run();
}

/* ================= 3. rightsizing ================= */
function rightHTML() {
  const f = (id, lab, v) => '<label class="f">' + lab + '<input type="number" id="' + id + '" value="' + v + '" min="0" step="10"></label>';
  return '<div class="panel col">' + scTl(["Đặt requests theo <b>mức dùng thật</b> (p90 + biên), không đoán.", "RAM: request = limit, cao hơn đỉnh đã thấy: thiếu RAM là <b>OOMKilled</b>.", "CPU: limit thấp gây <b>throttling</b>; nhiều đội bỏ CPU limit."]) + "</div>" +
    '<div class="panel col"><h4>Số đo của một container (7 ngày)</h4><div class="formrow">' + f("rgCpuReq", "CPU request hiện tại (m)", 1000) + f("rgCpuLim", "CPU limit (m, 0 = không)", 2000) + f("rgMemReq", "RAM request (Mi)", 2048) + f("rgMemLim", "RAM limit (Mi)", 2048) + f("rgRep", "Replicas", 6) + "</div>" +
    '<div class="formrow">' + f("rgCpu90", "CPU p90 (m)", 180) + f("rgCpuMax", "CPU cao nhất (m)", 650) + f("rgMem90", "RAM p90 (Mi)", 610) + f("rgMemMax", "RAM cao nhất (Mi)", 780) + "</div></div>" +
    '<div class="panel col" id="rgOut"></div>' +
    '<div class="panel col">' + scDet("Lấy số đo ở đâu", scCode(`# nhanh, chỉ là hiện tại
k top pod -n shop --containers
# Prometheus: p90 CPU 7 ngày (core) và đỉnh RAM 7 ngày
quantile_over_time(0.9, rate(container_cpu_usage_seconds_total{namespace="shop",container="api"}[5m])[7d:5m])
max_over_time(container_memory_working_set_bytes{namespace="shop",container="api"}[7d])
# CPU bị bóp vì limit
rate(container_cpu_cfs_throttled_periods_total{container="api"}[5m]) / rate(container_cpu_cfs_periods_total{container="api"}[5m])
# VPA ở chế độ Off chỉ đưa khuyến nghị, không đụng Pod
k describe vpa api | sed -n '/Recommendation/,$p'`)) +
    scDet("Đổi requests không cần tạo lại Pod (in-place resize)", scCode(`# Kubernetes v1.35+: resize ngay trên Pod đang chạy (subresource resize)
k patch pod api-7d9f-x2 --subresource resize --patch \\
  '{"spec":{"containers":[{"name":"api","resources":{"requests":{"cpu":"250m"},"limits":{"cpu":"500m"}}}]}}'
k get pod api-7d9f-x2 -o jsonpath='{.status.containerStatuses[0].resources}'
# Lâu dài: sửa Deployment để Pod mới cũng dùng số mới
k set resources deploy/api -c api --requests=cpu=250m,memory=900Mi --limits=memory=900Mi`)) + "</div>";
}
function rightCalc() {
  const b = $("#scBody");
  const v = id => +$("#" + id).value;
  const run = () => {
    const rep = v("rgRep");
    const cpuReq = Math.max(10, Math.round(v("rgCpu90") * 1.15 / 10) * 10);
    const memReq = Math.max(32, Math.ceil(Math.max(v("rgMem90") * 1.15, v("rgMemMax") * 1.1) / 16) * 16);
    const risks = [];
    if (v("rgMemLim") && v("rgMemLim") < v("rgMemMax") * 1.05) risks.push(["bad", "RAM limit " + v("rgMemLim") + "Mi sát hoặc dưới đỉnh " + v("rgMemMax") + "Mi: nguy cơ OOMKilled."]);
    if (v("rgCpuLim") && v("rgCpuLim") < v("rgCpuMax")) risks.push(["warn", "CPU limit " + v("rgCpuLim") + "m thấp hơn đỉnh " + v("rgCpuMax") + "m: bị throttling lúc cao điểm."]);
    if (v("rgCpuReq") > cpuReq * 2) risks.push(["warn", "CPU request gấp " + (v("rgCpuReq") / cpuReq).toFixed(1) + " lần mức cần: giữ chỗ trên node mà không dùng."]);
    if (v("rgMemReq") > memReq * 1.5) risks.push(["warn", "RAM request dư " + (v("rgMemReq") - memReq) + "Mi mỗi Pod."]);
    if (v("rgMemReq") < v("rgMem90")) risks.push(["bad", "RAM request thấp hơn mức dùng thường xuyên: Pod dễ bị evict trước khi node thiếu RAM."]);
    const saveC = (v("rgCpuReq") - cpuReq) * rep, saveM = (v("rgMemReq") - memReq) * rep;
    const W = Math.max(v("rgCpuReq"), v("rgCpuLim"), v("rgCpuMax"), cpuReq) * 1.05, WM = Math.max(v("rgMemReq"), v("rgMemLim"), v("rgMemMax"), memReq) * 1.05;
    const mk = (lab, max, rows) => '<div class="rg-g"><b>' + lab + "</b>" + rows.map(r => '<div class="rg-b"><span>' + r[0].replace(/ \d+$/, "") + '</span><div class="rg-t"><i class="' + r[2] + '" style="width:' + (r[1] / max * 100).toFixed(1) + '%"></i></div><em>' + r[1] + (lab === "CPU" ? "m" : "Mi") + "</em></div>").join("") + "</div>";
    let h = "<h4>Khuyến nghị</h4>" + '<div class="facts4"><div class="ft ok"><span>CPU request</span><b>' + cpuReq + "m</b></div><div class=\"ft\"><span>CPU limit</span><b>không đặt, hoặc ≥ " + Math.max(cpuReq * 2, Math.ceil(v("rgCpuMax") / 50) * 50) + 'm</b></div><div class="ft ok"><span>RAM request = limit</span><b>' + memReq + 'Mi</b></div><div class="ft ' + (saveC > 0 || saveM > 0 ? "ok" : "warn") + '"><span>Tiết kiệm (' + rep + " Pod)</span><b>" + (saveC / 1000).toFixed(2) + " vCPU · " + (saveM / 1024).toFixed(2) + " GiB</b></div></div>" +
      '<p class="small muted">Cách tính gần giống VPA: CPU = p90 × 1,15; RAM = max(p90 × 1,15; đỉnh × 1,1). QoS sau khi đổi: <b>Burstable</b> (CPU không limit) — đặt CPU limit = request nếu cần Guaranteed.</p>' +
      '<div class="rg">' + mk("CPU", W, [["dùng p90 " + v("rgCpu90"), v("rgCpu90"), "use"], ["đỉnh " + v("rgCpuMax"), v("rgCpuMax"), "peak"], ["request cũ " + v("rgCpuReq"), v("rgCpuReq"), "old"], ["request mới " + cpuReq, cpuReq, "new"]].concat(v("rgCpuLim") ? [["limit " + v("rgCpuLim"), v("rgCpuLim"), "lim"]] : [])) +
      mk("RAM", WM, [["dùng p90 " + v("rgMem90"), v("rgMem90"), "use"], ["đỉnh " + v("rgMemMax"), v("rgMemMax"), "peak"], ["request cũ " + v("rgMemReq"), v("rgMemReq"), "old"], ["request mới " + memReq, memReq, "new"]].concat(v("rgMemLim") ? [["limit " + v("rgMemLim"), v("rgMemLim"), "lim"]] : [])) + "</div>" +
      (risks.length ? '<ul class="tight">' + risks.map(r => '<li><span class="pill ' + r[0] + '">' + (r[0] === "bad" ? "rủi ro" : "lưu ý") + "</span> " + scEsc(r[1]) + "</li>").join("") + "</ul>" : "") +
      scCode("k set resources deploy/api -c api --requests=cpu=" + cpuReq + "m,memory=" + memReq + "Mi --limits=memory=" + memReq + "Mi");
    $("#rgOut").innerHTML = h;
  };
  b.oninput = run; b.onchange = null; b.onclick = null; run();
}

/* ================= 4. các kiểu scaling ================= */
const SC_KINDS = [
  ["kubectl scale", "Pod", "bạn quyết định", "Thử nghiệm, sự kiện biết trước", "Bị HPA hoặc GitOps ghi đè", "k scale deploy/web --replicas=5"],
  ["HPA", "số Pod", "CPU, RAM, metric tùy chỉnh", "Ứng dụng stateless có tải lên xuống", "Cần requests và metrics-server; tối thiểu 1 Pod", "k autoscale deploy/web --cpu=60% --min=2 --max=20"],
  ["VPA", "requests của Pod", "lịch sử dùng thật", "Không biết đặt requests bao nhiêu, workload khó nhân bản", "Đừng dùng cùng HPA trên CPU/RAM; chế độ Off để chỉ xem khuyến nghị", "k describe vpa api"],
  ["In-place resize", "requests/limits Pod đang chạy", "bạn hoặc VPA", "Đổi tài nguyên không muốn restart (GA từ v1.35)", "Bị giới hạn bởi chỗ trống của node hiện tại", "k patch pod api-x --subresource resize --patch '…'"],
  ["KEDA", "số Pod (về 0 được)", "hàng đợi, Kafka lag, cron, Prometheus…", "Worker xử lý queue, việc theo sự kiện", "Thêm một operator; tạo HPA phía dưới", "ScaledObject trỏ tới Deployment"],
  ["Cluster Autoscaler", "số node", "Pod Pending, node dùng ít", "Node group cố định loại máy trên cloud", "Thêm node mất 1–3 phút; bỏ node sau ~10 phút dư", "cluster-autoscaler --scale-down-utilization-threshold=0.5"],
  ["Karpenter", "số và loại node", "Pod Pending, gom node (consolidation)", "Cần chọn loại máy linh hoạt, spot", "Phụ thuộc cloud (AWS, Azure)", "NodePool với requirements loại máy"]
];
function kindsScaleHTML() {
  return '<div class="panel col">' + scTl(["Scale <b>Pod</b>: HPA (số lượng), VPA (độ lớn), KEDA (theo sự kiện).", "Scale <b>node</b>: Cluster Autoscaler, Karpenter: chạy khi có Pod Pending.", "HPA thêm Pod → hết chỗ → autoscaler thêm node: hai tầng nối nhau."]) + "</div>" +
    '<div class="panel col"><div class="sc-kinds">' + SC_KINDS.map(k => '<div class="sc-k"><b>' + scEsc(k[0]) + '</b><div class="kv2"><span>Đổi</span>' + scEsc(k[1]) + '</div><div class="kv2"><span>Dựa vào</span>' + scEsc(k[2]) + '</div><div class="kv2"><span>Hợp khi</span>' + scEsc(k[3]) + '</div><div class="kv2 warn"><span>Lưu ý</span>' + scEsc(k[4]) + "</div><code>" + scEsc(k[5]) + "</code></div>").join("") + "</div></div>" +
    '<div class="panel col">' + scDet("HPA theo metric tùy chỉnh (req/s mỗi Pod)", scCode(`metrics:
  - type: Pods
    pods:
      metric: {name: http_requests_per_second}       # cần Prometheus Adapter
      target: {type: AverageValue, averageValue: "100"}
  - type: Resource
    resource: {name: memory, target: {type: Utilization, averageUtilization: 75}}
# nhiều metric: HPA lấy số Pod LỚN NHẤT trong các metric`)) +
    scDet("VPA chỉ khuyến nghị (an toàn để bắt đầu)", scCode(`apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata: {name: api}
spec:
  targetRef: {apiVersion: apps/v1, kind: Deployment, name: api}
  updatePolicy: {updateMode: "Off"}     # Off | Initial | Recreate | InPlaceOrRecreate
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed: {cpu: 100m, memory: 128Mi}
        maxAllowed: {cpu: "2", memory: 4Gi}`)) +
    scDet("KEDA: scale theo độ dài hàng đợi, về 0 khi rảnh", scCode(`apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: {name: worker}
spec:
  scaleTargetRef: {name: worker}
  minReplicaCount: 0
  maxReplicaCount: 30
  triggers:
    - type: rabbitmq
      metadata: {queueName: jobs, mode: QueueLength, value: "20"}   # 20 message mỗi Pod`)) +
    scDet("Giữ Pod an toàn khi autoscaler bỏ node", scCode(`# PodDisruptionBudget: drain không được làm còn ít hơn 2 Pod
k create pdb web --selector=app=web --min-available=2
# Pod có emptyDir hoặc không có controller: Cluster Autoscaler không dám đuổi, trừ khi:
metadata:
  annotations:
    cluster-autoscaler.kubernetes.io/safe-to-evict: "true"`)) + "</div>";
}

/* ================= 5. lỗi khi scale ================= */
const SC_ERRS = [
  ["HPA hiện TARGETS <unknown>/60%", "web   Deployment/web   cpu: <unknown>/60%   2   20   2", "Chưa có metrics-server, hoặc container không đặt requests.cpu (HPA tính % trên requests).", "k get apiservice v1beta1.metrics.k8s.io\nk describe hpa web | grep -A3 Events\n# FailedGetResourceMetric: failed to get cpu utilization: missing request for cpu in container web", "k set resources deploy/web --requests=cpu=200m\n# hoặc cài metrics-server (Lab 11)"],
  ["HPA dừng ở maxReplicas", "ScalingLimited  True  TooManyReplicas  the desired replica count is more than the maximum replica count", "Tải cần nhiều Pod hơn maxReplicas.", "k describe hpa web | sed -n '/Conditions/,/Events/p'", "Tăng maxReplicas, hoặc tối ưu ứng dụng; kiểm tra quota namespace có đủ cho số Pod mới."],
  ["Scale lên rồi Pod Pending", "0/3 nodes are available: 3 Insufficient cpu.", "HPA đã tăng Pod nhưng cluster hết chỗ theo requests.", "k get pods --field-selector=status.phase=Pending\nk describe node | grep -A6 'Allocated resources'", "Bật Cluster Autoscaler/Karpenter, thêm node, hoặc giảm requests (tab Rightsizing)."],
  ["Autoscaler không thêm node", "pod didn't trigger scale-up: 1 max node group size reached", "Node group đã tới kích thước tối đa, hoặc Pod đòi thứ mà loại node đó không có (label, GPU, zone).", "k describe pod <pending> | grep -i trigger\nk -n kube-system logs deploy/cluster-autoscaler | tail", "Tăng max của node group, thêm node group phù hợp, sửa nodeSelector/affinity."],
  ["Scale xuống rất chậm", "replicas giữ nguyên 5 phút dù tải đã giảm", "Bình thường: scaleDown.stabilizationWindowSeconds mặc định 300 giây chống dao động.", "k get hpa web -o yaml | grep -A5 behavior", "Giảm stabilizationWindowSeconds nếu thật sự cần, hoặc giữ nguyên (an toàn hơn)."],
  ["Số Pod nhảy lên xuống liên tục", "HPA: 4 → 8 → 4 → 8 mỗi vài phút", "Mục tiêu quá sát mức tải, Pod khởi động chậm làm số đo lệch, hoặc readiness sai.", "k describe hpa web | tail -20", "Thêm behavior.scaleUp.stabilizationWindowSeconds, dùng startupProbe, nới mục tiêu."],
  ["Autoscaler không bỏ node", "node dùng rất ít nhưng không bị xóa", "Trên node có Pod không đuổi được: PDB không cho phép, Pod không có controller, Pod dùng emptyDir/local storage, Pod kube-system không có PDB.", "k -n kube-system logs deploy/cluster-autoscaler | grep -i 'cannot be removed'", "Thêm PDB hợp lý, annotation safe-to-evict: \"true\" cho Pod chấp nhận bị dời."],
  ["kubectl scale không có tác dụng", "đặt --replicas=10, vài giây sau quay về 4", "HPA đang quản lý Deployment (hoặc Argo CD/Flux đồng bộ lại replicas từ Git).", "k get hpa\nk get deploy web -o jsonpath='{.metadata.managedFields[*].manager}'", "Đổi minReplicas của HPA; bỏ trường replicas khỏi manifest trong Git khi dùng HPA."],
  ["HPA và VPA giành nhau", "Pod bị tạo lại liên tục, số Pod dao động", "Cả hai cùng phản ứng với CPU/RAM.", "k get hpa,vpa", "HPA theo metric khác (req/s), hoặc VPA chế độ Off chỉ để tham khảo."],
  ["Không scale về 0 được", "minReplicas: 0 bị từ chối", "HPA chuẩn cần ít nhất 1 Pod (scale-to-zero vẫn sau feature gate).", "k explain hpa.spec.minReplicas", "Dùng KEDA (minReplicaCount: 0) hoặc CronJob tắt/bật ngoài giờ."]
];
function scErrHTML() {
  return '<div class="panel col"><h4>' + SC_ERRS.length + " lỗi hay gặp khi scale</h4>" + SC_ERRS.map(e => '<details class="bp err"><summary><span>' + scEsc(e[0]) + '</span></summary><div class="body"><code class="em">' + scEsc(e[1]) + '</code><p style="margin:0"><b>Vì sao:</b> ' + scEsc(e[2]) + '</p><span class="tb-h">Kiểm tra</span>' + scCode(e[3]) + '<span class="tb-h ok">Cách sửa</span>' + scCode(e[4]) + "</div></details>").join("") +
    '<p class="small">Luyện: <a class="pill cp" style="text-decoration:none" href="index.html#lab-11">Lab 11 · metrics-server và HPA</a></p></div>';
}

onShow.scale = scInit;
if (current === "scale" || (location.hash || "").slice(1) === "scale") scInit();
