/*! TarkovSchema — versioned tool state wrappers (_v field) */
(function (global) {
  "use strict";
  if (global.TarkovSchema && global.TarkovSchema.__v >= 1) return;

  /**
   * Normalize storage payload to { _v, ...fields }.
   * - Bare array → { _v: ver, rules: arr } when listKey provided
   * - Bare object without _v → wrap with _v
   */
  function ensure(raw, ver, opts) {
    opts = opts || {};
    var listKey = opts.listKey || null;
    var verN = Number(ver) || 1;

    if (raw == null) {
      if (listKey) {
        var empty = { _v: verN };
        empty[listKey] = [];
        return { value: empty, migrated: false };
      }
      return { value: { _v: verN }, migrated: false };
    }

    // Legacy bare array (alarm rules)
    if (Array.isArray(raw) && listKey) {
      var wrapped = { _v: verN };
      wrapped[listKey] = raw;
      return { value: wrapped, migrated: true };
    }

    if (typeof raw === "object") {
      if (raw._v == null) {
        var o = Object.assign({}, raw);
        o._v = verN;
        return { value: o, migrated: true };
      }
      return { value: raw, migrated: false };
    }

    return { value: { _v: verN }, migrated: false };
  }

  function readJson(key, ver, opts) {
    opts = opts || {};
    var raw = null;
    try {
      if (global.TarkovStorage && TarkovStorage.getJson) raw = TarkovStorage.getJson(key, null);
    } catch (e) {}
    var res = ensure(raw, ver, opts);
    if (res.migrated) {
      try {
        if (global.TarkovStorage && TarkovStorage.setJson) TarkovStorage.setJson(key, res.value);
      } catch (e2) {}
    }
    return res.value;
  }

  function writeJson(key, obj) {
    try {
      if (global.TarkovStorage && TarkovStorage.setJson) {
        TarkovStorage.setJson(key, obj);
        return;
      }
    } catch (e) {}
  }

  function listOf(doc, listKey) {
    if (!doc || !listKey) return [];
    var arr = doc[listKey];
    return Array.isArray(arr) ? arr : [];
  }

  function setList(doc, listKey, arr, ver) {
    doc = doc || {};
    doc._v = Number(ver) || doc._v || 1;
    doc[listKey] = Array.isArray(arr) ? arr : [];
    return doc;
  }

  global.TarkovSchema = {
    __v: 1,
    ensure: ensure,
    readJson: readJson,
    writeJson: writeJson,
    listOf: listOf,
    setList: setList
  };
})(typeof window !== "undefined" ? window : this);
