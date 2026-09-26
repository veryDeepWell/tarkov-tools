window.TarkovHubMini = true;

function getCatalog() { return window.TarkovHubCATALOG || []; }
var CHANGELOG = [
  { date: "2026-09-17", items: ["Mini tabs, notifications", "Catalog categories", "TarkovAPI, TarkovNames"] },
  { date: "2026-09-20", items: ["Stage 0 platform contract", "kind live|static", "single sound owner"] },
  { date: "2026-09-21", items: ["Stage 1 live runtime", "Stage 3 UI shell inject"] },
  { date: "2026-09-22", items: ["Stage 4 i18n + single catalog.json", "Hub category collapse"] },
  { date: "2026-09-25", items: ["FAQ in header", "Per-kind sound settings restore"] },
  { date: "2026-09-26", items: ["Live tools: no iframe reparent (timers keep running)"] }
];
var ICONS = [[/btc/i,"₿"],[/cultist/i,"⛧"],[/my-tarkov/i,"👤"],[/helmet/i,"🪖"],[/nvg/i,"🌑"],[/price-track/i,"📈"],[/price-alarm/i,"🔔"],[/food/i,"🍖"],[/random-loadout/i,"🎲"],[/loadout-budget/i,"💰"],[/loadout-builder/i,"🧰"],[/drip-builder/i,"🎨"],[/drip-loadout/i,"✨"],[/ammo/i,"🔫"],[/armor/i,"🛡️"],[/barter/i,"🧮"],[/boss/i,"👹"],[/compare/i,"⚖️"],[/container/i,"🎒"],[/craft/i,"🔧"],[/drip/i,"🕶️"],[/gun/i,"🛠️"],[/hideout/i,"🏗️"],[/key/i,"🔑"],[/lang/i,"🌐"],[/loot/i,"📦"],[/item-use/i,"💡"],[/mag/i,"📟"],[/med/i,"💊"],[/mods/i,"🔩"],[/plate/i,"🧱"],[/quest/i,"📜"],[/raid/i,"✅"],[/restock/i,"⏰"],[/scope/i,"🔭"],[/short/i,"🏷️"],[/skill/i,"📈"],[/stim/i,"💉"],[/streamer/i,"📺"],[/trader/i,"🏪"],[/desk/i,"🗂️"]];

function tt(key, fallback, params) {
  try {
    if (window.TarkovI18n && TarkovI18n.t) {
      var v = TarkovI18n.t(key, params);
      if (v && v !== key) return v;
    }
  } catch (e) {}
  var s = fallback || key;
  if (params) {
    Object.keys(params).forEach(function (k) {
      s = String(s).split("{" + k + "}").join(String(params[k]));
    });
  }
  return s;
}

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
  var base = c || { file: file, title: toolKey(file), description: "" };
  try {
    if (window.TarkovI18n) {
      var ti = TarkovI18n.toolTitle(file);
      var de = TarkovI18n.toolDesc ? TarkovI18n.toolDesc(file) : "";
      if (ti && ti.indexOf("tool.") !== 0) base = Object.assign({}, base, { title: ti });
      if (de && de.indexOf("tool.") !== 0) base = Object.assign({}, base, { description: de });
    }
  } catch (e) {}
  return base;
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
  var k = toolKey(file);
  if (!statusMap[k]) {
    statusMap[k] = { ready: false, running: false, label: "", ts: Date.now() };
  }
  ifr.addEventListener("load", function () {
    var live = isLiveTool(file);
    var prev = statusMap[k] || {};
    statusMap[k] = {
      ready: true,
      running: live ? !!prev.running : false,
      label: prev.label || "",
      ts: Date.now()
    };
    try { renderMiniList(); } catch (e) {}
    try {
      var doc = ifr.contentDocument;
      if (doc && !doc.getElementById("tt-tool-shell")) {
        var s = doc.createElement("script");
        s.id = "tt-tool-shell";
        var base = location.pathname.replace(/\/[^/]*$/, "/");
        s.src = base + "core/tarkov-tool-shell.js";
        (doc.head || doc.documentElement).appendChild(s);
      }
    } catch (e) {}
  });
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

