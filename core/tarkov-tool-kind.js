/*! TarkovToolKind — live vs static + live registry (pollId, soundKind) */
(function (global) {
  "use strict";

  /** Canonical live tools. Catalog `kind: "live"` overrides file map. */
  var LIVE_REGISTRY = {
    "tarkovtool-price-track.html": {
      pollId: "price-track",
      soundKind: "ok",
      defaultMins: 5,
      label: "price-track"
    },
    "tarkovtool-price-alarm.html": {
      pollId: "price-alarm",
      soundKind: "alarm",
      defaultMins: 5,
      label: "price-alarm"
    },
    "tarkovtool-restock.html": {
      pollId: "restock",
      soundKind: "restock",
      defaultMins: 1,
      label: "restock"
    }
  };

  function base(file) {
    var f = String(file || "");
    var i = f.lastIndexOf("/");
    return i >= 0 ? f.slice(i + 1) : f;
  }

  function entry(file) {
    return LIVE_REGISTRY[base(file)] || null;
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
    return entry(file) ? "live" : "static";
  }

  function isLive(file) {
    return kindOf(file) === "live";
  }
  function isStatic(file) {
    return !isLive(file);
  }

  function pollIdOf(file) {
    var e = entry(file);
    return e ? e.pollId : null;
  }

  function soundKindOf(file) {
    var e = entry(file);
    return e ? e.soundKind : "ok";
  }

  function liveFiles() {
    return Object.keys(LIVE_REGISTRY);
  }

  function liveEntries() {
    return liveFiles().map(function (f) {
      var e = LIVE_REGISTRY[f];
      return {
        file: f,
        pollId: e.pollId,
        soundKind: e.soundKind,
        defaultMins: e.defaultMins,
        label: e.label
      };
    });
  }

  function fileForPollId(pollId) {
    var id = String(pollId || "");
    var keys = Object.keys(LIVE_REGISTRY);
    for (var i = 0; i < keys.length; i++) {
      if (LIVE_REGISTRY[keys[i]].pollId === id) return keys[i];
    }
    return null;
  }

  global.TarkovToolKind = {
    LIVE: "live",
    STATIC: "static",
    LIVE_REGISTRY: LIVE_REGISTRY,
    kindOf: kindOf,
    isLive: isLive,
    isStatic: isStatic,
    entry: entry,
    pollIdOf: pollIdOf,
    soundKindOf: soundKindOf,
    liveFiles: liveFiles,
    liveEntries: liveEntries,
    fileForPollId: fileForPollId
  };
})(window);
