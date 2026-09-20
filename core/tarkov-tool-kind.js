/*! TarkovToolKind — live (background/timer) vs static tools */
(function (global) {
  "use strict";
  var LIVE = {
    "tarkovtool-price-track.html": true,
    "tarkovtool-price-alarm.html": true,
    "tarkovtool-restock.html": true
  };

  function base(file) {
    var f = String(file || "");
    var i = f.lastIndexOf("/");
    return i >= 0 ? f.slice(i + 1) : f;
  }

  function kindOf(file) {
    try {
      var cat = global.TarkovHubCATALOG || global.TarkovHubCatalog || [];
      for (var i = 0; i < cat.length; i++) {
        if (cat[i] && (cat[i].file === file || base(cat[i].file) === base(file))) {
          if (cat[i].kind === "live" || cat[i].kind === "static") return cat[i].kind;
        }
      }
    } catch (e) {}
    return LIVE[base(file)] ? "live" : "static";
  }

  function isLive(file) { return kindOf(file) === "live"; }
  function isStatic(file) { return !isLive(file); }

  global.TarkovToolKind = {
    LIVE: "live",
    STATIC: "static",
    kindOf: kindOf,
    isLive: isLive,
    isStatic: isStatic
  };
})(window);
