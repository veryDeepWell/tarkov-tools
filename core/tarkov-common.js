/*! Tarkov Tools common — theme, i18n helpers, sound, settings open, tool shell loader */
(function (window) {
  "use strict";

  var KEYS = {
    theme: "tarkovTheme",
    lang: "tarkovLang",
    sound: "tarkovSound"
  };

  function get(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function set(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function lang() {
    return get(KEYS.lang, "ru") || "ru";
  }

  function t(key, fallback) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback != null ? fallback : key;
  }

  function applyTheme() {
    var th = get(KEYS.theme, "dark") || "dark";
    document.documentElement.setAttribute("data-theme", th);
    try {
      if (document.body) document.body.setAttribute("data-theme", th);
    } catch (e) {}
  }

  function openSettings() {
    try {
      if (window.TarkovSettingsTabs && typeof TarkovSettingsTabs.open === "function") {
        TarkovSettingsTabs.open();
        return;
      }
    } catch (e) {}
    try {
      if (typeof window.TarkovTools !== "undefined" && TarkovTools.openSettings && TarkovTools.openSettings !== openSettings) {
        TarkovTools.openSettings();
        return;
      }
    } catch (e) {}
  }

  function paintBar() {
    var bar = document.getElementById("tt-tools-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "tt-tools-bar";
      bar.className = "tt-tools-bar";
      bar.setAttribute("role", "toolbar");
      bar.innerHTML =
        '<button type="button" class="btn-ghost" id="tt-bar-settings" title="Settings" aria-label="Settings">\u2699</button>' +
        '<button type="button" class="btn-ghost" id="tt-bar-theme" title="Theme" aria-label="Theme">\uD83C\uDF11</button>' +
        '<button type="button" class="btn-ghost" id="tt-bar-lang" title="Language" aria-label="Language">\uD83C\uDF10</button>';
      document.body.appendChild(bar);
    } else {
      bar.className = "tt-tools-bar";
    }
    var btnS = document.getElementById("tt-bar-settings");
    var btnT = document.getElementById("tt-bar-theme");
    var btnL = document.getElementById("tt-bar-lang");
    if (btnS) {
      btnS.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSettings();
      };
    }
    if (btnT) {
      btnT.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var th = get(KEYS.theme, "dark") === "light" ? "dark" : "light";
        set(KEYS.theme, th);
        applyTheme();
      };
    }
    if (btnL) {
      btnL.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var cur = lang();
        var next = cur === "ru" ? "en" : "ru";
        set(KEYS.lang, next);
        try {
          if (window.TarkovI18n && TarkovI18n.setLang) {
            TarkovI18n.setLang(next).then(function () {
              try { TarkovI18n.applyDom(document); } catch (err) {}
              try { window.dispatchEvent(new CustomEvent("tt-lang-changed", { detail: { lang: next } })); } catch (err) {}
            });
            return;
          }
        } catch (err) {}
        try { window.dispatchEvent(new CustomEvent("tt-lang-changed", { detail: { lang: next } })); } catch (err) {}
      };
    }
  }

  function enhanceTable(table, filterInput) {
    if (!table) return;
    try {
      if (window.TarkovTools && typeof TarkovTools.enhanceTable === "function" && TarkovTools.enhanceTable !== enhanceTable) {
        return TarkovTools.enhanceTable(table, filterInput);
      }
    } catch (e) {}
  }

  /** Stage 3 — load UI shell on every tool page (100% coverage, not hub-only). */
  function loadToolShell() {
    try {
      if (document.getElementById("tt-tool-shell")) return;
      var path = location.pathname || "";
      if (/tarkovtool-hub\.html$/i.test(path)) return;
      if (!/tarkovtool-/i.test(path)) return;
      var s = document.createElement("script");
      s.id = "tt-tool-shell";
      s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-tool-shell.js";
      s.async = false;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  window.TarkovTools = window.TarkovTools || {};
  window.TarkovTools.openSettings = openSettings;
  window.TarkovTools.applyTheme = applyTheme;
  window.TarkovTools.enhanceTable = enhanceTable;
  window.TarkovTools.loadToolShell = loadToolShell;
  window.TarkovTools.t = t;
  window.TarkovTools.lang = lang;

  applyTheme();

  window.addEventListener("tt-lang-changed", function () {
    try {
      if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
    } catch (e) {}
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      try { paintBar(); } catch (e) {}
      try { loadToolShell(); } catch (e) {}
    });
  } else {
    try { paintBar(); } catch (e) {}
    try { loadToolShell(); } catch (e) {}
  }
})(window);
