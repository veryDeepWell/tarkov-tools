/**
 * TarkovAPI — shared fetch + memory/localStorage cache
 */
(function (global) {
  const BASE = "https://json.tarkov.dev";
  const mem = new Map();
  const pending = new Map();
  const revisions = new Map();
  const collections = new Map();
  let cacheGeneration = 0;
  const DEFAULT_TTL = (global.TarkovConst && TarkovConst.API_MEMORY_TTL_MS) || (90 * 1000);
  const LS_TTL = (global.TarkovConst && TarkovConst.API_LS_TTL_MS) || (5 * 60 * 1000);
  const LS_PREFIX = "tt:api:";

  function storage() {
    if (!global.TarkovStorage) throw new Error("TarkovStorage must load before TarkovAPI");
    return global.TarkovStorage;
  }

  function clock() { return global.TarkovClock && global.TarkovClock.now ? global.TarkovClock : { now: Date.now }; }

  function mode() {
    try {
      if (global.TarkovTools && TarkovTools.preferredMode) return TarkovTools.preferredMode();
    } catch (e) { try { console.debug && console.debug("[tt:api]", e); } catch (_tt) { /* ignore */ } }
    return storage().get("tarkovPreferredGameMode", "pve") || "pve";
  }

  function apiMode(value) {
    var requested = value || mode();
    if (global.TarkovProfile && TarkovProfile.apiMode) return TarkovProfile.apiMode(requested);
    return /^(pvp|regular|pvp-season)$/.test(requested) ? "regular" : "pve";
  }

  async function locale(kind, gameMode, language) {
    var lang = language || (global.TarkovI18n && TarkovI18n.lang ? TarkovI18n.lang() : storage().get("tarkovLang", "en"));
    if (!/^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(lang)) lang = "en";
    var pack = await getJson("/" + apiMode(gameMode) + "/" + kind + "_" + lang, { ttl: 24 * 60 * 60 * 1000 });
    return pack.data || pack;
  }

  async function translated(json, kind, gameMode, language) {
    if (!Array.isArray(json && json.translations) || !json.translations.length) return json;
    var pack = {};
    try { pack = await locale(kind, gameMode, language); } catch (e) { /* Keep human source text; reject technical placeholders below. */ }
    var copy = JSON.parse(JSON.stringify(json));
    json.translations.forEach(function (field) {
      // Localize presentation fields only. Slot names, effect types, zones and
      // other enums remain stable inputs to compatibility and scoring logic.
      if (!/\.(name|shortName|description|exitName)$/.test(field) || /\.properties\.|\.bonuses\[/.test(field)) return;
      var parts = field.replace(/^\$\./, "").replace(/\[\*\]/g, ".*").split(".");
      function visit(parent, index) {
        if (!parent || typeof parent !== "object") return;
        var keys = parts[index] === "*" ? Object.keys(parent) : [parts[index]];
        keys.forEach(function (key) {
          if (index < parts.length - 1) visit(parent[key], index + 1);
          else if (typeof parent[key] === "string") {
            if (typeof pack[parent[key]] === "string") parent[key] = pack[parent[key]];
            else if ((key === "description" || key === "exitName") && global.TarkovData && TarkovData.technical(parent[key])) parent[key] = "";
          }
        });
      }
      visit(copy, 0);
    });
    return copy;
  }

  function lsGet(key) {
    try {
      var raw = storage().get(LS_PREFIX + key, null);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ts || clock().now() - o.ts > LS_TTL) return null;
      return o.data;
    } catch (e) { return null; }
  }
  function lsSet(key, data) {
    try {
      var value = JSON.stringify({ ts: clock().now(), data: data });
      // Full item/map snapshots exceed localStorage's entire quota. Keep them in memory.
      if (value.length > 500000) return;
      var keys = storage().keys(LS_PREFIX).filter(function (k) { return k !== LS_PREFIX + key; });
      keys.sort(function (a, b) {
        return (storage().getJson(a, {}).ts || 0) - (storage().getJson(b, {}).ts || 0);
      });
      var total = keys.reduce(function (n, k) { return n + String(storage().get(k, "")).length; }, value.length);
      while (total > 1000000 && keys.length) {
        var old = keys.shift(); total -= String(storage().get(old, "")).length; storage().remove(old);
      }
      if (storage().set(LS_PREFIX + key, value, { quiet: true }) === false) {
        keys.forEach(function (k) { storage().remove(k); });
        storage().set(LS_PREFIX + key, value, { quiet: true });
      }
    } catch (e) { /* Optional cache must never interrupt the tool or evict user documents. */ }
  }

  async function getJson(path, opts) {
    opts = opts || {};
    path = path.replace(/^\/(pvp|pvp-season)(?=\/)/, "/regular");
    const url = path.indexOf("http") === 0 ? path : (BASE + path);
    const key = url + "|" + (opts.cacheKey || "");
    const ttl = opts.ttl != null ? opts.ttl : DEFAULT_TTL;

    if (!opts.noCache && mem.has(key)) {
      var hit = mem.get(key);
      if (clock().now() - hit.ts < ttl) return hit.data;
    }
    if (!opts.noCache && !opts.noLs) {
      var ls = lsGet(key);
      if (ls != null) {
        mem.set(key, { ts: clock().now(), data: ls });
        return ls;
      }
    }

    const requestKey = key + "|" + !!opts.noCache + "|" + !!opts.noLs + "|" + (opts.httpCache || "default");
    if (pending.has(requestKey)) return pending.get(requestKey);
    const generation = cacheGeneration;
    const revision = (revisions.get(key) || 0) + 1;
    revisions.set(key, revision);
    const task = (async function () {
      const res = await fetch(url, { cache: opts.httpCache || "default" });
      if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
      const data = await res.json();
      if (generation === cacheGeneration && revisions.get(key) === revision) {
        mem.set(key, { ts: clock().now(), data: data });
        if (!opts.noLs) lsSet(key, data);
      }
      return data;
    })();
    pending.set(requestKey, task);
    try { return await task; } finally { if (pending.get(requestKey) === task) pending.delete(requestKey); }
  }

  function request(path, opts) {
    opts = opts || {};
    var cachePath = path.indexOf("http") === 0 ? path : path;
    var getOpts = {
      httpCache: opts.httpCache || "default",
      ttl: opts.ttl,
      cacheKey: opts.cacheKey,
      noCache: opts.httpCache === "no-store",
      noLs: opts.httpCache === "no-store"
    };
    return getJson(cachePath, getOpts).then(function (data) {
      return {
        ok: true,
        status: 200,
        json: function () { return Promise.resolve(data); }
      };
    });
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

  async function items(gameMode, opts) {
    var m = apiMode(gameMode);
    var list = await collection("items", m, opts);
    if (!global.TarkovItemMedia) throw Error("TarkovItemMedia must load before TarkovAPI");
    return list.map(function (item) { return TarkovItemMedia.decorate(item); });
  }

  async function barters(gameMode) {
    return collection("barters", gameMode);
  }

  async function traders(gameMode) {
    return collection("traders", gameMode);
  }

  async function tasks(gameMode) {
    return collection("tasks", gameMode);
  }

  async function maps(gameMode) {
    return collection("maps", gameMode);
  }

  async function goonReports(gameMode) {
    var m = apiMode(gameMode);
    var json = await getJson("/" + m + "/maps");
    var data = json && json.data ? json.data : json;
    return asArray(data && data.goonReports != null ? data.goonReports : []);
  }

  async function crafts(gameMode) {
    return collection("crafts", gameMode);
  }

  async function quests(gameMode) {
    return tasks(gameMode);
  }

  async function hideout(gameMode) {
    return collection("hideout", gameMode);
  }

  async function collection(kind, gameMode, opts, endpoint) {
    if (!global.TarkovData) throw Error("TarkovData must load before TarkovAPI");
    var context = TarkovData.scope({ mode: apiMode(gameMode) });
    var key = context.mode + ":" + context.lang + ":" + kind;
    var version = (collections.get(key) || 0) + 1, generation = cacheGeneration;
    collections.set(key, version);
    function current() { return collections.get(key) === version && cacheGeneration === generation; }
    TarkovData.setStatus(kind, "loading", context);
    try {
      var json = await getJson("/" + context.mode + "/" + (endpoint || kind), opts);
      json = await translated(json, endpoint || kind, context.mode, context.lang);
      return TarkovData.ingest(kind, json, Object.assign({}, context, { publish: current() }));
    } catch (error) {
      if (current()) TarkovData.setStatus(kind, "error", context, error);
      throw error;
    }
  }

  function clearCache() {
    cacheGeneration++;
    pending.clear();
    revisions.clear();
    collections.clear();
    mem.clear();
    if (global.TarkovData) TarkovData.clear();
    try {
      var kill = [];
      storage().keys(LS_PREFIX).forEach(function (k) { storage().remove(k); });
    } catch (e) { try { console.debug && console.debug("[tt:api]", e); } catch (_tt) { /* ignore */ } }
  }

  global.TarkovAPI = {
    BASE: BASE,
    mode: mode,
    request: request,
    getJson: getJson,
    items: items,
    barters: barters,
    traders: traders,
    tasks: tasks,
    prestige: function (gameMode) { return collection("prestige", gameMode, null, "tasks"); },
    quests: quests,
    maps: maps,
    goonReports: goonReports,
    crafts: crafts,
    hideout: hideout,
    asArray: asArray,
    locale: locale,
    clearCache: clearCache
  };
})(window);
