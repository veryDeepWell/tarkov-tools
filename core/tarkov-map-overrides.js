/*! TarkovMapOverrides — user/admin marker overrides (1.1 F) */
(function (global) {
  "use strict";
  if (global.TarkovMapOverrides && global.TarkovMapOverrides.__v >= 1) return;

  var PREFIX = "tt:map:overrides:";

  function storage() {
    if (!global.TarkovStorage) throw new Error("TarkovStorage required");
    return TarkovStorage;
  }

  function key(mapId) {
    return PREFIX + mapId;
  }

  function get(mapId) {
    return storage().getJson(key(mapId), null) || {
      _v: 1,
      mapId: mapId,
      // renamed marker keys: "group|index" or stable id
      rename: {},
      // force hide base markers by "group|name|x|y"
      hide: [],
      // extra markers added by user
      add: [],
      // labels for locations
      labels: []
    };
  }

  function set(mapId, data) {
    data = data || {};
    data._v = 1;
    data.mapId = mapId;
    data.updatedAt = Date.now();
    storage().setJson(key(mapId), data);
    return data;
  }

  function markerKey(group, m) {
    return group + "|" + (m.name || "") + "|" + Math.round(m.x) + "|" + Math.round(m.y);
  }

  /** Apply overrides onto a meta.data object (mutates copy) */
  function apply(mapId, data) {
    if (!data) return data;
    var ov = get(mapId);
    var out = {};
    Object.keys(data).forEach(function (group) {
      var list = Array.isArray(data[group]) ? data[group].slice() : [];
      list = list.filter(function (m) {
        var k = markerKey(group, m);
        return (ov.hide || []).indexOf(k) === -1;
      }).map(function (m) {
        var k = markerKey(group, m);
        var copy = Object.assign({}, m);
        if (ov.rename && ov.rename[k]) copy.name = ov.rename[k];
        return copy;
      });
      out[group] = list;
    });
    (ov.add || []).forEach(function (m) {
      var g = m.group || "landmarks";
      if (!out[g]) out[g] = [];
      out[g].push({
        name: m.name || "Метка",
        x: Number(m.x) || 0,
        y: Number(m.y) || 0,
        filter: m.filter || "landmark",
        floor: m.floor || "ground",
        note: m.note || ""
      });
    });
    if ((ov.labels || []).length) {
      if (!out.landmarks) out.landmarks = [];
      ov.labels.forEach(function (lb) {
        out.landmarks.push({
          name: lb.name || "Локация",
          x: Number(lb.x) || 0,
          y: Number(lb.y) || 0,
          filter: "landmark",
          floor: lb.floor || "ground"
        });
      });
    }
    return out;
  }

  function exportMap(mapId) {
    return { _schema: "tarkov-tools-map-overrides", _version: 1, mapId: mapId, data: get(mapId) };
  }

  function importMap(json) {
    var data = typeof json === "string" ? JSON.parse(json) : json;
    var mapId = data.mapId || (data.data && data.data.mapId);
    var payload = data.data || data;
    if (!mapId) throw new Error("mapId required");
    return set(mapId, payload);
  }

  global.TarkovMapOverrides = {
    __v: 1,
    get: get,
    set: set,
    apply: apply,
    markerKey: markerKey,
    exportMap: exportMap,
    importMap: importMap
  };
})(typeof window !== "undefined" ? window : globalThis);
