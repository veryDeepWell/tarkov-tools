/*! Tarkov Tools common — bootstrap (loads full implementation) */
(function () {
  "use strict";
  var path = location.pathname || "";
  var base = path.indexOf("/tools/") >= 0 ? "../core/" : "core/";
  var s = document.createElement("script");
  s.src = base + "tarkov-common-full.js";
  s.async = false;
  (document.head || document.documentElement).appendChild(s);
})();
