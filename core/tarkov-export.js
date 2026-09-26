/*! Tarkov Tools — export/import schema (v1)
 * Prefer TarkovTools.exportAll / importAll from tarkov-common.js.
 * This module documents the schema and re-exports helpers if needed.
 */
(function (global) {
  "use strict";


  var LEGACY_RESTOCK = [
    ["restockEnabled", "tarkovRestockEnabled"],
    ["restockHistory", "tarkovRestockHistory"],
    ["restockFired", "tarkovRestockFired"],
    ["restockCycleMs", "tarkovRestockCycleMs"],
    ["restockSnapshot", "tarkovRestockSnapshot"]
  ];

  function migrateLegacyRestock() {
    try {
      if (window.TarkovStorage && TarkovStorage.migrateKey) {
        LEGACY_RESTOCK.forEach(function (pair) {
          TarkovStorage.migrateKey(pair[0], pair[1]);
        });
        return;
      }
    } catch (e) {}
    LEGACY_RESTOCK.forEach(function (pair) {
      try {
        var n = localStorage.getItem(pair[1]);
        if (n != null && n !== "") return;
        var o = localStorage.getItem(pair[0]);
        if (o == null) return;
        localStorage.setItem(pair[1], o);
        localStorage.removeItem(pair[0]);
      } catch (e2) {}
    });
  }

  var SCHEMA = "tarkov-tools-export";
  var VERSION = 1;

  /**
   * Collected keys (all localStorage keys starting with "tarkov"):
   * - tarkovTheme, tarkovAccent, tarkovLang, tarkovSound, tarkovSoundVolume / tarkovSoundVol
   * - tarkovPreferredGameMode, tarkovTips / tarkovToolTips, tarkovHiddenTools
   * - tarkovSoundKind.<kind>, tarkovSoundKindVol.<kind>
   * - tarkovSoundTool.<toolBasename>
   * - tarkovPoll.<pollId>, tool-specific state (tarkovPriceAlarmRules, restockEnabled, …)
   * - tarkovNotifications.v1
   */
  function collectKeys() {
    var keys = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("tarkov") === 0) keys[k] = localStorage.getItem(k);
      }
    } catch (e) {}
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
    var map = raw.keys && typeof raw.keys === "object" ? raw.keys : raw;
    if (raw._schema && raw._schema !== SCHEMA) {
      /* still accept legacy flat maps */
    }
    Object.keys(map).forEach(function (k) {
      if (k.charAt(0) === "_") return;
      if (k.indexOf("tarkov") === 0 && typeof map[k] === "string") {
        try { localStorage.setItem(k, map[k]); } catch (e) {}
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
