/*! Hub catalog loader — single source: catalog.json */
(function (global) {
  "use strict";
  global.TarkovHubCATALOG = global.TarkovHubCATALOG || [];
  global.TarkovHubCATEGORIES = global.TarkovHubCATEGORIES || {};

  function apply(data) {
    if (!data || typeof data !== "object") return;
    var tools = data.tools || (Array.isArray(data) ? data : []);
    global.TarkovHubCATALOG = tools;
    if (data.categories) global.TarkovHubCATEGORIES = data.categories;
    try {
      global.dispatchEvent(new CustomEvent("tarkov-catalog-ready", { detail: data }));
    } catch (e) {}
  }

  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "catalog.json", false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      apply(JSON.parse(xhr.responseText));
    } else {
      console.error("catalog.json HTTP", xhr.status);
    }
  } catch (e) {
    console.error("catalog.json load failed", e);
  }
})(window);
