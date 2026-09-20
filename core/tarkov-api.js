/**
 * TarkovAPI — shared fetch + memory/localStorage cache
 */
(function (global) {
  const BASE = "https://json.tarkov.dev";
  const mem = new Map();
  const DEFAULT_TTL = 90 * 1000;
  const LS_TTL = 5 * 60 * 1000;
  const LS_PREFIX = "ttApi:";

  function mode() {
    try {
      if (global.TarkovTools && TarkovTools.preferredMode) return TarkovTools.preferredMode();
    } catch (e) {}
    try { return localStorage.getItem("tarkovPreferredGameMode") || "pve"; } catch (e) { return "pve"; }
  }

  function lsGet(key) {
    try {
      var raw = localStorage.getItem(LS_PREFIX + key);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ts || Date.now() - o.ts > LS_TTL) return null;
      return o.data;
    } catch (e) { return null; }
  }
  function lsSet(key, data) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (e) {
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(LS_PREFIX) === 0) keys.push(k);
        }
        keys.sort();
        for (var j = 0; j < Math.min(3, keys.length); j++) localStorage.removeItem(keys[j]);
        localStorage.setItem(LS_PREFIX + key, JSON.stringify({ ts: Date.now(), data: data }));
      } catch (e2) {}
    }
  }

  async function getJson(path, opts) {
    opts = opts || {};
    const url = path.indexOf("http") === 0 ? path : (BASE + path);
    const key = url + "|" + (opts.cacheKey || "");
    const ttl = opts.ttl != null ? opts.ttl : DEFAULT_TTL;

    if (!opts.noCache && mem.has(key)) {
      var hit = mem.get(key);
      if (Date.now() - hit.ts < ttl) return hit.data;
    }
    if (!opts.noCache && !opts.noLs) {
      var ls = lsGet(key);
      if (ls != null) {
        mem.set(key, { ts: Date.now(), data: ls });
        return ls;
      }
    }

    const res = await fetch(url, { cache: opts.httpCache || "default" });
    if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
    const data = await res.json();
    mem.set(key, { ts: Date.now(), data: data });
    if (!opts.noLs) lsSet(key, data);
    return data;
  }

  function asArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") {
      if (Array.isArray(raw.data)) return raw.data;
      if (raw.data && typeof raw.data === "object") {
        if (raw.data.items != null && typeof raw.data.items === "object" && !Array.isArray(raw.data.items)) {
          return Object.values(raw.data.items);
        }
        for (var k of Object.keys(raw.data)) {
          if (Array.isArray(raw.data[k])) return raw.data[k];
        }
        return Object.values(raw.data);
      }
      if (raw.items != null && typeof raw.items === "object") {
        return Array.isArray(raw.items) ? raw.items : Object.values(raw.items);
      }
      return Object.values(raw);
    }
    return [];
  }

  async function items(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/items");
    return asArray(json && json.data && json.data.items != null ? json.data.items : (json && json.data) || json);
  }

  async function barters(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/barters");
    return asArray(json && json.data && json.data.barters != null ? json.data.barters : (json && json.data) || json);
  }

  async function traders(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/traders");
    return asArray(json && json.data && json.data.traders != null ? json.data.traders : (json && json.data) || json);
  }

  async function quests(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/quests");
    return asArray(json && json.data && json.data.quests != null ? json.data.quests : (json && json.data) || json);
  }

  async function hideout(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/hideout/stations");
    return asArray(json && json.data || json);
  }

  function clearCache() {
    mem.clear();
    try {
      var kill = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_PREFIX) === 0) kill.push(k);
      }
      kill.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  global.TarkovAPI = {
    BASE: BASE,
    mode: mode,
    getJson: getJson,
    items: items,
    barters: barters,
    traders: traders,
    quests: quests,
    hideout: hideout,
    asArray: asArray,
    clearCache: clearCache
  };
})(window);
