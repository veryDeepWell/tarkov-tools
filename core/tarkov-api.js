/**
 * TarkovAPI — shared fetch + memory/localStorage cache
 */
(function (global) {
  const BASE = "https://json.tarkov.dev";
  const mem = new Map();
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
      storage().set(LS_PREFIX + key, JSON.stringify({ ts: clock().now(), data: data }));
    } catch (e) {
      try {
        var keys = storage().keys(LS_PREFIX);
        keys.sort();
        for (var j = 0; j < Math.min(3, keys.length); j++) storage().remove(keys[j]);
        storage().set(LS_PREFIX + key, JSON.stringify({ ts: clock().now(), data: data }));
      } catch (e2) { try { console.debug && console.debug("[tt:api]", e2); } catch (_tt) { /* ignore */ } }
    }
  }

  async function getJson(path, opts) {
    opts = opts || {};
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

    const res = await fetch(url, { cache: opts.httpCache || "default" });
    if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
    const data = await res.json();
    mem.set(key, { ts: clock().now(), data: data });
    if (!opts.noLs) lsSet(key, data);
    return data;
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

  async function items(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/items");
    var list = asArray(json && json.data && json.data.items != null ? json.data.items : (json && json.data) || json);
    // Normalize display fields in one place. API payloads remain cached untouched; callers
    // receive shallow copies so UI changes never mutate the shared cache.
    var media = global.TarkovItemMedia;
    var normalized = list.map(function (item) {
      if (!item || typeof item !== "object") return item;
      if (media && media.decorate) return media.decorate(item);
      var p = item.properties || {};
      var types = Array.isArray(item.types) ? item.types : (item.types ? [item.types] : []);
      var weapon = p.propertiesType === "ItemPropertiesWeapon" || types.indexOf("gun") >= 0 || types.indexOf("weapon") >= 0;
      var preset = p.defaultPreset && typeof p.defaultPreset === "object" ? p.defaultPreset : null;
      var icon = weapon && preset && (preset.image512pxLink || preset.baseImageLink || preset.imageLink || preset.gridImageLink || preset.iconLink);
      icon = icon || item.iconLink || item.gridImageLink || item.image512pxLink || item.imageLink || item.baseImageLink || "";
      var clone = Object.assign({}, item, { displayIconLink: icon, displayName: item.shortName || item.name || item.normalizedName || item.id });
      if (weapon && icon && icon !== item.iconLink) clone.sourceIconLink = item.iconLink || "";
      if (icon) clone.iconLink = icon;
      return clone;
    });
    // A mode-scoped catalogue lets lightweight table rows resolve their item image/name
    // without having to duplicate the full API object into every view model.
    if (!global.TarkovItemCatalog) global.TarkovItemCatalog = Object.create(null);
    var byId = Object.create(null);
    normalized.forEach(function (item) { if (item && item.id) byId[String(item.id)] = item; });
    global.TarkovItemCatalog[m] = byId;
    return normalized;
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

  async function tasks(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/tasks");
    return asArray(json && json.data && json.data.tasks != null ? json.data.tasks : (json && json.data) || json);
  }

  async function maps(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/maps");
    var data = json && json.data ? json.data : json;
    if (data && data.maps != null) return asArray(data.maps);
    return asArray(data);
  }

  async function goonReports(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/maps");
    var data = json && json.data ? json.data : json;
    return asArray(data && data.goonReports != null ? data.goonReports : []);
  }

  async function crafts(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/crafts");
    return asArray(json && json.data || json);
  }

  async function quests(gameMode) {
    return tasks(gameMode);
  }

  async function hideout(gameMode) {
    var m = gameMode || mode();
    var json = await getJson("/" + m + "/hideout");
    return asArray(json && json.data || json);
  }

  function clearCache() {
    mem.clear();
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
    quests: quests,
    maps: maps,
    goonReports: goonReports,
    crafts: crafts,
    hideout: hideout,
    asArray: asArray,
    clearCache: clearCache
  };
})(window);
