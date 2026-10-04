/*! TarkovIcons — catalog icons are local assets only */
(function (global) {
  "use strict";

  var BASE = location.pathname.indexOf("/tools/") >= 0 ? "../assets/icons/" : "assets/icons/";
  var registry = Object.create(null);

  function catalogEntry(file) {
    var catalog = global.TarkovHubCATALOG || global.TarkovHubCatalog || [];
    var basename = String(file || "").split("/").pop();
    for (var i = 0; i < catalog.length; i++) {
      if (String(catalog[i].file || "").split("/").pop() === basename) return catalog[i];
    }
    return null;
  }

  function resolveUrl(file) {
    var entry = catalogEntry(file);
    var id = entry && entry.icon ? String(entry.icon) : "other";
    if (!/^[a-z0-9-]+$/i.test(id)) id = "other";
    return registry[id] || BASE + id + ".svg";
  }

  function html(file) {
    var url = resolveUrl(file);
    return '<img class="tt-icon-img" src="' + url + '" alt="" width="28" height="28" loading="lazy" onerror="this.onerror=null;this.src=\'' + BASE + 'other.svg\'">';
  }

  function register(id, url) {
    if (!/^[a-z0-9-]+$/i.test(String(id || ""))) return;
    if (!/^assets\/icons\/[a-z0-9-]+\.svg$/i.test(String(url || ""))) {
      throw new Error("TarkovIcons only accepts local SVGs under assets/icons");
    }
    registry[id] = url;
  }

  global.TarkovIcons = {
    html: html,
    resolve: resolveUrl,
    register: register,
    basePath: BASE
  };
})(typeof window !== "undefined" ? window : globalThis);
