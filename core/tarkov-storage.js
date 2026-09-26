/*! TarkovStorage — thin JSON/string wrapper over localStorage (contract §4) */
(function (global) {
  "use strict";
  if (global.TarkovStorage && global.TarkovStorage.__v >= 1) return;

  function get(key, def) {
    try {
      var v = localStorage.getItem(String(key));
      return v == null ? def : v;
    } catch (e) {
      return def;
    }
  }

  function set(key, val) {
    try {
      if (val == null) localStorage.removeItem(String(key));
      else localStorage.setItem(String(key), String(val));
    } catch (e) {}
  }

  function remove(key) {
    try {
      localStorage.removeItem(String(key));
    } catch (e) {}
  }

  function getJson(key, def) {
    try {
      var raw = localStorage.getItem(String(key));
      if (raw == null || raw === "") return def;
      return JSON.parse(raw);
    } catch (e) {
      return def;
    }
  }

  function setJson(key, obj) {
    try {
      if (obj == null) localStorage.removeItem(String(key));
      else localStorage.setItem(String(key), JSON.stringify(obj));
    } catch (e) {}
  }

  /** Migrate oldKey → newKey once (if new empty and old present). */
  function migrateKey(oldKey, newKey) {
    try {
      var n = localStorage.getItem(newKey);
      if (n != null && n !== "") return;
      var o = localStorage.getItem(oldKey);
      if (o == null) return;
      localStorage.setItem(newKey, o);
      localStorage.removeItem(oldKey);
    } catch (e) {}
  }

  function keys(prefix) {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        if (prefix && k.indexOf(prefix) !== 0) continue;
        out.push(k);
      }
    } catch (e) {}
    return out;
  }

  global.TarkovStorage = {
    __v: 1,
    get: get,
    set: set,
    remove: remove,
    getJson: getJson,
    setJson: setJson,
    migrateKey: migrateKey,
    keys: keys
  };
})(typeof window !== "undefined" ? window : this);
