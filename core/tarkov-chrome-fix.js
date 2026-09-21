/*! Stage 3 chrome bar — load after common + settings-tabs */
(function () {
  "use strict";
  function callOpenSettings() {
    try {
      if (window.TarkovTools && typeof TarkovTools.openSettings === "function") {
        TarkovTools.openSettings();
        return;
      }
    } catch (e) {}
  }
  function paintBarFixed() {
    var bar = document.getElementById("tt-tools-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "tt-tools-bar";
      bar.className = "tt-tools-bar";
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
    var btnHdr = document.getElementById("tt-open-settings");
    if (btnS) btnS.onclick = function (e) { e.preventDefault(); e.stopPropagation(); callOpenSettings(); };
    if (btnHdr) btnHdr.onclick = function (e) { e.preventDefault(); callOpenSettings(); };
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
        var cur = (window.TarkovI18n && TarkovI18n.current) || localStorage.getItem("tarkovLang") || "ru";
        var next = cur === "ru" ? "en" : "ru";
        localStorage.setItem("tarkovLang", next);
        if (window.TarkovI18n && TarkovI18n.setLang) {
          TarkovI18n.setLang(next).then(function () {
            try { TarkovI18n.applyDom(document); } catch (err) {}
            try { window.dispatchEvent(new CustomEvent("tt-lang-changed", { detail: { lang: next } })); } catch (err) {}
          });
        } else {
          location.reload();
        }
      } catch (err) {}
    };
  }
  function boot() {
    paintBarFixed();
    setTimeout(paintBarFixed, 100);
    setTimeout(paintBarFixed, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
