window.addEventListener("message", function (ev) {
  if (ev.origin !== location.origin) return;
  const d = ev.data;
  if (!d || typeof d !== "object") return;
  if (d.type === "tt-notify") {
    try {
      if (d.title && window.TarkovState && TarkovState.notify) {
        var tool = (d.tool || "").split("/").pop();
        var list = TarkovState.notifications ? TarkovState.notifications() : [];
        var recent = list.filter(function (n) {
          return n.tool === tool && n.title === d.title && !n.read && (Date.now() - (n.ts || 0)) < 3000;
        });
        if (!recent.length) {
          TarkovState.notify({ title: d.title, body: d.body || "", tool: tool, kind: d.kind || "ok" });
        }
      }
    } catch (e) {}
    renderMiniList();
    return;
  }
  if (d.type === "tt-status") {
    const tool = (d.tool || "").split("/").pop();
    if (!tool) return;
    statusMap[tool] = { ready: true, running: !!d.running, label: d.label || "", ts: Date.now() };
    renderMiniList();
  }
});
try {
  const _bc = new BroadcastChannel("tarkov-tools");
  _bc.onmessage = function (ev) {
    const d = ev.data;
    if (!d) return;
    if (d.type === "tt-status") {
      const tool = (d.tool || "").split("/").pop();
      if (!tool) return;
      statusMap[tool] = { ready: true, running: !!d.running, label: d.label || "", ts: Date.now() };
      renderMiniList();
    }
    if (d.type === "notification" || d.type === "mini") renderMiniList();
  };
} catch (e) {}
window.addEventListener("storage", function () { renderMiniList(); });
if (window.TarkovState && TarkovState.on) {
  TarkovState.on("notification", function () { renderMiniList(); });
  TarkovState.on("mini", function () { bootMini(); });
}
document.getElementById("btnCollapse").onclick = collapseExpand;
document.getElementById("btnCloseExpand").onclick = function () { if (expanded) closeTab(expanded); };
const PINS_KEY = "tarkovHubPins";
function loadPins() { try { return JSON.parse(localStorage.getItem(PINS_KEY) || "[]"); } catch (e) { return []; } }
function savePins(pins) { try { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); } catch (e) {} }
function togglePin(file, ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  let pins = loadPins();
  if (pins.includes(file)) pins = pins.filter(function (f) { return f !== file; }); else pins.push(file);
  savePins(pins);
  if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
  renderCatalog();
}
function cardHtml(t, pinned) {
  return '<div class="tool" data-open="' + esc(t.file) + '" role="link" tabindex="0">' +
    '<button type="button" class="tool-pin ' + (pinned ? "on" : "") + '" data-pin="' + esc(t.file) + '" title="' + (pinned ? "Открепить" : "Закрепить") + '">' + (pinned ? "📌" : "📍") + '</button>' +
    '<div class="tool-head"><div class="tool-ico">' + iconFor(t.file, t.title) + '</div>' +
    '<div style="padding-right:28px"><h2>' + esc(t.title) + '</h2><p>' + esc(t.description || '') + '</p></div></div></div>';
}
function renderCatalog() {
  const qEl = document.getElementById("q");
  const q = (qEl && qEl.value || "").toLowerCase().trim();
  const pins = loadPins();
  let list = CATALOG.slice();
  if (q) list = list.filter(function (t) { return (t.title + t.description).toLowerCase().includes(q); });
  const pinned = list.filter(function (t) { return pins.includes(t.file); });
  const rest = list.filter(function (t) { return !pins.includes(t.file); });
  pinned.sort(function (a, b) { return pins.indexOf(a.file) - pins.indexOf(b.file); });
  const count = document.getElementById("count");
  if (count) count.textContent = list.length + " / " + CATALOG.length;
  let html = "";
  if (pinned.length) {
    html += '<div class="pins-label" style="grid-column:1/-1">Закреплённые</div>';
    html += pinned.map(function (t) { return cardHtml(t, true); }).join("");
    if (rest.length) html += '<div class="pins-label" style="grid-column:1/-1">Все инструменты</div>';
  }
  html += rest.map(function (t) { return cardHtml(t, false); }).join("");
  const grid = document.getElementById("grid");
  if (grid) grid.innerHTML = html;
  document.querySelectorAll(".tool-pin").forEach(function (btn) {
    btn.onclick = function (e) { togglePin(btn.getAttribute("data-pin"), e); };
  });
  document.querySelectorAll(".tool[data-open]").forEach(function (card) {
    card.onclick = function (e) {
      if (e.target.closest(".tool-pin")) return;
      if (e.ctrlKey || e.metaKey) { window.open(card.getAttribute("data-open"), "_blank"); return; }
      openToolAsMini(card.getAttribute("data-open"));
    };
    card.onkeydown = function (e) { if (e.key === "Enter") openToolAsMini(card.getAttribute("data-open")); };
  });
}
function renderChangelog() {
  const el = document.getElementById("changelog");
  if (!el) return;
  el.innerHTML = "<h3>Что изменилось</h3>" + CHANGELOG.map(function (b) {
    return '<div style="margin-bottom:12px"><strong>' + esc(b.date) + '</strong><ul>' +
      b.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
  }).join('');
}
const qInput = document.getElementById("q");
if (qInput) qInput.addEventListener("input", renderCatalog);
renderCatalog();
renderChangelog();
bootMini();
setInterval(function () {
  Object.keys(frames).forEach(function (file) {
    try {
      var ifr = frames[file];
      if (ifr && ifr.contentWindow) ifr.contentWindow.postMessage({ type: "tt-ping-status" }, location.origin);
    } catch (e) {}
  });
}, 10000);
