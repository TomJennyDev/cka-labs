/* ---------- chương 5 Storage: mô phỏng cho 5.1 và 5.2 ----------
   Dùng helper của learn.html và learn-ckad.js / learn-net.js (netSeg, netPress, lcBox, lcOnce). Tên toàn cục có tiền tố vs/pb/pl. */

/* ---------- 5.1 dữ liệu sống bao lâu ---------- */
const VS_EV = [["restart", "Container restart"], ["delpod", "Xóa Pod, Pod mới thay"], ["move", "Pod mới chạy ở node khác"], ["node", "Node hỏng hẳn"]];
const VS_ROWS = [
  ["Filesystem của container", { restart: [0, "Mất: container mới chạy từ image sạch"], delpod: [0, "Mất"], move: [0, "Mất"], node: [0, "Mất"] }],
  ["emptyDir", { restart: [1, "Còn: emptyDir sống theo Pod, không theo container"], delpod: [0, "Mất: xóa cùng Pod"], move: [0, "Mất"], node: [0, "Mất"] }],
  ["emptyDir medium: Memory", { restart: [1, "Còn (nằm trong RAM của node)"], delpod: [0, "Mất"], move: [0, "Mất"], node: [0, "Mất"] }],
  ["hostPath", { restart: [1, "Còn"], delpod: [2, "Còn trên node đó; Pod mới thấy chỉ khi về đúng node"], move: [0, "Không thấy: dữ liệu ở node cũ"], node: [0, "Mất cùng node (trừ khi cứu được disk)"] }],
  ["configMap, secret, projected", { restart: [1, "Còn"], delpod: [1, "Ghi lại từ API: nguồn nằm trong etcd, không nằm trong Pod"], move: [1, "Ghi lại từ API"], node: [1, "Ghi lại từ API"] }],
  ["generic ephemeral", { restart: [1, "Còn"], delpod: [0, "Mất: PVC có chủ là Pod nên bị xóa theo"], move: [0, "Mất"], node: [0, "Mất (PVC xóa theo Pod)"] }],
  ["PVC, disk mạng (EBS, Ceph, NFS)", { restart: [1, "Còn"], delpod: [1, "Còn: PVC và PV không thuộc Pod"], move: [1, "Còn: disk được gỡ khỏi node cũ, gắn vào node mới"], node: [2, "Còn, nhưng disk RWO có thể kẹt ở node chết vài phút trước khi gắn được sang node mới"] }],
  ["PVC trên local PV", { restart: [1, "Còn"], delpod: [1, "Còn"], move: [0, "Không chuyển được: PV gắn chặt node qua nodeAffinity, Pod mới đứng Pending"], node: [0, "Pod kẹt Pending tới khi node sống lại"] }]
];
function vsInit() {
  const box = $("#volSim"); let ev = "delpod";
  box.innerHTML = "<h3>Dữ liệu còn không khi…</h3>" + netSeg(VS_EV, ev, "data-vs") + '<div class="tbl" id="vsTbl"></div>';
  const ic = [["✕", "var(--bad)"], ["✓", "var(--node)"], ["~", "var(--pkt)"]];
  const render = () => {
    $("#vsTbl").innerHTML = "<table><thead><tr><th>Nơi ghi dữ liệu</th><th></th><th>Chuyện gì xảy ra</th></tr></thead><tbody>" +
      VS_ROWS.map(([n, m]) => { const [k, t] = m[ev]; return "<tr><td><b>" + esc(n) + '</b></td><td style="font-weight:700;font-size:18px;color:' + ic[k][1] + '">' + ic[k][0] + "</td><td>" + esc(t) + "</td></tr>"; }).join("") + "</tbody></table>";
  };
  box.addEventListener("click", e => { const b = e.target.closest("[data-vs]"); if (b) { ev = b.dataset.vs; netPress(box, "data-vs", ev); render(); } });
  render();
}
lcOnce("volumes", vsInit);

