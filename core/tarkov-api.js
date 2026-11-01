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

  async function translated(json, kind, gameMode) {
    if (!Array.isArray(json && json.translations) || !json.translations.length) return json;
    var pack;
    try { pack = await locale(kind, gameMode); } catch (e) { return json; }
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
          else if (typeof parent[key] === "string" && typeof pack[parent[key]] === "string") parent[key] = pack[parent[key]];
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

  async function items(gameMode, opts) {
    var m = apiMode(gameMode);
    var json = await translated(await getJson("/" + m + "/items", opts), "items", m);
    var list = asArray(json && json.data && json.data.items != null ? json.data.items : (json && json.data) || json);
    // Normalize display fields in one place. API payloads remain cached untouched; callers
    // receive shallow copies so UI changes never mutate the shared cache.
    var media = global.TarkovItemMedia;
    var normalized = list.map(function (item) {
      if (!item || typeof item !== "object") return item;
      if (item.properties && item.properties.stimEffects && !item.properties.stimulatorBuffs) {
        item = Object.assign({}, item, { properties: Object.assign({}, item.properties, { stimulatorBuffs: item.properties.stimEffects }) });
      }
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
    if (m === "regular") global.TarkovItemCatalog.pvp = byId;
    return normalized;
  }

  async function barters(gameMode) {
    var m = apiMode(gameMode);
    var json = await getJson("/" + m + "/barters");
    return asArray(json && json.data && json.data.barters != null ? json.data.barters : (json && json.data) || json);
  }

  async function traders(gameMode) {
    var m = apiMode(gameMode);
    var json = await translated(await getJson("/" + m + "/traders"), "traders", m);
    return asArray(json && json.data && json.data.traders != null ? json.data.traders : (json && json.data) || json);
  }

  async function tasks(gameMode) {
    var m = apiMode(gameMode);
    var json = await translated(await getJson("/" + m + "/tasks"), "tasks", m);
    return asArray(json && json.data && json.data.tasks != null ? json.data.tasks : (json && json.data) || json);
  }

  async function maps(gameMode) {
    var m = apiMode(gameMode);
    var json = await translated(await getJson("/" + m + "/maps"), "maps", m);
    var data = json && json.data ? json.data : json;
    if (data && data.maps != null) return asArray(data.maps);
    return asArray(data);
  }

  async function goonReports(gameMode) {
    var m = apiMode(gameMode);
    var json = await getJson("/" + m + "/maps");
    var data = json && json.data ? json.data : json;
    return asArray(data && data.goonReports != null ? data.goonReports : []);
  }

  async function crafts(gameMode) {
    var m = apiMode(gameMode);
    var json = await getJson("/" + m + "/crafts");
    return asArray(json && json.data || json);
  }

  async function quests(gameMode) {
    return tasks(gameMode);
  }

  async function hideout(gameMode) {
    var m = apiMode(gameMode);
    var json = await translated(await getJson("/" + m + "/hideout"), "hideout", m);
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
    locale: locale,
    clearCache: clearCache
  };
})(window);
