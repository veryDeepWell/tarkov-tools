  var html = '<div class="tip-title">' + esc(title) + '</div>';
  html += '<div class="tip-status' + (st.running ? " on" : "") + '">' + esc(statusLine) + '</div>';
  if (items.length) {
    html += items.map(function (n) {
      return '<div class="row-n"><div class="t">' + esc(n.title) + '</div><div class="b">' + esc(n.body || "") + '</div></div>';
    }).join("");
  } else {
    html += '<div class="b" style="color:var(--muted)">Нет непрочитанных</div>';
  }
  tip.innerHTML = html;
  tip.style.display = "block";
  tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 320) + "px";
  tip.style.top = Math.min(e.clientY + 14, window.innerHeight - 160) + "px";
}
function hideTip() {
  const tip = document.getElementById("miniTip");
  if (tip) tip.style.display = "none";
}
function expandTab(file) {
  try { hideTip(); } catch (e) {}
  try {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.body.classList.add("tt-expand-open");
    document.documentElement.style.overflow = "hidden";
  } catch (e) {}
  if (expanded && expanded !== file && frames[expanded]) {
    const prev = frames[expanded];
    const pool = document.getElementById("framePool");
    if (pool) pool.appendChild(prev);
    poolStyle(prev);
  }
  ensureFrame(file);
  expanded = file;
  const host = document.getElementById("expandHost");
  const ifr = frames[file];
  if (host && ifr) { host.appendChild(ifr); expandStyle(ifr); }
  const exp = document.getElementById("hubExpand");
  if (exp) exp.classList.add("open");
  const et = document.getElementById("expandTitle");
  if (et) et.textContent = titleOf(file);
  renderMiniList();
}
function collapseExpand() {
  if (!expanded) return;
  try {
    document.body.classList.remove("tt-expand-open");
    document.documentElement.style.overflow = "";
  } catch (e) {}
  const ifr = frames[expanded];
  if (ifr) {
    const pool = document.getElementById("framePool");
    if (pool) pool.appendChild(ifr);
    poolStyle(ifr);
  }
  expanded = null;
  const exp = document.getElementById("hubExpand");
  if (exp) exp.classList.remove("open");
  renderMiniList();
}
function closeTab(file) {
  try { hideTip(); } catch (e) {}
  if (expanded === file) collapseExpand();
  destroyFrame(file);
  try { TarkovState.removeMiniTab(file); TarkovState.markToolRead(file); } catch (e) {}
  renderMiniList();
}
function openToolAsMini(file) {
  const title = titleOf(file);