/* ---------- 5.2 PVC ghép với PV nào ---------- */
const PB_PV = [
  { n: "pv-a", cap: 1, modes: ["RWO"], sc: "manual", lab: "tier=log", st: "Available" },
  { n: "pv-b", cap: 5, modes: ["RWX", "ROX", "RWO"], sc: "manual", lab: "", st: "Available", note: "NFS" },
  { n: "pv-c", cap: 2, modes: ["RWO"], sc: "manual", lab: "tier=log", st: "Bound", note: "đã gắn với shop/old" },
  { n: "pv-d", cap: 10, modes: ["RWO"], sc: "", lab: "", st: "Available", note: "không có lớp" },
  { n: "pv-e", cap: 20, modes: ["RWO"], sc: "fast", lab: "", st: "Available" }
];
const PB_SIZE = { "500Mi": .5, "1Gi": 1, "3Gi": 3, "8Gi": 8, "50Gi": 50 };
function pbInit() {
  const box = $("#pvBind"); const st = { size: "1Gi", mode: "RWO", sc: "manual", sel: false };
  const sel = (id, opts, cur) => '<select id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  box.innerHTML = "<h3>PVC này ghép với PV nào?</h3>" +
    '<p class="hint" style="margin:0">Cluster có 5 PV tạo sẵn. StorageClass mặc định là <code>fast</code> (có driver CSI tự tạo disk). Lớp <code>manual</code> không có driver.</p>' +
    '<div class="formrow"><label class="f">Dung lượng ' + sel("pbSize", Object.keys(PB_SIZE).map(k => [k, k]), st.size) + '</label><label class="f">accessModes ' + sel("pbMode", [["RWO", "ReadWriteOnce"], ["RWX", "ReadWriteMany"], ["ROX", "ReadOnlyMany"], ["RWOP", "ReadWriteOncePod"]], st.mode) +
    '</label><label class="f">storageClassName ' + sel("pbSc", [["manual", "manual"], ["", '"" (chuỗi rỗng)'], ["~", "(không ghi)"], ["fast", "fast"]], st.sc) + '</label><label class="check"><input type="checkbox" id="pbSel"> selector tier=log</label></div>' +
    '<div class="codewrap"><pre class="code" id="pbYaml"></pre></div><div id="pbOut"></div>';
  const render = () => {
    const need = PB_SIZE[st.size], cls = st.sc === "~" ? "fast" : st.sc;
    const why = pv => pv.st !== "Available" ? "đang Bound với PVC khác" : pv.sc !== cls ? "khác storageClassName (" + (pv.sc === "" ? '""' : pv.sc) + ")" : !(pv.modes.includes(st.mode) || (st.mode === "RWOP" && pv.modes.includes("RWO") && false)) ? "không có mode " + st.mode : pv.cap < need ? "nhỏ hơn " + st.size : st.sel && pv.lab !== "tier=log" ? "không có label tier=log" : "";
    const ok = PB_PV.filter(pv => !why(pv)).sort((a, b) => a.cap - b.cap), win = ok[0];
    $("#pbYaml").textContent = "kind: PersistentVolumeClaim\nspec:\n  accessModes: [" + ({ RWO: "ReadWriteOnce", RWX: "ReadWriteMany", ROX: "ReadOnlyMany", RWOP: "ReadWriteOncePod" })[st.mode] + "]\n" + (st.sc === "~" ? "" : '  storageClassName: "' + st.sc + '"\n') + "  resources: {requests: {storage: " + st.size + "}}" + (st.sel ? "\n  selector: {matchLabels: {tier: log}}" : "");
    hlPre($("#pbYaml"));
    let res;
    if (win) res = "<b>Bound với " + win.n + "</b> (" + win.cap + "Gi): trong các PV khớp, controller chọn PV <b>nhỏ nhất</b> đủ chỗ." + (win.cap > need ? " Cả " + win.cap + "Gi bị giữ cho PVC này, dù chỉ xin " + st.size + "." : "");
    else if (cls === "fast" && !st.sel) res = "<b>Không PV có sẵn nào khớp → dynamic provisioning</b>: driver của lớp fast tạo disk " + st.size + " và một PV mới (bài 5.3)." + (st.mode === "RWX" || st.mode === "ROX" ? " Nếu driver chỉ hỗ trợ disk block thì tạo thất bại với mode " + st.mode + "." : "");
    else res = "<b>Pending</b>: không PV nào khớp" + (cls === "fast" && st.sel ? " (có selector thì không dynamic provisioning được)" : cls === "" ? ', và lớp "" nghĩa là không dùng dynamic provisioning' : ", và lớp " + cls + " không có driver tự tạo") + ".";
    $("#pbOut").innerHTML = (st.sc === "~" ? '<p class="small" style="margin:6px 0">Không ghi storageClassName: admission gán lớp mặc định <code>fast</code>. Muốn ghép PV không lớp thì ghi rõ <code>""</code>.</p>' : "") +
      '<div class="tbl"><table><thead><tr><th>PV</th><th>Dung lượng</th><th>Modes</th><th>Lớp</th><th>Label</th><th>Trạng thái</th><th>Với PVC này</th></tr></thead><tbody>' +
      PB_PV.map(pv => { const w = why(pv); return "<tr" + (pv === win ? ' style="background:var(--node-soft)"' : "") + "><td><code>" + pv.n + "</code>" + (pv.note ? '<br><span class="small muted">' + esc(pv.note) + "</span>" : "") + "</td><td>" + pv.cap + "Gi</td><td>" + pv.modes.join(",") + "</td><td><code>" + (pv.sc === "" ? '""' : pv.sc) + "</code></td><td>" + (pv.lab || "—") + "</td><td>" + pv.st + "</td><td>" + (pv === win ? "<b>được chọn</b>" : w ? esc(w) : "khớp nhưng lớn hơn") + "</td></tr>"; }).join("") +
      '</tbody></table></div><p class="small" style="margin:6px 0 0">' + res + "</p>";
  };
  box.addEventListener("change", e => {
    const id = e.target.id; if (id === "pbSize") st.size = e.target.value; else if (id === "pbMode") st.mode = e.target.value; else if (id === "pbSc") st.sc = e.target.value; else if (id === "pbSel") st.sel = e.target.checked; else return; render();
  });
  render();
}

