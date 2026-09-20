window.TarkovHubMini = true;

function getCatalog() { return window.TarkovHubCATALOG || []; }
var CHANGELOG = [{"date":"2026-09-17","items":["Mini tabs, notifications, soft-state","Catalog categories","Price Alarm, food, loadouts","TarkovAPI, TarkovNames"]}];
var ICONS = [[/btc/i,"₿"],[/cultist/i,"⛧"],[/my-tarkov/i,"👤"],[/helmet/i,"🪖"],[/nvg/i,"🌑"],[/price-track/i,"📈"],[/price-alarm/i,"🔔"],[/food/i,"🍖"],[/random-loadout/i,"🎲"],[/loadout-budget/i,"💰"],[/loadout-builder/i,"🧰"],[/drip-builder/i,"🎨"],[/drip-loadout/i,"✨"],[/ammo/i,"🔫"],[/armor/i,"🛡️"],[/barter/i,"🧮"],[/boss/i,"👹"],[/compare/i,"⚖️"],[/container/i,"🎒"],[/craft/i,"🔧"],[/drip/i,"🕶️"],[/gun/i,"🛠️"],[/hideout/i,"🏗️"],[/key/i,"🔑"],[/lang/i,"🌐"],[/loot/i,"📦"],[/item-use/i,"💡"],[/mag/i,"📟"],[/med/i,"💊"],[/mods/i,"🔩"],[/plate/i,"🧱"],[/quest/i,"📜"],[/raid/i,"✅"],[/restock/i,"⏰"],[/scope/i,"🔭"],[/short/i,"🏷️"],[/skill/i,"📈"],[/stim/i,"💉"],[/streamer/i,"📺"],[/trader/i,"🏪"]];

