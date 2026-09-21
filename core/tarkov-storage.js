/*! TarkovStorage - browser persistence adapter */
(function (global) {
  "use strict";
  if (global.TarkovStorage) return;

  function backend() {
    try { return global.localStorage; } catch (e) { return null; }
  }

  function get(key, fallback) {
    var store = backend();
    if (!store) return fallback;
    try {
      var value = store.getItem(String(key));
      return value == null ? fallback : value;
    } catch (e) { return fallback; }
  }

  function set(key, value) {
    var store = backend();
    if (!store) return false;
    try { store.setItem(String(key), String(value)); return true; } catch (e) { return false; }
  }

  function remove(key) {
    var store = backend();
    if (!store) return false;
    try { store.removeItem(String(key)); return true; } catch (e) { return false; }
  }

  function keys(prefix) {
    var store = backend();
    var result = [];
    if (!store) return result;
    try {
      for (var i = 0; i < store.length; i++) {
        var key = store.key(i);
        if (key && (!prefix || key.indexOf(prefix) === 0)) result.push(key);
      }
    } catch (e) {}
    return result;
  }

  function getJson(key, fallback) {
    var raw = get(key, null);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function setJson(key, value) {
    try { return set(key, JSON.stringify(value)); } catch (e) { return false; }
  }

  function createMemory(seed) {
    var data = Object.assign({}, seed || {});
    return {
      get: function (key, fallback) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : fallback; },
      set: function (key, value) { data[key] = String(value); return true; },
      remove: function (key) { delete data[key]; return true; },
      keys: function (prefix) { return Object.keys(data).filter(function (key) { return !prefix || key.indexOf(prefix) === 0; }); },
      getJson: function (key, fallback) {
        var raw = this.get(key, null);
        if (raw == null) return fallback;
        try { return JSON.parse(raw); } catch (e) { return fallback; }
      },
      setJson: function (key, value) { try { return this.set(key, JSON.stringify(value)); } catch (e) { return false; } }
    };
  }

  global.TarkovStorage = {
    get: get,
    set: set,
    remove: remove,
    keys: keys,
    getJson: getJson,
    setJson: setJson,
    createMemory: createMemory
  };
})(window);
