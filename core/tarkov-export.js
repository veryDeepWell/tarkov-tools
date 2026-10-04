/*! Tarkov Tools — export/import schema (v1)
 * Prefer TarkovTools.exportAll / importAll from tarkov-common.js.
 * This module documents the schema and re-exports helpers if needed.
 */
(function (global) {
  "use strict";


  var SCHEMA = "tarkov-tools-export";
  var VERSION = 1;

  /** Collected keys use the canonical tt: namespace. */
  function collectKeys() {
    if (!global.TarkovStorage || !TarkovStorage.keys || !TarkovStorage.get || !TarkovStorage.migrateLegacyKeys)
      throw new Error("TarkovStorage is required for export");
    TarkovStorage.migrateLegacyKeys();
    var keys = {};
    TarkovStorage.keys("tt:").forEach(function (key) {
      keys[key] = TarkovStorage.get(key, null);
    });
    return keys;
  }

  function buildPayload() {
    return {
      _schema: SCHEMA,
      _version: VERSION,
      _exportedAt: new Date().toISOString(),
      keys: collectKeys()
    };
  }

  function applyPayload(raw) {
    if (!raw || typeof raw !== "object") throw new Error("invalid export");
    if (!global.TarkovStorage || !TarkovStorage.set)
      throw new Error("TarkovStorage is required for import");
    var map = raw.keys && typeof raw.keys === "object" ? raw.keys : raw;
    if (raw._schema && raw._schema !== SCHEMA) {
      /* still accept legacy flat maps */
    }
    Object.keys(map).forEach(function (k) {
      if (k.charAt(0) === "_") return;
      if ((k.indexOf("tt:") === 0 || k.indexOf("ttApi:") === 0 || k.indexOf("tarkov") === 0 || k.indexOf("restock") === 0) && typeof map[k] === "string") {
        TarkovStorage.set(k, map[k]);
      }
    });
  }

  function download() {
    if (global.TarkovTools && typeof TarkovTools.exportAll === "function") {
      TarkovTools.exportAll();
      return;
    }
    var payload = buildPayload();
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tarkov-tools-export-" + payload._exportedAt.slice(0, 10) + ".json";
    a.click();
    try { URL.revokeObjectURL(a.href); } catch (e) {}
  }

  function fromFile(file) {
    if (global.TarkovTools && typeof TarkovTools.importAll === "function") {
      TarkovTools.importAll(file);
      return;
    }
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        applyPayload(JSON.parse(reader.result));
        alert("Import OK — reload the page");
      } catch (e) {
        alert("Import failed");
      }
    };
    reader.readAsText(file);
  }

  global.TarkovExport = {
    SCHEMA: SCHEMA,
    VERSION: VERSION,
    collectKeys: collectKeys,
    buildPayload: buildPayload,
    applyPayload: applyPayload,
    download: download,
    fromFile: fromFile
  };
})(typeof window !== "undefined" ? window : this);
