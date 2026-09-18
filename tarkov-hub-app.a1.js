  ifr.title = titleOf(file);
  ifr.dataset.file = file;
  ifr.setAttribute("loading", "eager");
  ifr.setAttribute("scrolling", "yes");
  poolStyle(ifr);
  pool.appendChild(ifr);
  frames[file] = ifr;
  statusMap[file] = statusMap[file] || { ready: false, running: false, label: "", ts: 0 };
  ifr.addEventListener("load", function () {
    statusMap[file] = Object.assign({}, statusMap[file], { ready: true, ts: Date.now() });
    try { ifr.contentWindow.postMessage({ type: "tt-ping-status" }, location.origin); } catch (e) {}
    renderMiniList();
  });
  return ifr;
}
function destroyFrame(file) {
  const ifr = frames[file];
  if (ifr) { ifr.remove(); delete frames[file]; }
  delete statusMap[file];
}
function frameStatus(file) {
  return statusMap[file] || { ready: false, running: false, label: "", ts: 0 };
}
function renderMiniList() {
  const list = document.getElementById("miniList");
  const bar = document.getElementById("miniBar");
  if (!list || !bar) return;
  let tabs = [];
  try { tabs = (window.TarkovState && TarkovState.getMiniTabs) ? TarkovState.getMiniTabs() : []; } catch (e) {}
  if (!tabs.length) { bar.hidden = true; list.innerHTML = ""; return; }
  bar.hidden = false;
  list.innerHTML = tabs.map(function (t) {
    const n = unreadCount(t.file);
    const st = frameStatus(t.file);
    const act = expanded === t.file ? " active" : "";
    const run = st.running ? " running" : "";
    const title = t.title || titleOf(t.file);
    return '<button type="button" class="mini-chip' + act + run + '" data-file="' + esc(t.file) + '">' +
      '<span class="ico">' + iconFor(t.file, title) + '</span>' +
      (n ? '<span class="badge">' + n + '</span>' : '') +
      (st.running ? '<span class="dot-run"></span>' : '') +
      '</button>';
  }).join("");
  list.querySelectorAll(".mini-chip").forEach(function (btn) {
    const file = btn.getAttribute("data-file");
    btn.onclick = function () { expandTab(file); };
    btn.onmouseenter = function (e) { showChipTip(e, file); };
    btn.onmouseleave = hideTip;
  });
}
function showChipTip(e, file) {
  const tip = document.getElementById("miniTip");
  if (!tip) return;
  const st = frameStatus(file);
  const items = unreadItems(file);
  const title = titleOf(file);
  var statusLine;
  if (!frames[file]) statusLine = "не загружен";
  else if (!st.ready) statusLine = "загрузка…";
  else if (st.running) statusLine = "● запущен" + (st.label ? " · " + st.label : "");
  else statusLine = "загружен (фон)";