/** Keep iframes in #framePool forever — moving them in DOM reloads the tool and kills timers. */
function layoutFramePool() {
  var pool = document.getElementById("framePool");
  var host = document.getElementById("expandHost");
  if (!pool) return;
  if (expanded && host) {
    var r = host.getBoundingClientRect();
    pool.style.cssText =
      "position:fixed;left:" +
      Math.max(0, Math.floor(r.left)) +
      "px;top:" +
      Math.max(0, Math.floor(r.top)) +
      "px;width:" +
      Math.max(1, Math.floor(r.width)) +
      "px;height:" +
      Math.max(1, Math.floor(r.height)) +
      "px;z-index:45;overflow:hidden;margin:0;padding:0;border:0;background:var(--bg,#0f1115);";
    Object.keys(frames).forEach(function (f) {
      var ifr = frames[f];
      if (!ifr) return;
      var on = f === expanded;
      ifr.style.cssText = on
        ? "width:100%;height:100%;border:0;display:block;opacity:1;pointer-events:auto;background:#0f1115;"
        : "width:100%;height:100%;border:0;display:block;opacity:0;pointer-events:none;position:absolute;left:-9999px;top:0;";
    });
  } else {
    pool.style.cssText =
      "position:fixed;left:-12000px;top:0;width:1px;height:1px;overflow:hidden;z-index:0;";
    Object.keys(frames).forEach(function (f) {
      var ifr = frames[f];
      if (!ifr) return;
      ifr.style.cssText =
        "width:1100px;height:800px;border:0;opacity:0;pointer-events:none;display:block;background:#0f1115;";
    });
  }
}

function expandTab(file) {
  expanded = file;
  var host = document.getElementById("expandHost");
  var exp = document.getElementById("hubExpand");
  var main = document.getElementById("hubMain");
  if (!host || !exp) return;
  ensureFrame(file);
  exp.classList.add("open");
  document.body.classList.add("tt-expand-open");
  if (main) main.style.display = "none";
  var title = document.getElementById("expandTitle");
  if (title) title.textContent = metaFor(file).title || file;
  layoutFramePool();
  renderMiniList();
  try {
    requestAnimationFrame(layoutFramePool);
    setTimeout(layoutFramePool, 50);
  } catch (e) {}
}

function collapseExpand() {
  expanded = null;
  var exp = document.getElementById("hubExpand");
  var main = document.getElementById("hubMain");
  if (exp) exp.classList.remove("open");
  document.body.classList.remove("tt-expand-open");
  if (main) main.style.display = "";
  layoutFramePool();
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
  var labelEl = bar.querySelector(".mini-label");
  if (labelEl) labelEl.textContent = tt("hub.mini", "MINI");
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
      '<span class="mini-ico" aria-hidden="true">' + iconFor(f, title) + '</span>' +
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
  if (!frames[file]) statusLine = tt("common.notLoaded", "Not loaded");
  else if (!st.ready && !st.running) statusLine = tt("common.loading", "Loading…");
  else if (live && st.running) statusLine = "● " + tt("hub.statusRunning", "Running") + (st.label ? " · " + st.label : "");
  else if (live) statusLine = tt("common.loadedBg", "Background") + (st.label ? " · " + st.label : "");
  else statusLine = tt("hub.statusLoaded", "Open");
  var html = '<div class="tip-title">' + esc(title) + '</div>';
  html += '<div class="tip-status' + (live && st.running ? " on" : "") + '">' + esc(statusLine) + '</div>';
  if (items.length) {
    html += items.map(function (n) {
      return '<div class="row-n"><div class="t">' + esc(n.title) + '</div><div class="b">' + esc(n.body || "") + '</div></div>';
    }).join("");
  } else {
    html += '<div class="b" style="color:var(--muted)">' + esc(tt("common.unreadNone", "No notifications")) + '</div>';
  }
  html += '<div class="b" style="margin-top:6px;color:var(--muted)">' + esc(tt("common.closeTabHint", "Right-click to close")) + '</div>';
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
          ready: false,
          running: false,
          label: live ? tt("common.restoring", "Restoring…") : "",
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
  try { if (typeof window.renderCatalog === "function") window.renderCatalog(); } catch (e) {}
}
function cardHtml(t, pinned) {
  var title = t.title || t.file;
  var desc = t.description || "";
  try {
    if (window.TarkovI18n) {
      var ti = TarkovI18n.toolTitle(t.file);
      var de = TarkovI18n.toolDesc ? TarkovI18n.toolDesc(t.file) : "";
      if (ti && ti.indexOf("tool.") !== 0) title = ti;
      if (de && de.indexOf("tool.") !== 0) desc = de;
    }
  } catch (e) {}
  return '<div class="tool" data-open="' + esc(t.file) + '" role="link" tabindex="0">' +
    '<button type="button" class="tool-help" data-help="' + esc(t.file) + '" title="?" aria-label="Help">?</button>' +
    '<button type="button" class="tool-pin ' + (pinned ? "on" : "") + '" data-pin="' + esc(t.file) + '" title="' +
    esc(pinned ? tt("hub.unpin", "Unpin") : tt("hub.pin", "Pin")) + '">' + (pinned ? "📌" : "📍") + '</button>' +
    '<div class="tool-head"><div class="tool-ico">' + iconFor(t.file, title) + '</div>' +
    '<div style="padding-right:56px"><h2>' + esc(title) + '</h2><p>' + esc(desc) + '</p></div></div></div>';
}
window.cardHtml = cardHtml;
window.togglePin = togglePin;
window.openToolAsMini = openToolAsMini;

