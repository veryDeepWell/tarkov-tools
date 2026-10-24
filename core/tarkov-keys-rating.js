/*! TarkovKeysRating — shared personal key scores (1..100) from data/keys-rating.json */
(function (global) {
  "use strict";
  if (global.TarkovKeysRating && global.TarkovKeysRating.__v >= 1) return;

  var PATHS = [
    "data/keys-rating.json",
    "../data/keys-rating.json",
    "/data/keys-rating.json"
  ];
  var state = {
    loaded: false,
    loading: null,
    byId: Object.create(null),
    bySlug: Object.create(null),
    version: 0
  };

  function clampScore(n) {
    n = Number(n);
    if (!isFinite(n)) return null;
    n = Math.round(n);
    if (n < 1) n = 1;
    if (n > 100) n = 100;
    return n;
  }

  function ingest(data) {
    state.byId = Object.create(null);
    state.bySlug = Object.create(null);
    state.version = (data && data.__v) || 1;
    var map = (data && data.ratings) || {};
    Object.keys(map).forEach(function (key) {
      var entry = map[key];
      var score = null;
      var note = "";
      if (entry == null) return;
      if (typeof entry === "number") score = clampScore(entry);
      else if (typeof entry === "object") {
        score = clampScore(entry.score != null ? entry.score : entry.rating);
        note = entry.note ? String(entry.note) : "";
      }
      if (score == null) return;
      var row = { score: score, note: note, key: key };
      // id-like vs slug
      if (/^[a-f0-9]{24}$/i.test(key) || key.length >= 20) state.byId[key] = row;
      else state.bySlug[String(key).toLowerCase()] = row;
      state.byId[key] = row;
      state.bySlug[String(key).toLowerCase()] = row;
    });
    state.loaded = true;
  }

  function load() {
    if (state.loaded) return Promise.resolve(api);
    if (state.loading) return state.loading;
    state.loading = (async function () {
      var lastErr = null;
      for (var i = 0; i < PATHS.length; i++) {
        try {
          var url = PATHS[i];
          var res = await fetch(url, { cache: "no-cache" });
          if (!res.ok) continue;
          var data = await res.json();
          ingest(data);
          state.loading = null;
          return api;
        } catch (e) {
          lastErr = e;
        }
      }
      // empty but ready — architecture works without file
      ingest({ __v: 1, ratings: {} });
      state.loading = null;
      if (lastErr) {
        try {
          console.debug && console.debug("[tt:keys-rating]", lastErr);
        } catch (e2) {}
      }
      return api;
    })();
    return state.loading;
  }

  function lookup(idOrSlug) {
    if (idOrSlug == null || idOrSlug === "") return null;
    var k = String(idOrSlug);
    if (state.byId[k]) return state.byId[k];
    var sl = k.toLowerCase();
    if (state.bySlug[sl]) return state.bySlug[sl];
    return null;
  }

  function getScore(idOrSlug) {
    var row = lookup(idOrSlug);
    return row ? row.score : null;
  }

  function getScoreOr(idOrSlug, fallback) {
    var s = getScore(idOrSlug);
    return s != null ? s : fallback;
  }

  var api = {
    __v: 1,
    load: load,
    ready: function () {
      return load();
    },
    getScore: getScore,
    getScoreOr: getScoreOr,
    getMeta: lookup,
    isLoaded: function () {
      return state.loaded;
    },
    size: function () {
      return Object.keys(state.byId).length;
    }
  };

  global.TarkovKeysRating = api;
})(typeof window !== "undefined" ? window : globalThis);
