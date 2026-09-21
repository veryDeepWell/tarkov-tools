/*! TarkovItems - normalized item data and reusable indexes */
(function (global) {
  "use strict";
  if (global.TarkovItems) return;

  var cache = Object.create(null);

  function normalize(items) {
    var list = Array.isArray(items) ? items : [];
    return list.filter(function (item) { return item && item.id; });
  }

  function normalizeItem(item) {
    if (!item || typeof item !== "object" || !item.id) return null;
    return item;
  }

  function index(list) {
    var byId = Object.create(null);
    var byType = Object.create(null);
    list.forEach(function (item) {
      byId[item.id] = item;
      var types = [];
      if (item.types) types = Array.isArray(item.types) ? item.types : [item.types];
      if (item.type) types.push(item.type);
      types.forEach(function (type) {
        var key = String(type || "").toLowerCase();
        if (!key) return;
        if (!byType[key]) byType[key] = [];
        byType[key].push(item);
      });
    });
    return { all: list, byId: byId, byType: byType };
  }

  function load(gameMode) {
    var mode = gameMode || (global.TarkovAPI && TarkovAPI.mode ? TarkovAPI.mode() : "pve");
    if (cache[mode]) return Promise.resolve(cache[mode]);
    if (!global.TarkovAPI || !TarkovAPI.items) return Promise.reject(new Error("TarkovAPI.items missing"));
    return TarkovAPI.items(mode).then(function (items) {
      var data = index(normalize(items));
      cache[mode] = data;
      return data;
    });
  }

  function clear() { cache = Object.create(null); }

  function snapshot(value, mode) {
    if (value && value.byId && value.all) return Promise.resolve(value);
    return load(mode);
  }

  global.TarkovItems = {
    normalize: normalize,
    normalizeItem: normalizeItem,
    index: index,
    load: load,
    clear: clear,
    all: function (catalog, mode) { return snapshot(catalog, mode).then(function (x) { return x.all.slice(); }); },
    byId: function (id, catalog, mode) {
      if (typeof catalog === "string" && mode == null) { mode = catalog; catalog = null; }
      return snapshot(catalog, mode).then(function (x) { return x.byId[id] || null; });
    },
    byType: function (type, mode) {
      return snapshot(null, mode).then(function (x) { return x.byType[String(type || "").toLowerCase()] || []; });
    },
    classify: function (item) {
      if (global.TarkovItemDomain && TarkovItemDomain.classifyItem) return TarkovItemDomain.classifyItem(item);
      return "other";
    }
  };
})(window);