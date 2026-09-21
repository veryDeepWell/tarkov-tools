/*! Tarkov Tools common — bootstrap: full common (pinned) + Stage3 shell on tools */
(function () {
  "use strict";
  var path = location.pathname || "";
  var base = path.indexOf("/tools/") >= 0 ? "../core/" : "core/";
  function loadShell() {
    try {
      if (document.getElementById("tt-tool-shell")) return;
      if (/tarkovtool-hub\.html$/i.test(path)) return;
      if (!/tarkovtool-/i.test(path)) return;
      var sh = document.createElement("script");
      sh.id = "tt-tool-shell";
      sh.src = base + "tarkov-tool-shell.js";
      (document.head || document.documentElement).appendChild(sh);
    } catch (e) {}
  }
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/veryDeepWell/tarkov-tools@24b7a27ec32df87984fc12b36cee9dcd98df22b9/core/tarkov-common.js";
  s.onload = function () { loadShell(); };
  s.onerror = function () {
    var f = document.createElement("script");
    f.src = base + "tarkov-common-full.js";
    f.onload = loadShell;
    f.onerror = loadShell;
    (document.head || document.documentElement).appendChild(f);
  };
  (document.head || document.documentElement).appendChild(s);
})();
