/* ---------- khung chương / bài của trang Lý thuyết ----------
   lessonFrame(): đầu bài (chương + tab các bài) và cuối bài (ôn thi: năng lực CKA, thẻ CKAD, bài tập; đã học; bài trước/sau).
   Cũng dựng hai bài chuyển từ "Giao tiếp & mã hóa" sang chương 8: connerr (lỗi kết nối) và obs (observability). */
const lpName = m => m.n + " " + m.t;
function lessonFrame(name, ch) {
  const i = MODULES.findIndex(m => m.id === name), mod = MODULES[i], prev = MODULES[i - 1], next = MODULES[i + 1];
  $("#lhead").innerHTML = '<div class="chx"><b>' + (ch.id === "ref" ? "" : "Chương ") + esc(ch.n === "R" ? ch.t : ch.n + " · " + ch.t) + "</b>" + (ch.ex ? "<span>" + esc(ch.ex) + "</span>" : "") + "</div>" +
    (ch.ls.length > 1 ? '<nav class="ltabs" aria-label="Các bài trong chương">' + ch.ls.map(([id, t], k) => '<a href="#' + id + '" data-go="' + id + '"' + (id === name ? ' aria-current="page"' : "") + (learned[id] ? ' class="ok"' : "") + '><span class="n">' + ch.n + "." + (k + 1) + "</span>" + esc(t) + "</a>").join("") + "</nav>" : "");
  const act = $(".ltabs [aria-current]"); if (act) act.scrollIntoView({ block: "nearest", inline: "nearest" });
  /* ôn thi cho bài này */
  const cka = Object.entries(CKA_COMP_LESSON).filter(([, l]) => l === name).map(([k]) => k.split(":"));
  const ckad = Object.entries(LC_HOME).filter(([, l]) => l === name).map(([k]) => k.split(":"));
  let h = "";
  if (cka.length || ckad.length) {
    h += '<section class="panel lf-prac"><h3>Ôn thi cho bài này</h3>';
    if (cka.length) h += '<div class="lf-row"><span class="small muted">CKA · năng lực</span>' + cka.map(([d, c]) => { const dm = DOMAINS.find(x => x.key === d), n = CKA_BANK.filter(b => b.d === d && b.c === +c).length;
      return '<a class="pill" href="index.html#bank-' + d + "-" + c + '"><i class="sw" style="background:' + dm.color + '"></i>' + esc(dm.items[+c]) + " · " + n + " bài ↗</a>"; }).join("") + "</div>";
    if (ckad.length) h += '<div class="ck-topics">' + ckad.map(([d, t]) => lcCard(d, +t)).join("") + "</div>";
    h += "</section>";
  }
  if (mod && mod.ch.id !== "ref") h += '<div class="lf-done"><button type="button" class="btn' + (learned[name] ? "" : " primary") + '" id="lfDone">' + (learned[name] ? "✓ Đã học bài này · bỏ đánh dấu" : "Đánh dấu đã học bài này") + "</button></div>";
  h += '<nav class="lf-nav" aria-label="Bài trước, bài sau">' + (prev ? '<a href="#' + prev.id + '" data-go="' + prev.id + '"><small>← ' + (prev.ch !== mod.ch ? "Chương " + esc(prev.ch.n) + " · " : "") + "Bài trước</small><b>" + esc(lpName(prev)) + "</b></a>" : "") +
    (next ? '<a class="next" href="#' + next.id + '" data-go="' + next.id + '"><small>' + (next.ch !== mod.ch ? "Sang chương " + esc(next.ch.n) + " · " + esc(next.ch.t) : "Bài tiếp") + " →</small><b>" + esc(lpName(next)) + "</b></a>" : "") + "</nav>";
  const foot = $("#lfoot"); foot.innerHTML = h; lcEnhance(foot);
  const b = $("#lfDone"); if (b) b.onclick = () => { if (learned[name]) delete learned[name]; else learned[name] = 1; store.set("learned", learned); railProg(); lessonFrame(name, ch); chMap(); };
}
/* bản đồ chương ở bài 0.1 */
function chMap() {
  const box = $("#chMap"); if (!box) return;
  box.className = "chmap";
  box.innerHTML = CHAPTERS.map(c => { const n = c.ls.filter(l => learned[l[0]]).length;
    return '<div class="c"><h4><span class="n">' + esc(c.n) + "</span>" + esc(c.t) + (c.id !== "ref" ? '<span class="small muted" style="margin-left:auto;font-weight:400">' + n + "/" + c.ls.length + "</span>" : "") + "</h4><p>" + esc(c.d) + "</p>" + (c.ex ? '<span class="ex">' + esc(c.ex) + "</span>" : "") +
      "<ol>" + c.ls.map(([id, t], k) => '<li><a href="#' + id + '" data-go="' + id + '"' + (learned[id] ? ' class="ok"' : "") + ">" + esc(c.n + "." + (k + 1) + " " + t) + "</a></li>").join("") + "</ol></div>"; }).join("");
}
{ const prev = onShow.overview; onShow.overview = () => { if (prev) prev(); chMap(); }; }

/* ---------- 8.2 lỗi kết nối & chứng chỉ ---------- */
let ceReady = false;
function ceInit() {
  const box = $("#ceBody");
  if (!ceReady) {
    ceReady = true;
    box.innerHTML = wireErrHTML();
    box.addEventListener("click", e => {
      const ec = e.target.closest("[data-ec]"); if (ec) { errConn = ec.dataset.ec; $$("#errChips button").forEach(b => b.setAttribute("aria-pressed", b.dataset.ec === errConn ? "true" : "false")); wireErrList(); return; }
      if (e.target.closest("#wLadPlay")) { wireLadderPlay(); return; }
      const c = e.target.closest("[data-conn]"); if (c) { wireConn = c.dataset.conn; wireCur = "map"; store.set("wireConn", wireConn); store.set("wire", "map"); show("wire"); }
    });
    box.addEventListener("input", e => { if (e.target.id === "errQ") { errQ = e.target.value; wireErrList(); } });
    mmdRender(box);
  }
  const q = $("#errQ"); if (q) q.value = errQ;
  $$("#errChips button").forEach(b => b.setAttribute("aria-pressed", b.dataset.ec === errConn ? "true" : "false"));
  wireErrList(); wireCopy();
}
onShow.connerr = ceInit;

/* ---------- 8.3 observability ---------- */
let obsReady = false;
onShow.obs = () => {
  if (obsReady) return; obsReady = true;
  const box = $("#obsBody");
  box.innerHTML = wireObsHTML();
  box.addEventListener("click", e => { const ob = e.target.closest("[data-obs]"); if (ob) { obsComp = +ob.dataset.obs; $$("#obsChips button").forEach(b => b.setAttribute("aria-pressed", b === ob ? "true" : "false")); $("#obsCard").innerHTML = obsCompHTML(); } });
  wireCopy(); mmdRender(box);
};
