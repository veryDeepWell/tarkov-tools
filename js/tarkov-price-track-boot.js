/** Price-track boot: i18n only — countdown owned by main tool script */
(function () {
  function applyI18n() {
    try {
      if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
    } catch (e) {}
  }

  function bootI18n() {
    if (window.TarkovI18n && TarkovI18n.ready) {
      (typeof TarkovI18n.ready === "function"
        ? TarkovI18n.ready()
        : Promise.resolve(TarkovI18n.ready)
      ).then(applyI18n);
    } else {
      applyI18n();
    }
  }
  bootI18n();
  setTimeout(bootI18n, 600);
  window.addEventListener("tt-lang-changed", applyI18n);
})();
