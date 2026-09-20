window.TarkovHubMini = true;

function getCatalog() { return window.TarkovHubCATALOG || []; }
var CHANGELOG = [{"date":"2026-09-17","items":["Mini tabs, notifications","Catalog categories","TarkovAPI, TarkovNames"]},{"date":"2026-09-20","items":["Stage 0 platform contract","kind live|static","single sound owner"]}];
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
function isLiveTool(file) {
  try { if (window.TarkovToolKind) return TarkovToolKind.isLive(file); } catch (e) {}
  var k = toolKey(file);
  return k === "tarkovtool-price-track.html" || k === "tarkovtool-price-alarm.html" || k === "tarkovtool-restock.html";
}

function getMiniTabs() {
  var tabs = [];
  try {
    if (window.TarkovState) {
      if (TarkovState.getMiniTabs) tabs = TarkovState.getMiniTabs() || [];
      else if (TarkovState.getMini) tabs = TarkovState.getMini() || [];
    }
  } catch (e) {}
  if (tabs && tabs.length) return tabs;
  try {
    tabs = JSON.parse(localStorage.getItem("tarkovMiniTabs.v1") || "[]") || [];
  } catch (e) { tabs = []; }
  return Array.isArray(tabs) ? tabs : [];
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
      }
    }
  } catch (e) {}
  try {
    var cur = JSON.parse(localStorage.getItem("tarkovMiniTabs.v1") || "[]") || [];
    cur = cur.filter(function (t) { return (t.file || t) !== file; });
    cur.push(tab);
    localStorage.setItem("tarkovMiniTabs.v1", JSON.stringify(cur));
  } catch (e2) {}
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
  try {
    var cur = JSON.parse(localStorage.getItem("tarkovMiniTabs.v1") || "[]") || [];
    cur = cur.filter(function (t) { return (t.file || t) !== file; });
    localStorage.setItem("tarkovMiniTabs.v1", JSON.stringify(cur));
  } catch (e2) {}
}

var frames = Object.create(null);
var expanded = null;
var statusMap = Object.create(null);

function ensureFrame(file) {
  if (frames[file]) return frames[file];
  var pool = document.getElementById("framePool");
  if (!pool) return null;
  var ifr = document.createElement("iframe");
  ifr.setAttribute("loading", "eager");
  ifr.title = metaFor(file).title || file;
  ifr.dataset.tool = file;
  ifr.style.cssText = "width:1100px;height:800px;border:0;background:#0f1115;opacity:0;pointer-events:none;";
  pool.appendChild(ifr);
  ifr.src = file;
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
    frames[f].style.opacity = f === file ? "1" : "0";
    frames[f].style.pointerEvents = f === file ? "auto" : "none";
  });
  var ifr = ensureFrame(file);
  if (ifr && ifr.parentNode !== host) host.appendChild(ifr);
  if (ifr) {
    ifr.style.display = "block";
    ifr.style.opacity = "1";
    ifr.style.pointerEvents = "auto";
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
    ifr.style.display = "";
    ifr.style.opacity = "0";
    ifr.style.pointerEvents = "none";
    ifr.style.width = "1100px";
    ifr.style.height = "800px";
  });
  renderMiniList();
}

function closeTab(file) {
  if (expanded === file) collapseExpand();
  var ifr = frames[file];
  if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr);
  delete frames[file];
  delete statusMap[toolKey(file)];
  dropMiniTab(file);
  renderMiniList();
}

function unreadCount(file) {
  try {
    if (window.TarkovState && TarkovState.unreadForTool) return TarkovState.unreadForTool(toolKey(file)) || 0;
  } catch (e) {}
  return 0;
}
function unreadItems(file) {
  try {
    if (!window.TarkovState || !TarkovState.notifications) return [];
    var key = toolKey(file);
    return (TarkovState.notifications() || []).filter(function (n) {
      return !n.read && toolKey(n.tool || "") === key;
    }).slice(0, 5);
  } catch (e) { return []; }
}
function frameStatus(file) {
  return statusMap[toolKey(file)] || { ready: false, running: false, label: "", ts: 0 };
}

function renderMiniList() {
  var list = document.getElementById("miniList");
  var bar = document.getElementById("miniBar");
  if (!list || !bar) return;
  var tabs = getMiniTabs();
  if (!tabs.length) { bar.hidden = true; list.innerHTML = ""; return; }
  bar.hidden = false;
  list.innerHTML = tabs.map(function (t) {
    var f = (t && t.file) || t;
    var n = unreadCount(f);
    var st = frameStatus(f);
    var act = expanded === f ? " active" : "";
    var run = (isLiveTool(f) && st.running) ? " running" : "";
    var title = (t && t.title) || metaFor(f).title || toolKey(f);
    return '<button type="button" class="mini-chip' + act + run + '" data-file="' + esc(f) + '" aria-label="' + esc(title) + '">' +
      '<span class="ico">' + iconFor(f, title) + '</span>' +
      (n ? '<span class="badge">' + n + '</span>' : '') +
      (isLiveTool(f) && st.running ? '<span class="dot-run"></span>' : '') +
      '</button>';
  }).join("");
  list.querySelectorAll(".mini-chip").forEach(function (btn) {
    var file = btn.getAttribute("data-file");
    btn.onclick = function () { expandTab(file); };
    btn.onmouseenter = function (e) { showChipTip(e, file); };
    btn.onmouseleave = hideTip;
    btn.oncontextmenu = function (e) {
      e.preventDefault();
      closeTab(file);
      hideTip();
    };
  });
}

