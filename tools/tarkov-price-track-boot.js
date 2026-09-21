/** Price-track boot: mini status + i18n + due-snap trigger */
(function () {
  var RUN_KEY = "tarkovPriceTrackRunning";
  var META_KEY = "tarkovPriceTrackMeta";

  function readRun() {
    try {
      return localStorage.getItem(RUN_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function readMeta() {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function tt(key, fallback) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback != null ? fallback : key;
  }

  function reportStatus(extra) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "tt-status",
            tool: "price-track",
            running: readRun(),
            meta: Object.assign({}, readMeta(), extra || {})
          },
          "*"
        );
      }
    } catch (e) {}
  }

  function applyI18n() {
    try {
      if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
    } catch (e) {}
  }

  function bootI18n() {
    if (window.TarkovI18n && TarkovI18n.ready) {
      var p =
        typeof TarkovI18n.ready === "function"
          ? TarkovI18n.ready()
          : Promise.resolve(TarkovI18n.ready);
      Promise.resolve(p).then(applyI18n).catch(function () {
        applyI18n();
      });
    } else {
      applyI18n();
    }
  }

  bootI18n();
  setTimeout(bootI18n, 600);
  window.addEventListener("tt-lang-changed", applyI18n);

  reportStatus();
  setInterval(reportStatus, 15000);
})();
