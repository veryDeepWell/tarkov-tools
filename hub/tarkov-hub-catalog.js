/*! Hub catalog — instant FALLBACK, async refresh (no sync XHR) */
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

  var FALLBACK = {"version":1,"categories":{"flea":"Барахолка","loadout":"Лоадаут","hideout":"Убежка","quests":"Квесты","med":"Мед / еда","util":"Утилиты","other":"Прочее"},"tools":[]};

  apply(FALLBACK);

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
