/*! Settings tabs — bootstrap from known-good revision then accent patch */
(function () {
  "use strict";
  var SRC = "https://cdn.jsdelivr.net/gh/veryDeepWell/tarkov-tools@3dbb2e88105accab74ffc9ef2f616fd94e582cc5/hub/tarkov-settings-tabs.js";
  var s = document.createElement("script");
  s.src = SRC;
  s.onload = function () {
    function fixSwatches() {
      var row = document.getElementById("tt-accent-row");
      if (!row) return;
      var accents = (window.TarkovTools && TarkovTools.ACCENTS) || {
        gold: "#c9a227", blue: "#5b9fd4", green: "#3dd68c", cyan: "#2ec4b6",
        purple: "#a78bfa", orange: "#e0a458", red: "#f07178", pink: "#e879a9", slate: "#94a3b8"
      };
      row.querySelectorAll(".tt-accent-swatch").forEach(function (b) {
        var k = b.getAttribute("data-acc") || b.getAttribute("data-accent");
        if (k && accents[k]) {
          b.setAttribute("data-accent", k);
          b.style.setProperty("background", accents[k], "important");
        }
      });
    }
    if (!window.TarkovTools || !TarkovTools.openSettings) return;
    var _open = TarkovTools.openSettings;
    TarkovTools.openSettings = function () {
      _open.apply(this, arguments);
      setTimeout(fixSwatches, 0);
      setTimeout(fixSwatches, 50);
    };
  };
  s.onerror = function () {
    console.error("[settings] failed to load bootstrap from CDN");
  };
  document.head.appendChild(s);
})();
