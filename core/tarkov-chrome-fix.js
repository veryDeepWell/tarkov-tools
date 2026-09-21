/*! Hub chrome — settings/theme/lang in .tt-bar only; never on tools */
(function () {
  "use strict";

  function isHub() {
    try {
      var p = location.pathname || "";
      return /tarkovtool-hub\.html$/i.test(p) || /\/$/.test(p) || /index\.html$/i.test(p);
    } catch (e) {
      return false;
    }
  }

  function callOpenSettings() {
    try {
      if (window.TarkovTools && typeof TarkovTools.openSettings === "function") {
        TarkovTools.openSettings();
        return;
      }
    } catch (e) {}
  }

  function wireHubBar() {
    /* remove floating bar if present */
    try {
      var float = document.getElementById("tt-tools-bar");
      if (float) float.remove();
    } catch (e) {}

    if (!isHub()) return;

    var bar = document.querySelector(".tt-bar");
    if (!bar) return;

    if (!document.getElementById("tt-open-settings")) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn-ghost";
      b.id = "tt-open-settings";
      b.textContent = "Settings";
      bar.appendChild(b);
    }
    if (!document.getElementById("tt-bar-theme")) {
      var t = document.createElement("button");
      t.type = "button";
      t.className = "btn-ghost";
      t.id = "tt-bar-theme";
      t.title = "Theme";
      t.textContent = "\uD83C\uDF11";
      bar.appendChild(t);
    }
    if (!document.getElementById("tt-bar-lang")) {
      var l = document.createElement("button");
      l.type = "button";
      l.className = "btn-ghost";
      l.id = "tt-bar-lang";
      l.title = "Language";
      l.textContent = "\uD83C\uDF10";
      bar.appendChild(l);
    }

    var btnS = document.getElementById("tt-open-settings");
    var btnT = document.getElementById("tt-bar-theme");
    var btnL = document.getElementById("tt-bar-lang");
    if (btnS) btnS.onclick = function (e) { e.preventDefault(); callOpenSettings(); };
    if (btnT) btnT.onclick = function (e) {
      e.preventDefault();
      try {
        var th = (localStorage.getItem("tarkovTheme") || "dark") === "light" ? "dark" : "light";
        localStorage.setItem("tarkovTheme", th);
        if (window.TarkovTools && TarkovTools.applyTheme) TarkovTools.applyTheme();
        else document.documentElement.setAttribute("data-theme", th);
      } catch (err) {}
    };
    if (btnL) btnL.onclick = function (e) {
      e.preventDefault();
      try {
        var cur = (window.TarkovI18n && TarkovI18n.lang && TarkovI18n.lang()) || localStorage.getItem("tarkovLang") || "ru";
        var next = cur === "ru" ? "en" : "ru";
        localStorage.setItem("tarkovLang", next);
        if (window.TarkovI18n && TarkovI18n.setLang) {
          TarkovI18n.setLang(next);
        } else {
          location.reload();
        }
      } catch (err) {}
    };
  }

  function boot() {
    wireHubBar();
    setTimeout(wireHubBar, 200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