function iconFor(file, title) {
  try {
    if (window.TarkovIcons && TarkovIcons.emojiFor) return TarkovIcons.emojiFor({ file: file, title: title });
  } catch (e) {}
  var s = (file || "") + " " + (title || "");
  for (var i = 0; i < ICONS.length; i++) if (ICONS[i][0].test(s)) return ICONS[i][1];
  return "🛠️";
}
function esc(s) {
  var amp = String.fromCharCode(38);
  return String(s || "").replace(/&/g, amp + "amp;").replace(/</g, amp + "lt;").replace(/>/g, amp + "gt;").replace(/"/g, amp + "quot;");
}
function toolKey(file) {
  var f = String(file || "");
  var i = f.lastIndexOf("/");
  return i >= 0 ? f.slice(i + 1) : f;
}
function metaFor(file) {
  var c = getCatalog().find(function (x) { return x.file === file; });
  return c || { file: file, title: toolKey(file), description: "" };
}

function getMiniTabs() {
  try {
    if (window.TarkovState) {
      if (TarkovState.getMiniTabs) return TarkovState.getMiniTabs() || [];
      if (TarkovState.getMini) return TarkovState.getMini() || [];
    }
  } catch (e) {}
  return [];
}
function pushMiniTab(file) {
  var meta = metaFor(file);
  var tab = { file: file, title: meta.title || toolKey(file) };
  try {
    if (window.TarkovState) {
      if (TarkovState.addMiniTab) { TarkovState.addMiniTab(tab); return; }
      if (TarkovState.setMiniTabs) {
        var list = (TarkovState.getMiniTabs() || []).filter(function (t) { return t.file !== file; });
        list.push(tab);
        TarkovState.setMiniTabs(list);
        return;
      }
      if (TarkovState.setMini) {
        var list2 = ((TarkovState.getMini && TarkovState.getMini()) || []).filter(function (t) { return t.file !== file; });
        list2.push(tab);
        TarkovState.setMini(list2);
      }
    }
  } catch (e) {}
}
function dropMiniTab(file) {
  try {
    if (window.TarkovState) {
      if (TarkovState.removeMiniTab) { TarkovState.removeMiniTab(file); return; }
      if (TarkovState.setMiniTabs) {
        TarkovState.setMiniTabs((TarkovState.getMiniTabs() || []).filter(function (t) { return t.file !== file; }));
      }
    }
  } catch (e) {}
}

var frames = Object.create(null);
var expanded = null;

function ensureFrame(file) {
  if (frames[file]) return frames[file];
  var pool = document.getElementById("framePool");
  if (!pool) return null;
  var ifr = document.createElement("iframe");
  ifr.setAttribute("loading", "lazy");
  ifr.src = file;
  ifr.title = metaFor(file).title || file;
  ifr.dataset.tool = file;
  ifr.style.cssText = "display:none;width:100%;height:100%;border:0;background:#0f1115";
  pool.appendChild(ifr);
  frames[file] = ifr;
  return ifr;
}

function openToolAsMini(file) {
  if (!file) return;
  ensureFrame(file);
  pushMiniTab(file);
  renderMiniList();
  expandTab(file);
}
window.openToolAsMini = openToolAsMini;

function expandTab(file) {
  expanded = file;
  var host = document.getElementById("expandHost");
  var exp = document.getElementById("hubExpand");
  var main = document.getElementById("hubMain");
  if (!host || !exp) return;
  Object.keys(frames).forEach(function (f) {
    frames[f].style.display = f === file ? "block" : "none";
  });
  var ifr = ensureFrame(file);
  if (ifr && ifr.parentNode !== host) host.appendChild(ifr);
  if (ifr) {
    ifr.style.display = "block";
    ifr.style.width = "100%";
    ifr.style.height = "100%";
    ifr.style.border = "0";
  }
  exp.classList.add("open");
  document.body.classList.add("tt-expand-open");
  if (main) main.style.display = "none";
  var title = document.getElementById("expandTitle");
  if (title) title.textContent = metaFor(file).title || file;
  renderMiniList();
}

function collapseExpand() {
  expanded = null;
  var exp = document.getElementById("hubExpand");
  var main = document.getElementById("hubMain");
  var pool = document.getElementById("framePool");
  if (exp) exp.classList.remove("open");
  document.body.classList.remove("tt-expand-open");
  if (main) main.style.display = "";
  Object.keys(frames).forEach(function (f) {
    var ifr = frames[f];
    if (pool && ifr.parentNode !== pool) pool.appendChild(ifr);
    ifr.style.display = "none";
  });
  renderMiniList();
}

function closeTab(file) {
  if (expanded === file) collapseExpand();
  var ifr = frames[file];
  if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr);
  delete frames[file];
  dropMiniTab(file);
  renderMiniList();
}

function renderMiniList() {
  var bar = document.getElementById("miniBar");
  var list = document.getElementById("miniList");
  if (!bar || !list) return;
  var tabs = getMiniTabs();
  if (!tabs.length) {
    bar.hidden = true;
    list.innerHTML = "";
    return;
  }
  bar.hidden = false;
  list.innerHTML = tabs.map(function (t) {
    var f = (t && t.file) || t;
    var title = (t && t.title) || metaFor(f).title || toolKey(f);
    var on = expanded === f ? " active" : "";
    return '<button type="button" class="mini-chip' + on + '" data-file="' + esc(f) + '">' +
      '<span class="ico">' + iconFor(f, title) + '</span> ' + esc(title) +
      ' <span class="x" data-close="' + esc(f) + '">×</span></button>';
  }).join("");
  list.querySelectorAll(".mini-chip").forEach(function (btn) {
    btn.onclick = function (e) {
      var close = e.target && e.target.getAttribute && e.target.getAttribute("data-close");
      if (close) { closeTab(close); return; }
      expandTab(btn.getAttribute("data-file"));
    };
  });
}

function bootMini() {
  if (!window.TarkovState) { setTimeout(bootMini, 40); return; }
  renderMiniList();
  try {
    if (TarkovState.on) {
      TarkovState.on("mini", function () { renderMiniList(); });
      TarkovState.on("notification", function () { renderMiniList(); });
    }
  } catch (e) {}
}

