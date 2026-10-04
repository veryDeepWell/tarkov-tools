window.TarkovHubMini = true;

function getCatalog() { return window.TarkovHubCATALOG || []; }
var CHANGELOG = [
  { date: "2026-09-17", items: ["Mini tabs, notifications", "Catalog categories", "TarkovAPI, TarkovNames"] },
  { date: "2026-09-20", items: ["Stage 0 platform contract", "kind live|static", "single sound owner"] },
  { date: "2026-09-21", items: ["Stage 1 live runtime", "Stage 3 UI shell inject"] },
  { date: "2026-09-22", items: ["Stage 4 i18n + single catalog.json", "Hub category collapse"] },
  { date: "2026-09-25", items: ["FAQ in header", "Per-kind sound settings restore"] },
  { date: "2026-09-26", items: ["Live tools: warm iframes + parent tt-tick"] },
  { date: "2026-09-26", items: ["Tool contract + hub LiveRuntime owns poll clock"] }
];

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
    if (window.TarkovIcons && TarkovIcons.html) return TarkovIcons.html(file, title);
  } catch (e) {}
  return '<img class="tt-icon-img" src="assets/icons/other.svg" alt="" width="28" height="28">';
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

var miniTabs = window.TarkovHubMiniTabs.create({
  tt: tt,
  toolKey: toolKey,
  metaFor: metaFor,
  isLiveTool: isLiveTool,
  iconFor: iconFor,
  esc: esc
});
window.openToolAsMini = miniTabs.open;

var PINS_KEY = "tarkovHubPins";
function loadPins() { return window.TarkovStorage ? TarkovStorage.getJson(PINS_KEY, []) || [] : []; }
function savePins(pins) {
  if (!window.TarkovStorage) throw new Error("TarkovStorage is required for hub pins");
  TarkovStorage.setJson(PINS_KEY, pins);
}
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
  miniTabs.render();
  renderChangelog();
}

var qInput = document.getElementById("q");
if (qInput) {
  qInput.addEventListener("input", function () {
    try { if (typeof window.renderCatalog === "function") window.renderCatalog(); } catch (e) {}
  });
}
["catFilter", "kindFilter"].forEach(function (id) {
  var filter = document.getElementById(id);
  if (filter) filter.addEventListener("change", function () {
    try { if (typeof window.renderCatalog === "function") window.renderCatalog(); } catch (e) {}
  });
});
renderChangelog();
miniTabs.boot();
applyHubI18n();

window.addEventListener("tarkov-catalog-ready", function () {
  try { if (typeof window.renderCatalog === "function") window.renderCatalog(); } catch (e) {}
});
window.addEventListener("tt-lang-changed", function () {
  applyHubI18n();
  try { if (typeof window.renderCatalog === "function") window.renderCatalog(); } catch (e) {}
});

var btnCollapse = document.getElementById("btnCollapse");
if (btnCollapse) btnCollapse.onclick = miniTabs.collapse;
try {
  window.addEventListener("resize", function () {
    if (miniTabs.isExpanded()) miniTabs.layout();
  });
} catch (eR) {}
var btnCloseExpand = document.getElementById("btnCloseExpand");
if (btnCloseExpand) btnCloseExpand.onclick = miniTabs.closeExpanded;

/* P1: tt-tick / tt-ping-status owned by TarkovLiveRuntime (single 1s loop) */

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
