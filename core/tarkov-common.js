/*! Tarkov Tools common — theme, i18n helpers, sound, Notify, settings bar */
(function (global) {
  "use strict";

  function ttRoot() {
    try {
      var p = location.pathname || "";
      if (p.indexOf("/tools/") >= 0) return "../";
    } catch (e) {}
    return "";
  }
  function ttUrl(rel) {
    var root = ttRoot();
    rel = String(rel || "").replace(/^\//, "");
    return root + rel;
  }
  const KEYS = {
    theme: "tarkovTheme",
    lang: "tarkovLang",
    sound: "tarkovSound",
    volume: "tarkovSoundVolume",
    mode: "tarkovPreferredGameMode",
    accent: "tarkovAccent",
    tips: "tarkovTips",
    seen: "tarkovSettingsSeen"
  };
  const ACCENTS = {
    gold: "#c9a227", blue: "#5b9fd4", green: "#3dd68c", cyan: "#2ec4b6",
    purple: "#a78bfa", orange: "#e0a458", red: "#f07178", pink: "#e879a9", slate: "#94a3b8"
  };
  const I18N = {
    ru: { settings:"Настройки", theme:"Тема", themeDark:"Тёмная", themeLight:"Светлая", lang:"Язык", sound:"Звук", soundOn:"Вкл", soundOff:"Выкл", mode:"Режим по умолчанию", close:"Закрыть", export:"Экспорт", import:"Импорт", importOk:"Импорт выполнен", importFail:"Ошибка импорта", search:"Поиск по таблице…", welcomeTitle:"Настройки Tarkov Tools", welcomeBody:"Тема, язык, звук, режим и акцент.", apply:"Применить", hub:"Хаб", accent:"Акцент", tips:"Подсказки тулзов", tipsOn:"Вкл", tipsOff:"Выкл", volume:"Громкость", testSound:"Тест" },
    en: { settings:"Settings", theme:"Theme", themeDark:"Dark", themeLight:"Light", lang:"Language", sound:"Sound", soundOn:"On", soundOff:"Off", mode:"Default mode", close:"Close", export:"Export", import:"Import", importOk:"Import done", importFail:"Import failed", search:"Filter table…", welcomeTitle:"Tarkov Tools settings", welcomeBody:"Theme, language, sound, mode and accent.", apply:"Apply", hub:"Hub", accent:"Accent", tips:"Tool tips", tipsOn:"On", tipsOff:"Off", volume:"Volume", testSound:"Test" }
  };

  function get(k, def) {
    try {
      var v = localStorage.getItem(k);
      return v == null ? def : v;
    } catch (e) { return def; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, String(v)); } catch (e) {}
  }

  function lang() {
    try {
      if (window.TarkovI18n && TarkovI18n.current) return TarkovI18n.current;
    } catch (e) {}
    var v = get(KEYS.lang, "ru") || "ru";
    return v;
  }
  function t(key) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) return v;
        v = TarkovI18n.t("common." + key);
        if (v && v !== "common." + key) return v;
      }
    } catch (e) {}
    var pack = I18N[lang()] || I18N.ru;
    return pack[key] != null ? pack[key] : (I18N.en[key] || key);
  }

  function soundEnabled() { return get(KEYS.sound, "1") !== "0"; }
  function volume() {
    var v = parseFloat(get(KEYS.volume, get("tarkovSoundVol", "0.5")));
    return isNaN(v) ? 0.5 : Math.min(1, Math.max(0, v));
  }
  function preferredMode() { return get(KEYS.mode, "pve") || "pve"; }
  function tipsEnabled() { return get(KEYS.tips, get("tarkovToolTips", "1")) !== "0"; }

  function applyTheme() {
    var th = get(KEYS.theme, "dark") === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", th);
    var acc = get(KEYS.accent, "gold");
    if (ACCENTS[acc]) document.documentElement.style.setProperty("--accent", ACCENTS[acc]);
  }

  function unlockAudio() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      var ctx = beep._ctx || (beep._ctx = new Ctx());
      if (ctx.state === "suspended") {
        try { ctx.resume(); } catch (e) {}
      }
      return ctx;
    } catch (e) { return null; }
  }

  function tone(ctx, freq, start, dur, vol, type) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    var v = Math.max(0.0001, vol);
    g.gain.setValueAtTime(v, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  function beep(kind) {
    if (!soundEnabled()) return;
    try {
      var ctx = unlockAudio();
      if (!ctx) return;
      var now = ctx.currentTime;
      var vol = volume() * 0.22;
      kind = kind || "ok";
      if (kind === "ok" || kind === "price") {
        tone(ctx, 880, now, 0.1, vol);
        tone(ctx, 1174, now + 0.1, 0.12, vol * 0.9);
      } else if (kind === "restock") {
        tone(ctx, 523, now, 0.12, vol);
        tone(ctx, 659, now + 0.14, 0.14, vol);
        tone(ctx, 784, now + 0.3, 0.18, vol);
      } else if (kind === "alarm" || kind === "warn") {
        tone(ctx, 440, now, 0.15, vol, "square");
        tone(ctx, 440, now + 0.2, 0.15, vol, "square");
        tone(ctx, 330, now + 0.4, 0.25, vol * 1.1, "square");
      } else if (kind === "error") {
        tone(ctx, 220, now, 0.2, vol, "sawtooth");
        tone(ctx, 180, now + 0.18, 0.25, vol, "sawtooth");
      } else {
        tone(ctx, 520, now, 0.1, vol);
      }
    } catch (e) {}
  }

  function pushNotifLocal(opts) {
    opts = opts || {};
    try {
      if (window.TarkovState && TarkovState.notify) {
        return TarkovState.notify(opts);
      }
    } catch (e) {}
    try {
      var key = "tarkovNotifications.v1";
      var list = [];
      try { list = JSON.parse(localStorage.getItem(key) || "[]") || []; } catch (e2) {}
      var item = {
        id: "n" + Date.now() + Math.random().toString(36).slice(2, 6),
        ts: Date.now(),
        read: false,
        tool: String(opts.tool || "").split("/").pop(),
        title: opts.title || "",
        body: opts.body || "",
        kind: opts.kind || ""
      };
      list.unshift(item);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
      return item;
    } catch (e) { return null; }
  }

  /** Platform Notify — sole owner of notification sound (hub must not beep on tt-notify). */
  function Notify(opts) {
    opts = opts || {};
    pushNotifLocal(opts);
    if (opts.silent !== true) {
      var kind = opts.kind || opts.sound || "ok";
      if (kind === "price") kind = "ok";
      beep(kind);
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: "tt-notify",
          title: opts.title || "",
          body: opts.body || "",
          tool: opts.tool || "",
          kind: opts.kind || "ok",
          silent: !!opts.silent
        }, location.origin);
      }
    } catch (e) {}
    return opts;
  }
  window.Notify = Notify;

  function exportAll() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("tarkov") === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tarkov-tools-settings.json";
    a.click();
  }
  function importAll(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        Object.keys(data).forEach(function (k) {
          if (k.indexOf("tarkov") === 0) localStorage.setItem(k, data[k]);
        });
        applyTheme();
        alert(t("importOk"));
      } catch (e) { alert(t("importFail")); }
    };
    reader.readAsText(file);
  }

  function openSettings() {
    if (window.TarkovSettingsTabs && TarkovSettingsTabs.open) {
      TarkovSettingsTabs.open();
      return;
    }
  }

  function paintBar() {
    var bar = document.getElementById("tt-tools-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "tt-tools-bar";
      bar.className = "tt-tools-bar";
      bar.innerHTML =
        '<button type="button" class="btn-ghost" id="tt-bar-settings" title="Settings">⚙</button>' +
        '<button type="button" class="btn-ghost" id="tt-bar-theme" title="Theme">🌓</button>' +
        '<button type="button" class="btn-ghost" id="tt-bar-lang" title="Language">🌐</button>';
      document.body.appendChild(bar);
    }
    var btnS = document.getElementById("tt-bar-settings");
    var btnT = document.getElementById("tt-bar-theme");
    var btnL = document.getElementById("tt-bar-lang");
    if (btnS) btnS.onclick = function () { openSettings(); };
    if (btnT) btnT.onclick = function () {
      var th = get(KEYS.theme, "dark") === "light" ? "dark" : "light";
      set(KEYS.theme, th);
      applyTheme();
    };
    if (btnL) btnL.onclick = function () {
      var cur = lang();
      var next = cur === "ru" ? "en" : "ru";
      set(KEYS.lang, next);
      if (window.TarkovI18n && TarkovI18n.setLang) {
        TarkovI18n.setLang(next).then(function () {
          try { TarkovI18n.applyDom(document); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent("tt-lang-changed", { detail: { lang: next } })); } catch (e) {}
        });
      } else {
        try { window.dispatchEvent(new CustomEvent("tt-lang-changed", { detail: { lang: next } })); } catch (e) {}
      }
    };
  }

  function enhanceTable(table, filterInput) {
    if (!table || table._ttEnhanced) return;
    table._ttEnhanced = true;
    var sortState = { col: -1, dir: 0 };
    function rows() {
      return [].slice.call(table.tBodies[0] ? table.tBodies[0].rows : []);
    }
    function applyFilter() {
      var q = (filterInput && filterInput.value || "").toLowerCase().trim();
      rows().forEach(function (r) {
        r.style.display = !q || r.textContent.toLowerCase().indexOf(q) >= 0 ? "" : "none";
      });
    }
    if (filterInput) filterInput.addEventListener("input", applyFilter);
    new MutationObserver(function () { applyFilter(); }).observe(table.tBodies[0] || table, { childList: true, subtree: true });
    [].forEach.call(table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells : [], function (th, idx) {
      th.style.cursor = "pointer";
      th.addEventListener("click", function () {
        if (sortState.col === idx) sortState.dir = sortState.dir === 1 ? -1 : (sortState.dir === -1 ? 0 : 1);
        else { sortState.col = idx; sortState.dir = 1; }
        [].forEach.call(table.tHead.rows[0].cells, function (c) {
          c.classList.remove("sorted-asc", "sorted-desc");
          c.removeAttribute("aria-sort");
        });
        if (sortState.dir === 0) { applyFilter(); return; }
        th.classList.add(sortState.dir === 1 ? "sorted-asc" : "sorted-desc");
        th.setAttribute("aria-sort", sortState.dir === 1 ? "ascending" : "descending");
        var sorted = rows().slice().sort(function (a, b) {
          var av = (a.cells[idx] && a.cells[idx].textContent || "").trim();
          var bv = (b.cells[idx] && b.cells[idx].textContent || "").trim();
          var an = parseFloat(av.replace(/[^\d.-]/g, ""));
          var bn = parseFloat(bv.replace(/[^\d.-]/g, ""));
          var cmp = (!isNaN(an) && !isNaN(bn)) ? (an - bn) : av.localeCompare(bv, undefined, { numeric: true });
          return sortState.dir === 1 ? cmp : -cmp;
        });
        var body = table.tBodies[0];
        sorted.forEach(function (r) { body.appendChild(r); });
      });
    });
  }

  function hiddenTools() {
    try { return JSON.parse(get("tarkovHiddenTools", "[]")) || []; } catch (e) { return []; }
  }
  function setHiddenTools(arr) {
    set("tarkovHiddenTools", JSON.stringify(arr || []));
    try { window.dispatchEvent(new CustomEvent("tt-hidden-changed")); } catch (e) {}
  }

  global.TarkovTools = {
    KEYS: KEYS,
    ACCENTS: ACCENTS,
    get: get,
    set: set,
    lang: lang,
    t: t,
    soundEnabled: soundEnabled,
    volume: volume,
    preferredMode: preferredMode,
    tipsEnabled: tipsEnabled,
    applyTheme: applyTheme,
    beep: beep,
    Notify: Notify,
    unlockAudio: unlockAudio,
    exportAll: exportAll,
    importAll: importAll,
    openSettings: openSettings,
    enhanceTable: enhanceTable,
    hiddenTools: hiddenTools,
    setHiddenTools: setHiddenTools,
    ttUrl: ttUrl
  };

  applyTheme();
  try {
    var unlockOnce = function () { unlockAudio(); };
    document.addEventListener("pointerdown", unlockOnce, { passive: true });
    document.addEventListener("keydown", unlockOnce, { passive: true });
  } catch (e) {}
  try {
    if (window.TarkovI18n && TarkovI18n.ready) {
      TarkovI18n.ready.then(function () {
        try { TarkovI18n.applyDom(document); } catch (e) {}
      });
    }
  } catch (e) {}
  window.addEventListener("tt-lang-changed", function () {
    try {
      if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
    } catch (e) {}
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { try { paintBar(); } catch (e) {} });
  } else {
    try { paintBar(); } catch (e) {}
  }
})(window);
