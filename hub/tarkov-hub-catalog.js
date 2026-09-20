/*! Hub catalog — sync from #catalog-embed, then refresh catalog.json */
(function (global) {
  "use strict";
  global.TarkovHubCATALOG = global.TarkovHubCATALOG || [];
  global.TarkovHubCATEGORIES = global.TarkovHubCATEGORIES || {};

  function apply(data) {
    if (!data || typeof data !== "object") return;
    var tools = data.tools || (Array.isArray(data) ? data : []);
    if (!tools.length) return;
    global.TarkovHubCATALOG = tools;
    global.TarkovHubCatalog = tools;
    global.CATALOG = tools;
    if (data.categories) global.TarkovHubCATEGORIES = data.categories;
    try {
      global.dispatchEvent(new CustomEvent("tarkov-catalog-ready", { detail: data }));
    } catch (e) {}
  }

  try {
    var el = document.getElementById("catalog-embed");
    if (el && el.textContent) {
      apply(JSON.parse(el.textContent));
    }
  } catch (e) {}

  try {
    fetch("catalog.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        apply(data);
        try {
          if (typeof window.renderCatalog === "function") window.renderCatalog();
        } catch (e) {}
      })
      .catch(function () {});
  } catch (e) {}
})(window);