function renderChangelog() {
  var el = document.getElementById("changelog");
  if (!el) return;
  el.innerHTML = "<h3>" + esc(tt("hub.changelog", "Changelog")) + "</h3>" + CHANGELOG.map(function (b) {
    return '<div style="margin-bottom:12px"><strong>' + esc(b.date) + '</strong><ul>' +
      b.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>";
  }).join("");
}

function applyHubI18n() {
  try {
    if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
  } catch (e) {}
  var btnS = document.getElementById("tt-open-settings");
  if (btnS) btnS.textContent = tt("common.settings", "Settings");
  var btnF = document.getElementById("tt-open-faq");
  if (btnF) btnF.textContent = tt("hub.faq", "FAQ");
  var btnC = document.getElementById("btnCollapse");
  if (btnC) btnC.textContent = "← " + tt("hub.collapse", "Collapse");
  var btnX = document.getElementById("btnCloseExpand");
  if (btnX) btnX.textContent = tt("hub.closeTab", "Close");
  renderMiniList();
  renderChangelog();
}

var qInput = document.getElementById("q");
if (qInput) {
  qInput.addEventListener("input", function () {
    try { if (typeof window.renderCatalog === "function") window.renderCatalog(); } catch (e) {}
  });
}
renderChangelog();
bootMini();
applyHubI18n();

window.addEventListener("tarkov-catalog-ready", function () {
  try { if (typeof window.renderCatalog === "function") window.renderCatalog(); } catch (e) {}
});
window.addEventListener("tt-lang-changed", function () {
  applyHubI18n();
  try { if (typeof window.renderCatalog === "function") window.renderCatalog(); } catch (e) {}
});

var btnCollapse = document.getElementById("btnCollapse");
if (btnCollapse) btnCollapse.onclick = collapseExpand;
try {
  window.addEventListener("resize", function () {
    if (expanded) layoutFramePool();
  });
} catch (eR) {}
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

function openFaq() {
  var bg = document.getElementById("tt-faq-bg");
  if (!bg) return;
  var titleEl = document.getElementById("tt-faq-title");
  var bodyEl = document.getElementById("tt-faq-body");
  var title = tt("hub.faqTitle", "FAQ");
  var body = "";
  try {
    if (window.TarkovI18n && TarkovI18n.t) {
      var b = TarkovI18n.t("hub.faqBody");
      if (b && b.indexOf("hub.") !== 0) body = b;
    }
  } catch (e) {}
  if (!body) {
    body = "<p><strong>What is this?</strong><br>Tarkov Tools — utilities for Escape from Tarkov.</p>";
  }
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = body;
  bg.hidden = false;
  bg.classList.add("show");
  bg.style.display = "flex";
}
function closeFaq() {
  var bg = document.getElementById("tt-faq-bg");
  if (!bg) return;
  bg.hidden = true;
  bg.classList.remove("show");
  bg.style.display = "none";
}
(function wireFaq() {
  var btn = document.getElementById("tt-open-faq");
  if (btn) btn.onclick = openFaq;
  var x = document.getElementById("tt-faq-close");
  if (x) x.onclick = closeFaq;
  var bg = document.getElementById("tt-faq-bg");
  if (bg) {
    bg.addEventListener("click", function (e) {
      if (e.target === bg) closeFaq();
    });
  }
})();
