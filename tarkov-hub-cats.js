/*! Categories baked into tarkov-hub-app.js — shim for settings */
(function () {
  try {
    if (typeof CATALOG !== "undefined") window.TarkovHubCatalog = CATALOG;
  } catch (e) {}
  if (!window.TarkovTools) window.TarkovTools = {};
  if (!TarkovTools.hiddenTools) {
    TarkovTools.hiddenTools = function () {
      try { return JSON.parse(localStorage.getItem("tarkovHiddenTools") || "[]") || []; } catch (e) { return []; }
    };
    TarkovTools.setHiddenTools = function (arr) {
      try { localStorage.setItem("tarkovHiddenTools", JSON.stringify(arr || [])); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent("tt-hidden-changed")); } catch (e) {}
    };
    TarkovTools.isToolHidden = function (f) { return TarkovTools.hiddenTools().indexOf(f) >= 0; };
  }
  if (!TarkovTools.collapsedCats) {
    TarkovTools.collapsedCats = function () {
      try { return JSON.parse(localStorage.getItem("tarkovCollapsedCats") || "[]") || []; } catch (e) { return []; }
    };
    TarkovTools.setCollapsedCats = function (arr) {
      try { localStorage.setItem("tarkovCollapsedCats", JSON.stringify(arr || [])); } catch (e) {}
    };
  }
  window.addEventListener("tt-hidden-changed", function () {
    try { if (typeof renderCatalog === "function") renderCatalog(); } catch (e) {}
  });
  window.addEventListener("tt-settings-applied", function () {
    try { if (typeof renderCatalog === "function") renderCatalog(); } catch (e) {}
  });
})();