/* ---------- 5.2 vòng đời PV khi xóa PVC ---------- */
function plInit() {
  const p = $("#pvLife");
  p.innerHTML = "<h3>Vòng đời PV: tạo, dùng, xóa</h3>" + '<div class="formrow"><span class="small">Reclaim policy của PV</span>' + netSeg([["Retain", "Retain"], ["Delete", "Delete"]], "Retain", "data-pol") + "</div>" +
    '<div class="chips" id="plBtns"></div><div class="stage sm"><svg viewBox="0 0 760 200"></svg></div><p class="hint cap" aria-live="polite"></p><div class="codewrap"><pre class="code" id="plOut"></pre></div>';
  const svg = $("svg", p), cap = $(".cap", p);
  let S;
  const reset = () => { S = { pol: S ? S.pol : "Retain", pv: null, pvc: null, pod: false, disk: false, data: false }; };
  const A = {
    mkpv: ["1. Admin tạo PV", () => !S.pv, () => { S.pv = "Available"; S.disk = true; return "PV trỏ tới một disk có sẵn. Chưa ai xin nên PV ở trạng thái Available."; }],
    mkpvc: ["2. Tạo PVC", () => S.pv === "Available" && !S.pvc, () => { S.pvc = "Bound"; S.pv = "Bound"; return "Controller ghép PVC với PV: cả hai thành Bound, PV ghi claimRef trỏ về PVC."; }],
    mkpod: ["3. Pod dùng PVC, ghi dữ liệu", () => S.pvc === "Bound" && !S.pod, () => { S.pod = true; S.data = true; return "kubelet mount disk vào node rồi vào container. App ghi dữ liệu lên disk."; }],
    delpvc: ["4. Xóa PVC", () => S.pvc === "Bound", () => { if (S.pod) { S.pvc = "Terminating"; return "Pod vẫn dùng PVC nên finalizer kubernetes.io/pvc-protection giữ nó ở Terminating. Lệnh k delete pvc treo ở đây."; } return release(); }],
    delpod: ["5. Xóa Pod", () => S.pod, () => { S.pod = false; return S.pvc === "Terminating" ? "Pod đi rồi, finalizer được gỡ. " + release() : "Pod bị xóa, disk được gỡ khỏi node. PVC và PV vẫn Bound, dữ liệu còn."; }],
    unclaim: ["6. Bỏ claimRef để dùng lại", () => S.pv === "Released", () => { S.pv = "Available"; return "k patch pv … remove /spec/claimRef: PV về Available. Dữ liệu cũ vẫn trên disk, PVC mới ghép vào sẽ thấy nó; muốn sạch thì admin tự xóa."; }],
    reset: ["↺ Làm lại", () => true, () => { reset(); return "Bắt đầu lại."; }]
  };
  function release() {
    S.pvc = null;
    if (S.pol === "Retain") { S.pv = "Released"; return "PVC bị xóa. Retain: PV thành Released, vẫn giữ claimRef cũ nên không PVC mới nào ghép được, disk và dữ liệu còn nguyên."; }
    S.pv = null; S.disk = false; S.data = false; return "PVC bị xóa. Delete: PV bị xóa và driver xóa luôn disk thật. Dữ liệu mất hẳn.";
  }
  const draw = () => {
    svg.innerHTML = "";
    const col = { Available: "run", Bound: "v1", Released: "start", Terminating: "term" };
    const B = (x, t, s, on) => lcBox(svg, x, 60, 150, 64, "an-c " + (on ? col[s] || "run" : "done"), t, s || "chưa có");
    B(20, "Pod", S.pod ? "Running" : "", S.pod);
    B(210, "PVC data", S.pvc, !!S.pvc);
    B(400, "PV pv-data", S.pv ? S.pv + " · " + S.pol : "", !!S.pv);
    lcBox(svg, 590, 60, 150, 64, S.disk ? "an-vol" : "an-c done", "Disk thật", S.disk ? (S.data ? "có dữ liệu" : "trống") : "không còn");
    [[170, 210, S.pod && S.pvc], [360, 400, S.pvc && S.pv === "Bound"], [550, 590, S.pv && S.disk]].forEach(([a, b, on]) => el("path", { d: "M" + a + " 92 H" + b, class: "an-l" + (on ? " on" : "") }, svg));
    if (S.pv === "Released") txt(svg, 475, 150, "claimRef: shop/data (cũ)", "sv-s", "middle");
    if (S.pvc === "Terminating") txt(svg, 285, 150, "finalizer pvc-protection", "sv-s", "middle");
    $("#plBtns").innerHTML = Object.entries(A).map(([k, [t, can]]) => '<button type="button" data-pl="' + k + '"' + (can() ? "" : " disabled") + ">" + t + "</button>").join("");
    $("#plOut").textContent = "$ k get pv,pvc\nNAME                 CAPACITY  RECLAIM POLICY  STATUS      CLAIM\n" +
      (S.pv ? "persistentvolume/pv-data   10Gi  " + S.pol.padEnd(14) + "  " + S.pv.padEnd(10) + "  " + (S.pv === "Available" ? "" : "shop/data") : "(không có PV)") +
      "\n\nNAME                    STATUS        VOLUME\n" + (S.pvc ? "persistentvolumeclaim/data  " + S.pvc.padEnd(12) + "  pv-data" : "(không có PVC)");
  };
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-pl]"); if (b && !b.disabled) { cap.textContent = A[b.dataset.pl][2](); draw(); return; }
    const q = e.target.closest("[data-pol]"); if (q) { S.pol = q.dataset.pol; netPress(p, "data-pol", S.pol); draw(); }
  });
  reset(); draw(); cap.textContent = "Bấm lần lượt các bước. Thử cả hai reclaim policy.";
}
lcOnce("pv", () => { pbInit(); plInit(); });
