(function () {
  if (typeof formatNum !== "function") {
    window.formatNum = function (n) {
      try {
        if (window.TarkovUI && TarkovUI.formatNum) return TarkovUI.formatNum(n);
      } catch (e) {}
      n = Number(n);
      if (!isFinite(n)) return "\u2014";
      return Math.round(n).toLocaleString("ru-RU");
    };
  }
})();
