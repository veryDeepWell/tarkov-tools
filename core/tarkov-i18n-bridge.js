/*! Bridge: TarkovI18n \u2194 TarkovTools */
(function () {
  function whenReady(fn) {
    if (window.TarkovI18n && window.TarkovTools) return fn();
    var n = 0;
    var id = setInterval(function () {
      n++;
      if ((window.TarkovI18n && window.TarkovTools) || n > 100) {
        clearInterval(id);
        if (window.TarkovI18n && window.TarkovTools) fn();
      }
    }, 40);
  }

  whenReady(function () {
    var origLang = TarkovTools.lang;
    if (typeof origLang === "function") {
      TarkovTools.lang = function () {
        try {
          if (window.TarkovI18n && TarkovI18n.lang) return TarkovI18n.lang();
        } catch (e) {}
        return origLang.call(TarkovTools);
      };
    }

    TarkovI18n.ready().then(function () {
      try { TarkovI18n.applyDom(document); } catch (e) {}
      if (TarkovTools._paintBar) TarkovTools._paintBar();
    }).catch(function () {});

    window.addEventListener("tt-lang-changed", function () {
      try { TarkovI18n.applyDom(document); } catch (e) {}
      try {
        if (typeof renderCatalog === "function") renderCatalog();
      } catch (e) {}
      if (TarkovTools._paintBar) TarkovTools._paintBar();
    });

    window.addEventListener("tarkov-catalog-ready", function () {
      try { TarkovI18n.applyDom(document); } catch (e) {}
    });
  });
})();
