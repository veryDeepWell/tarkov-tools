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
    try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; }
  }
  function set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

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
      kind = kind || "ok";
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

  global.TarkovTools = global.TarkovTools || {};
  Object.assign(global.TarkovTools, {
    _ttCommon: true,
    get: get,
    set: set,
    t: t,
    lang: lang,
    soundEnabled: soundEnabled,
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
    ACCENTS: ACCENTS
  });

  try { applyTheme(); } catch (e) {}
})(typeof window !== "undefined" ? window : this);
