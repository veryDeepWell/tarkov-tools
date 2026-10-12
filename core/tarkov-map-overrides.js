/*! TarkovMapOverrides — user/admin marker overrides (1.1 F) */
(function (global) {
  "use strict";
  if (global.TarkovMapOverrides && global.TarkovMapOverrides.__v >= 2) return;

  var PREFIX = "tt:map:overrides:";

  function storage() {
    if (!global.TarkovStorage) throw new Error("TarkovStorage required");
    return TarkovStorage;
  }

  function key(mapId) {
    return PREFIX + mapId;
  }

  function empty(mapId) {
    return {
      _v: 2,
      mapId: mapId,
      rename: {},
      hide: [],
      edit: {},
      add: [],
      labels: []
    };
  }

  function get(mapId) {
    var raw = storage().getJson(key(mapId), null) || empty(mapId);
    raw.rename = raw.rename || {};
    raw.hide = raw.hide || [];
    raw.edit = raw.edit || {};
    raw.add = raw.add || [];
    raw.labels = raw.labels || [];
    raw.mapId = mapId;
    return raw;
  }

  function set(mapId, data) {
    data = data || empty(mapId);
    data._v = 2;
    data.mapId = mapId;
    data.updatedAt = Date.now();
    storage().setJson(key(mapId), data);
    return data;
  }

  function markerKey(group, m) {
    return group + "|" + (m.name || "") + "|" + Math.round(Number(m.x) || 0) + "|" + Math.round(Number(m.y) || 0);
  }

  function apply(mapId, data) {
    if (!data) return data;
    var ov = get(mapId);
    var out = {};
    Object.keys(data).forEach(function (group) {
      var list = Array.isArray(data[group]) ? data[group] : [];
      var next = [];
      list.forEach(function (m) {
        var k = markerKey(group, m);
        if ((ov.hide || []).indexOf(k) !== -1) return;
        var copy = Object.assign({}, m);
        if (ov.rename && ov.rename[k]) copy.name = ov.rename[k];
        if (ov.edit && ov.edit[k]) {
          var e = ov.edit[k];
          if (e.name != null) copy.name = e.name;
          if (e.x != null) copy.x = Number(e.x);
          if (e.y != null) copy.y = Number(e.y);
          if (e.filter != null) copy.filter = e.filter;
          if (e.floor != null) copy.floor = e.floor;
          if (e.note != null) copy.note = e.note;
          if (e.outline) copy.outline = e.outline.slice();
        }
        next.push(copy);
      });
      out[group] = next;
    });
    (ov.add || []).forEach(function (m) {
      var g = m.group || "landmarks";
      if (!out[g]) out[g] = [];
      var row = {
        name: m.name || "Метка",
        x: Number(m.x) || 0,
        y: Number(m.y) || 0,
        filter: m.filter || "landmark-name",
        floor: m.floor || "ground",
        note: m.note || ""
      };
      if (m.outline && m.outline.length) row.outline = m.outline.slice();
      out[g].push(row);
    });
    (ov.labels || []).forEach(function (lb) {
      if (!out.landmarks) out.landmarks = [];
      out.landmarks.push({
        name: lb.name || "Локация",
        x: Number(lb.x) || 0,
        y: Number(lb.y) || 0,
        filter: "landmark-name",
        floor: lb.floor || "ground"
      });
    });
    return out;
  }

  function exportMap(mapId) {
    return { _schema: "tarkov-tools-map-overrides", _version: 2, mapId: mapId, data: get(mapId) };
  }

  function importMap(json) {
    var data = typeof json === "string" ? JSON.parse(json) : json;
    var mapId = data.mapId || (data.data && data.data.mapId);
    var payload = data.data || data;
    if (!mapId) throw new Error("mapId required");
    return set(mapId, payload);
  }

  global.TarkovMapOverrides = {
    __v: 2,
    get: get,
    set: set,
    apply: apply,
    markerKey: markerKey,
    exportMap: exportMap,
    importMap: importMap
  };
})(typeof window !== "undefined" ? window : globalThis);
