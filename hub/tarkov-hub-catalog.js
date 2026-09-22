/*! Hub catalog — single source: catalog.json (optional __TT_CATALOG_DATA bootstrap) */
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

  /* Optional offline bootstrap (same content as catalog.json) — not a second source of truth */
  if (global.__TT_CATALOG_DATA) {
    try { apply(global.__TT_CATALOG_DATA); } catch (e) {}
  }

  function loadJson() {
    return fetch("catalog.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        apply(data);
        try {
          if (typeof window.renderCatalog === "function") window.renderCatalog();
        } catch (e) {}
      })
      .catch(function () {});
  }

  loadJson();
})(window);
