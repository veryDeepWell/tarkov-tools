/* Legacy path shim. The canonical hub application lives in hub/. */
(function () {
  "use strict";
  var current = document.currentScript;
  if (!current) throw new Error("Legacy hub loader must be included from a script element");
  var script = document.createElement("script");
  script.src = new URL("hub/tarkov-hub-app.js", current.src).href;
  script.async = false;
  document.head.appendChild(script);
})();