var PINS_KEY = "tarkovHubPins";
function loadPins() { try { return JSON.parse(localStorage.getItem(PINS_KEY) || "[]"); } catch (e) { return []; } }
function savePins(pins) { try { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); } catch (e) {} }
function togglePin(file, ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  var pins = loadPins();
  if (pins.indexOf(file) >= 0) pins = pins.filter(function (f) { return f !== file; });
  else pins.push(file);
  savePins(pins);
  renderCatalog();
}
function cardHtml(t, pinned) {
  return '<div class="tool" data-open="' + esc(t.file) + '" role="link" tabindex="0">' +
    '<button type="button" class="tool-pin ' + (pinned ? "on" : "") + '" data-pin="' + esc(t.file) + '" title="' + (pinned ? "Unpin" : "Pin") + '">' + (pinned ? "📌" : "📍") + '</button>' +
    '<div class="tool-head"><div class="tool-ico">' + iconFor(t.file, t.title) + '</div>' +
    '<div style="padding-right:28px"><h2>' + esc(t.title) + '</h2><p>' + esc(t.description || "") + '</p></div></div></div>';
}
function renderCatalog() {
  var qEl = document.getElementById("q");
  var q = (qEl && qEl.value || "").toLowerCase().trim();
  var pins = loadPins();
  var list = getCatalog().slice();
  if (q) list = list.filter(function (t) { return (t.title + t.description).toLowerCase().indexOf(q) >= 0; });
  var pinned = list.filter(function (t) { return pins.indexOf(t.file) >= 0; });
  var rest = list.filter(function (t) { return pins.indexOf(t.file) < 0; });
  pinned.sort(function (a, b) { return pins.indexOf(a.file) - pins.indexOf(b.file); });
  var count = document.getElementById("count");
  if (count) count.textContent = list.length + " / " + getCatalog().length;
  var html = "";
  if (pinned.length) {
    html += '<div class="pins-label" style="grid-column:1/-1">Pinned</div>';
    html += pinned.map(function (t) { return cardHtml(t, true); }).join("");
    if (rest.length) html += '<div class="pins-label" style="grid-column:1/-1">All tools</div>';
  }
  html += rest.map(function (t) { return cardHtml(t, false); }).join("");
  var grid = document.getElementById("grid");
  if (grid) grid.innerHTML = html;
  document.querySelectorAll(".tool-pin").forEach(function (btn) {
    btn.onclick = function (e) { togglePin(btn.getAttribute("data-pin"), e); };
  });
  document.querySelectorAll(".tool[data-open]").forEach(function (card) {
    card.onclick = function (e) {
      if (e.target.closest && e.target.closest(".tool-pin")) return;
      if (e.ctrlKey || e.metaKey) { window.open(card.getAttribute("data-open"), "_blank"); return; }
      openToolAsMini(card.getAttribute("data-open"));
    };
    card.onkeydown = function (e) { if (e.key === "Enter") openToolAsMini(card.getAttribute("data-open")); };
  });
}
window.renderCatalog = renderCatalog;

function renderChangelog() {
  var el = document.getElementById("changelog");
  if (!el) return;
  el.innerHTML = "<h3>Changelog</h3>" + CHANGELOG.map(function (b) {
    return '<div style="margin-bottom:12px"><strong>' + esc(b.date) + '</strong><ul>' +
      b.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>";
  }).join("");
}

var qInput = document.getElementById("q");
if (qInput) qInput.addEventListener("input", renderCatalog);
renderCatalog();
renderChangelog();
bootMini();
window.addEventListener("tarkov-catalog-ready", function () {
  try { renderCatalog(); } catch (e) {}
});
var btnCollapse = document.getElementById("btnCollapse");
if (btnCollapse) btnCollapse.onclick = collapseExpand;
var btnCloseExpand = document.getElementById("btnCloseExpand");
if (btnCloseExpand) btnCloseExpand.onclick = function () { if (expanded) closeTab(expanded); };
setInterval(function () {
  var keys = Object.keys(frames);
  if (!keys.length) return;
  for (var i = 0; i < keys.length; i++) {
    try {
      var ifr = frames[keys[i]];
      if (ifr && ifr.contentWindow) ifr.contentWindow.postMessage({ type: "tt-ping-status" }, location.origin);
    } catch (e) {}
  }
}, 15000);
