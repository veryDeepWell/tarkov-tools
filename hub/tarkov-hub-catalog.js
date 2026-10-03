/*! Hub catalog — single source: __TT_CATALOG_DATA bootstrap or TarkovStorage */
(function (global) {
  "use strict";
  global.TarkovHubCATALOG = global.TarkovHubCATALOG || [];
  global.TarkovHubCATEGORIES = global.TarkovHubCATEGORIES || {};

  function apply(data) {
    if (!data || typeof data !== "object") return false;
    var tools = data.tools || (Array.isArray(data) ? data : []);
    if (!tools.length) return false;
    global.TarkovHubCATALOG = tools;
    global.TarkovHubCatalog = tools;
    global.CATALOG = tools;
    if (data.categories) global.TarkovHubCATEGORIES = data.categories;
    try {
      global.dispatchEvent(new CustomEvent("tarkov-catalog-ready", { detail: data }));
    } catch (e) {}
    return true;
  }

  /* Offline bootstrap — use __TT_CATALOG_DATA if available */
  if (global.__TT_CATALOG_DATA) {
    try { apply(global.__TT_CATALOG_DATA); } catch (e) {
      console.warn("Failed to apply __TT_CATALOG_DATA bootstrap:", e);
    }
  }

  // No fetch — rely on bootstrap or TarkovStorage only
  global.TarkovHubCATALOG_READY = true;
})(window);
