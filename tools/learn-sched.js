/* ---------- 3.1 Taint & toleration: mô phỏng khớp taint của node với toleration của Pod ----------
   Luật khớp theo docs Kubernetes; hành vi NoExecute, cordon, toleration mặc định đã kiểm trên k3s v1.34 ngày 16/11/2026. */
const TT_TAINTS = [
  { id: "gpu", key: "gpu", value: "true", effect: "NoSchedule", note: "node GPU dành riêng" },
  { id: "pref", key: "dedicated", value: "db", effect: "PreferNoSchedule", note: "nên để cho DB" },
  { id: "maint", key: "maint", value: "now", effect: "NoExecute", note: "bảo trì: đuổi Pod" },
  { id: "cp", key: "node-role.kubernetes.io/control-plane", value: "", effect: "NoSchedule", note: "kubeadm gắn cho control plane" },
  { id: "cordon", key: "node.kubernetes.io/unschedulable", value: "", effect: "NoSchedule", note: "do k cordon gắn" }
];
const TT_TOLS = [
  { id: "t1", key: "gpu", operator: "Equal", value: "true", effect: "NoSchedule" },
  { id: "t2", key: "gpu", operator: "Equal", value: "false", effect: "NoSchedule" },
  { id: "t3", key: "gpu", operator: "Exists" },
  { id: "t4", key: "maint", operator: "Exists", effect: "NoExecute", tolerationSeconds: 15 },
  { id: "t5", key: "node-role.kubernetes.io/control-plane", operator: "Exists", effect: "NoSchedule" },
  { id: "t6", operator: "Exists" }
];
const ttTaintStr = t => t.key + (t.value ? "=" + t.value : "") + ":" + t.effect;
const ttTolStr = t => "{" + [t.key ? "key: " + t.key : "", "operator: " + t.operator, t.value !== undefined && t.operator === "Equal" ? 'value: "' + t.value + '"' : "", t.effect ? "effect: " + t.effect : "", t.tolerationSeconds ? "tolerationSeconds: " + t.tolerationSeconds : ""].filter(Boolean).join(", ") + "}";
function ttMatch(tol, taint) {
  if (tol.key && tol.key !== taint.key) return "khác key";
  if (!tol.key && tol.operator !== "Exists") return "không có key thì phải là Exists";
  if (tol.operator === "Equal" && (tol.value || "") !== (taint.value || "")) return "Equal nhưng khác value";
  if (tol.effect && tol.effect !== taint.effect) return "khác effect";
  return "";
}
function ttInit() {
  const box = $("#ttSim"); const on = { gpu: true, pref: false, maint: false, cp: false, cordon: false }, tol = { t1: false, t2: false, t3: false, t4: false, t5: false, t6: false };
  box.innerHTML = '<h3>Pod này có lên được node không?</h3><div class="split even" style="align-items:start">' +
    '<div class="col" style="gap:6px"><b class="small">Taint trên node worker-3</b>' + TT_TAINTS.map(t => '<label class="check"><input type="checkbox" data-tt="' + t.id + '"' + (on[t.id] ? " checked" : "") + "> <code>" + esc(ttTaintStr(t)) + '</code> <span class="small muted">' + esc(t.note) + "</span></label>").join("") + "</div>" +
    '<div class="col" style="gap:6px"><b class="small">Toleration trong Pod</b>' + TT_TOLS.map(t => '<label class="check"><input type="checkbox" data-tl="' + t.id + '"> <code style="white-space:normal">' + esc(ttTolStr(t)) + "</code></label>").join("") + "</div></div>" +
    '<div id="ttOut"></div><div class="split even" style="margin-top:10px"><div class="codewrap"><pre class="code" id="ttCmdN"></pre></div><div class="codewrap"><pre class="code" id="ttCmdP"></pre></div></div>';
  const render = () => {
    const ts = TT_TAINTS.filter(t => on[t.id]), ls = TT_TOLS.filter(t => tol[t.id]);
    const rows = ts.map(t => { const hits = ls.filter(l => !ttMatch(l, t)); return { t, hits, why: ls.map(l => ttMatch(l, t)).filter(Boolean) }; });
    const hard = rows.filter(r => !r.hits.length && r.t.effect !== "PreferNoSchedule"), soft = rows.filter(r => !r.hits.length && r.t.effect === "PreferNoSchedule");
    const exe = rows.filter(r => r.t.effect === "NoExecute"), exeBad = exe.filter(r => !r.hits.length), exeTimed = exe.filter(r => r.hits.length && r.hits.every(h => h.tolerationSeconds));
    let verdict, cls;
    if (!ts.length) { verdict = "Node không có taint: Pod nào cũng lên được."; cls = "ok"; }
    else if (hard.length) { verdict = "Không xếp được lên node này: còn taint " + hard.map(r => "<code>" + esc(ttTaintStr(r.t)) + "</code>").join(", ") + " chưa được tolerate. Pod sẽ <b>Pending</b> với event <i>1 node(s) had untolerated taint(s)</i>" + (exeBad.length ? ". Pod đang chạy trên node mà không tolerate taint NoExecute thì bị <b>đuổi ngay</b>." : "."); cls = "bad"; }
    else if (exeTimed.length) { verdict = "Xếp được, nhưng taint NoExecute chỉ được chịu <b>" + Math.min(...exeTimed.flatMap(r => r.hits.map(h => h.tolerationSeconds))) + " giây</b> (tolerationSeconds): sau đó Pod bị đuổi."; cls = "warn"; }
    else if (soft.length) { verdict = "Xếp được nhưng scheduler <b>tránh</b> node này nếu còn node khác (PreferNoSchedule chưa tolerate)."; cls = "warn"; }
    else { verdict = "Xếp được: mọi taint đều có toleration khớp. Lưu ý: toleration chỉ <b>cho phép</b> vào, không kéo Pod tới node này; muốn ép thì thêm nodeSelector hoặc affinity."; cls = "ok"; }
    $("#ttOut").innerHTML = '<div class="tbl" style="margin-top:10px"><table><thead><tr><th>Taint</th><th>Effect</th><th>Toleration khớp</th></tr></thead><tbody>' +
      (rows.length ? rows.map(r => "<tr><td><code>" + esc(ttTaintStr(r.t)) + "</code></td><td>" + r.t.effect + "</td><td>" + (r.hits.length ? "✓ " + r.hits.map(h => "<code>" + esc(ttTolStr(h)) + "</code>").join(" ") : '<span style="color:var(--bad)">✕ không có</span>' + (r.why.length ? ' <span class="small muted">(' + esc([...new Set(r.why)].join("; ")) + ")</span>" : "")) + "</td></tr>").join("") : '<tr><td colspan="3" class="muted">Node không có taint</td></tr>') +
      '</tbody></table></div><p class="ttv ' + cls + '" style="margin:8px 0 0">' + verdict + "</p>";
    $("#ttCmdN").textContent = "# taint đang bật trên node\n" + (ts.length ? ts.filter(t => t.id !== "cordon").map(t => "k taint node worker-3 " + ttTaintStr(t)).join("\n") + (on.cordon ? "\nk cordon worker-3          # gắn node.kubernetes.io/unschedulable:NoSchedule" : "") : "# (không có)") + "\n# gỡ: thêm dấu - ở cuối, ví dụ\nk taint node worker-3 gpu=true:NoSchedule-";
    $("#ttCmdP").textContent = "# tolerations trong spec của Pod\nspec:\n  tolerations:" + (ls.length ? "\n" + ls.map(l => "  - " + ttTolStr(l)).join("\n") : " []");
    hlPre($("#ttCmdN")); hlPre($("#ttCmdP"));
  };
  box.addEventListener("change", e => { const a = e.target.closest("[data-tt]"), b = e.target.closest("[data-tl]"); if (a) on[a.dataset.tt] = a.checked; if (b) tol[b.dataset.tl] = b.checked; render(); });
  render();
}
lcOnce("sched", ttInit);