function showChipTip(e, file) {
  var tip = document.getElementById("miniTip");
  if (!tip) return;
  var st = frameStatus(file);
  var items = unreadItems(file);
  var title = metaFor(file).title || toolKey(file);
  var live = isLiveTool(file);
  var statusLine;
  if (!frames[file]) statusLine = "не загружен";
  else if (!st.ready && !st.running) statusLine = "загрузка…";
  else if (live && st.running) statusLine = "● запущен" + (st.label ? " · " + st.label : "");
  else if (live) statusLine = "загружен (фон)";
  else statusLine = "открыт";
  var html = '<div class="tip-title">' + esc(title) + '</div>';
  html += '<div class="tip-status' + (live && st.running ? " on" : "") + '">' + esc(statusLine) + '</div>';
  if (items.length) {
    html += items.map(function (n) {
      return '<div class="row-n"><div class="t">' + esc(n.title) + '</div><div class="b">' + esc(n.body || "") + '</div></div>';
    }).join("");
  } else {
    html += '<div class="b" style="color:var(--muted)">Нет непрочитанных</div>';
  }
  html += '<div class="b" style="margin-top:6px;color:var(--muted)">ПКМ — закрыть вкладку</div>';
  tip.innerHTML = html;
  tip.style.display = "block";
  tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 320) + "px";
  tip.style.top = Math.min(e.clientY + 14, window.innerHeight - 160) + "px";
}
function hideTip() {
  var tip = document.getElementById("miniTip");
  if (tip) tip.style.display = "none";
}

function bootMini(attempt) {
  attempt = attempt || 0;
  var pool = document.getElementById("framePool");
  if ((!window.TarkovState || !pool) && attempt < 80) {
    setTimeout(function () { bootMini(attempt + 1); }, 40);
    return;
  }
  var tabs = getMiniTabs();
  try {
    if (window.TarkovState && TarkovState.setMiniTabs && tabs.length) {
      TarkovState.setMiniTabs(tabs);
    }
  } catch (e) {}
  for (var i = 0; i < tabs.length; i++) {
    var f = (tabs[i] && tabs[i].file) || tabs[i];
    if (!f) continue;
    try {
      ensureFrame(f);
      var k = toolKey(f);
      if (!statusMap[k]) {
        var live = isLiveTool(f);
        statusMap[k] = {
          ready: !live,
          running: false,
          label: live ? "восстановление…" : "",
          ts: Date.now()
        };
      }
    } catch (e) {}
  }
  renderMiniList();
  if (!bootMini._wired) {
    bootMini._wired = true;
    try {
      if (window.TarkovState && TarkovState.on) {
        TarkovState.on("mini", function () { renderMiniList(); });
        TarkovState.on("notification", function () { renderMiniList(); });
      }
    } catch (e) {}
    try {
      window.addEventListener("message", function (ev) {
        if (ev.origin !== location.origin) return;
        var d = ev.data;
        if (!d || typeof d !== "object") return;
        if (d.type === "tt-status" || d.type === "tt-tool-status") {
          var key = toolKey(d.tool || d.file || "");
          if (!key) return;
          statusMap[key] = {
            ready: d.ready !== false,
            running: !!d.running,
            label: d.label || "",
            ts: Date.now()
          };
          renderMiniList();
        }
        if (d.type === "tt-notify") {
          // Sound ownership: ONLY Notify()/TarkovTools.beep in the tool frame — hub must not beep again.
          try {
            if (window.TarkovState && TarkovState.notify) {
              TarkovState.notify({
                title: d.title || "",
                body: d.body || "",
                tool: d.tool || "",
                kind: d.kind || "ok"
              });
            }
          } catch (e) {}
          try { if (typeof updateNotifBell === "function") updateNotifBell(); } catch (e) {}
          try { renderMiniList(); } catch (e) {}
        }
      });
    } catch (e) {}
  }
  if (attempt < 5) {
    setTimeout(function () {
      var later = getMiniTabs();
      var changed = false;
      for (var j = 0; j < later.length; j++) {
        var ff = (later[j] && later[j].file) || later[j];
        if (ff && !frames[ff]) {
          try { ensureFrame(ff); changed = true; } catch (e) {}
        }
      }
      if (changed || later.length) renderMiniList();
    }, 300 + attempt * 200);
  }
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
window.cardHtml = cardHtml;
window.togglePin = togglePin;

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
      var f = keys[i];
      if (!isLiveTool(f)) continue;
      var ifr = frames[f];
      if (ifr && ifr.contentWindow) ifr.contentWindow.postMessage({ type: "tt-ping-status" }, location.origin);
    } catch (e) {}
  }
}, 15000);
