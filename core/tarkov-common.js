/*! Tarkov Tools common — theme, storage, beep, Notify, settings shell */
(function (global) {
  "use strict";
  if (global.TarkovTools && global.TarkovTools._ttCommon) return;

  var KEYS = {
    theme: "tarkovTheme",
    accent: "tarkovAccent",
    lang: "tarkovLang",
    sound: "tarkovSound",
    volume: "tarkovSoundVolume",
    mode: "tarkovPreferredGameMode",
    tips: "tarkovTips",
    hidden: "tarkovHiddenTools"
  };

  var ACCENTS = {
    gold: "#c9a227", blue: "#5b9fd4", green: "#3dd68c", cyan: "#2ec4b6",
    purple: "#a78bfa", orange: "#e0a458", red: "#f07178", pink: "#e879a9", slate: "#94a3b8"
  };

  function get(k, d) {
    try {
      if (global.TarkovStorage && TarkovStorage.get) {
        var v0 = TarkovStorage.get(k, null);
        return v0 == null ? d : v0;
      }
    } catch (e0) {}
    try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; }
  }
  function set(k, v) {
    try {
      if (global.TarkovStorage && TarkovStorage.set) { TarkovStorage.set(k, v); return; }
    } catch (e0) {}
    try { localStorage.setItem(k, String(v)); } catch (e) {}
  }

  function lang() {
    try {
      if (global.TarkovI18n && TarkovI18n.lang) return TarkovI18n.lang();
    } catch (e) {}
    return get(KEYS.lang, "ru") || "ru";
  }

  var I18N = { ru: {}, en: {} };

  function t(key) {
    try {
      if (global.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    var pack = I18N[lang()] || I18N.ru;
    return pack[key] != null ? pack[key] : (I18N.en[key] || key);
  }

  function soundEnabled() { return get(KEYS.sound, "1") !== "0"; }

  /** Per-tool mute: tarkovSoundTool.<basename> = "0" silences that tool. */
  function toolBase(file) {
    var f = String(file || "");
    var i = f.lastIndexOf("/");
    return i >= 0 ? f.slice(i + 1) : f;
  }
  function toolSoundEnabled(file) {
    if (!file) return true;
    try {
      return get("tarkovSoundTool." + toolBase(file), "1") !== "0";
    } catch (e) {
      return true;
    }
  }

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

  function armAudioUnlock() {
    if (armAudioUnlock._done) return;
    armAudioUnlock._done = true;
    var once = function () {
      try { unlockAudio(); } catch (e) {}
      try {
        document.removeEventListener("pointerdown", once, true);
        document.removeEventListener("keydown", once, true);
        document.removeEventListener("touchstart", once, true);
      } catch (e2) {}
    };
    try {
      document.addEventListener("pointerdown", once, true);
      document.addEventListener("keydown", once, true);
      document.addEventListener("touchstart", once, true);
    } catch (e) {}
  }
  try { armAudioUnlock(); } catch (eArm) {}

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

  function beep(kind, toolOrOpts) {
    if (!soundEnabled()) return;
    try {
      kind = kind || "ok";
      var toolFile = "";
      if (typeof toolOrOpts === "string") toolFile = toolOrOpts;
      else if (toolOrOpts && toolOrOpts.tool) toolFile = toolOrOpts.tool;
      if (toolFile && !toolSoundEnabled(toolFile)) return;
      var kindKey = kind;
      if (kindKey === "warn") kindKey = "alarm";
      if (kindKey === "price") kindKey = "ok";
      if (kindKey === "error") kindKey = "ok";
      try {
        if (get("tarkovSoundKind." + kindKey, "1") === "0") return;
      } catch (e0) {}
      var ctx = unlockAudio();
      if (!ctx) return;
      var now = ctx.currentTime;
      var kMul = 1;
      try {
        kMul = parseFloat(get("tarkovSoundKindVol." + kindKey, "1"));
        if (isNaN(kMul)) kMul = 1;
      } catch (e1) { kMul = 1; }
      var vol = volume() * 0.22 * Math.min(1, Math.max(0, kMul));
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
      try {
        if (global.TarkovStorage && TarkovStorage.getJson)
          list = TarkovStorage.getJson(key, []) || [];
        else
          list = JSON.parse(localStorage.getItem(key) || "[]") || [];
      } catch (e2) { list = []; }
      if (!Array.isArray(list)) list = [];
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
      list = list.slice(0, 200);
      try {
        if (global.TarkovStorage && TarkovStorage.setJson) TarkovStorage.setJson(key, list);
        else localStorage.setItem(key, JSON.stringify(list));
      } catch (e3) {}
      return item;
    } catch (e) { return null; }
  }

  function i18nNotif(opts) {
    opts = opts || {};
    try {
      if (!window.TarkovI18n || !TarkovI18n.t) return opts;
      var params = opts.i18nParams || opts.params || {};
      // P1: key-based (tools pass i18nTitle / i18nBody + optional i18nParams)
      if (opts.i18nTitle) {
        var tit = TarkovI18n.t(opts.i18nTitle, params);
        if (tit && tit !== opts.i18nTitle) opts.title = tit;
      }
      if (opts.i18nBody) {
        var bod = TarkovI18n.t(opts.i18nBody, params);
        if (bod && bod !== opts.i18nBody) opts.body = bod;
      }
    } catch (e) {}
    return opts;
  }

  function Notify(opts) {
    opts = i18nNotif(opts || {});
    pushNotifLocal(opts);
    var kind = opts.kind || opts.sound || "ok";
    if (kind === "price") kind = "ok";
    var inFrame = false;
    try { inFrame = !!(window.parent && window.parent !== window); } catch (eF) {}
    // Inside hub iframe: parent plays sound (iframe AudioContext is often blocked)
    if (opts.silent !== true && !inFrame) {
      if (toolSoundEnabled(opts.tool)) beep(kind, opts.tool);
    }
    try {
      if (inFrame) {
        window.parent.postMessage({
          type: "tt-notify",
          title: opts.title || "",
          body: opts.body || "",
          tool: opts.tool || "",
          kind: kind,
          silent: !!opts.silent
        }, location.origin);
      }
    } catch (e) {}
  }

  function hiddenTools() {
    try { return JSON.parse(get(KEYS.hidden, "[]")) || []; } catch (e) { return []; }
  }
  function setHiddenTools(arr) {
    set(KEYS.hidden, JSON.stringify(arr || []));
    try { window.dispatchEvent(new CustomEvent("tt-hidden-changed")); } catch (e) {}
  }

  function openSettings() {
    /* overridden by settings-tabs.js */
  }

  /** Export / import all tarkov* localStorage keys (settings + tool state). */
  function exportAll() {
    try {
      if (window.TarkovStorage && TarkovStorage.migrateKey) {
        [["restockEnabled","tarkovRestockEnabled"],["restockHistory","tarkovRestockHistory"],["restockFired","tarkovRestockFired"],["restockCycleMs","tarkovRestockCycleMs"],["restockSnapshot","tarkovRestockSnapshot"]].forEach(function (pair) {
          TarkovStorage.migrateKey(pair[0], pair[1]);
        });
      }
    } catch (eM) {}
    var data = {
      _schema: "tarkov-tools-export",
      _version: 1,
      _exportedAt: new Date().toISOString(),
      keys: {}
    };
    try {
      var ks = (global.TarkovStorage && TarkovStorage.keys)
        ? TarkovStorage.keys("tarkov")
        : (function () {
            var a = [];
            try {
              for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf("tarkov") === 0) a.push(k);
              }
            } catch (e) {}
            return a;
          })();
      ks.forEach(function (k) {
        try {
          data.keys[k] = global.TarkovStorage && TarkovStorage.get
            ? TarkovStorage.get(k, null)
            : localStorage.getItem(k);
        } catch (e2) {}
      });
    } catch (e) {}
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tarkov-tools-export-" + data._exportedAt.slice(0, 10) + ".json";
    a.click();
    try { URL.revokeObjectURL(a.href); } catch (e2) {}
  }

  function importAll(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var raw = JSON.parse(reader.result);
        var map = raw;
        if (raw && raw.keys && typeof raw.keys === "object") map = raw.keys;
        if (!map || typeof map !== "object") throw new Error("bad shape");
        Object.keys(map).forEach(function (k) {
          if (k.indexOf("tarkov") === 0 && typeof map[k] === "string") {
            try {
              if (global.TarkovStorage && TarkovStorage.set) TarkovStorage.set(k, map[k]);
              else localStorage.setItem(k, map[k]);
            } catch (eS) {}
          }
        });
        try { applyTheme(); } catch (eT) {}
        try {
          if (global.TarkovI18n && TarkovI18n.setLang) {
            TarkovI18n.setLang(get(KEYS.lang, "ru"));
          }
        } catch (eL) {}
        alert(t("importOk") !== "importOk" ? t("importOk") : "Import OK — reload the page");
        try { window.dispatchEvent(new CustomEvent("tt-settings-applied")); } catch (eE) {}
      } catch (e) {
        alert(t("importFail") !== "importFail" ? t("importFail") : "Import failed");
      }
    };
    reader.readAsText(file);
  }

  global.TarkovTools = global.TarkovTools || {};
  Object.assign(global.TarkovTools, {
    _ttCommon: true,
    get: get,
    set: set,
    t: t,
    lang: lang,
    soundEnabled: soundEnabled,
    toolSoundEnabled: toolSoundEnabled,
    volume: volume,
    preferredMode: preferredMode,
    tipsEnabled: tipsEnabled,
    applyTheme: applyTheme,
    beep: beep,
    Notify: Notify,
    notify: Notify,
    hiddenTools: hiddenTools,
    setHiddenTools: setHiddenTools,
    openSettings: openSettings,
    exportAll: exportAll,
    importAll: importAll,
    ACCENTS: ACCENTS,
    unlockAudio: unlockAudio
  });
  try {
    global.Notify = Notify;
    global.beep = beep;
  } catch (eG) {}

  try { applyTheme(); } catch (e) {}
  try { armAudioUnlock(); } catch (e2) {}
})(typeof window !== "undefined" ? window : this);

