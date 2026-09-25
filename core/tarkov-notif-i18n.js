/*! i18n patch for live tool notifications */
(function () {
  "use strict";
  function tt(key, fb, params) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key, params);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    var s = fb || key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        s = String(s).split("{" + k + "}").join(String(params[k]));
      });
    }
    return s;
  }
  var _Notify = window.Notify || (window.TarkovTools && TarkovTools.Notify);
  if (!_Notify) return;
  function wrap(opts) {
    opts = opts || {};
    var tool = String(opts.tool || "");
    if (/price-track/i.test(tool)) {
      if (opts.title === "Price track" || opts.title === "Price Track") {
        opts.title = tt("priceTrack.title", opts.title || "Price track");
      }
      if (opts.body && /^Snap\s/.test(opts.body)) {
        var m = opts.body.match(/^Snap\s+(\d+)\s*[·•]\s*(.+)$/);
        if (m) {
          opts.body = tt("priceTrack.snapBody", "Snap {n} · {time}", { n: m[1], time: m[2] });
        }
      }
    }
    if (/restock/i.test(tool)) {
      if (/^Restock:/.test(opts.title || "")) {
        var name = (opts.title || "").replace(/^Restock:\s*/, "");
        opts.title = tt("restock.notifTitle", "Restock: {name}", { name: name });
      }
      if (opts.body === "Assortment refreshed") {
        opts.body = tt("restock.notifBody", "Assortment refreshed");
      }
      if (opts.title === "Restock test") {
        opts.title = tt("restock.testTitle", "Restock test");
        opts.body = tt("restock.testBody", "test");
      }
    }
    return _Notify(opts);
  }
  window.Notify = wrap;
  if (window.TarkovTools) TarkovTools.Notify = wrap;
})();
