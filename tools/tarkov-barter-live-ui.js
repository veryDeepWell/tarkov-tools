/* Stage 3.0 barter UI wire */
(function () {
  function wire() {
    try {
      var hb = document.getElementById("helpBtn");
      if (!hb) {
        var h1 = document.querySelector("h1");
        if (h1 && h1.parentNode) {
          var wrap = document.createElement("div");
          wrap.className = "tt-tool-header";
          var main = document.createElement("div");
          main.className = "tt-tool-header-main";
          h1.parentNode.insertBefore(wrap, h1);
          wrap.appendChild(main);
          main.appendChild(h1);
          var sub = document.querySelector(".subtitle");
          if (sub) main.appendChild(sub);
          var act = document.createElement("div");
          act.className = "tt-tool-header-actions";
          hb = document.createElement("button");
          hb.type = "button";
          hb.className = "btn-ghost tt-help-btn";
          hb.id = "helpBtn";
          hb.textContent = "?";
          act.appendChild(hb);
          wrap.appendChild(act);
        }
      }
      if (hb) {
        hb.onclick = function () {
          if (!window.TarkovUI || !TarkovUI.helpModal) return;
          var h = TarkovUI.toolHelpFromI18n("barter-live");
          TarkovUI.helpModal({
            title: h.title || "Barter (live)",
            body: h.body || "Load flea prices, set receive item and components, calculate profit. Tax is simplified."
          });
        };
      }
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
