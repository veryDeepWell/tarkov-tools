/*! Tarkov tool shell — Stage 3.1/3.2: header ?, progress host, ui.css */
(function () {
  "use strict";

  function ensureCss() {
    if (document.querySelector('link[href*="tarkov-ui.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    var path = location.pathname || "";
    link.href = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-ui.css?v=3";
    (document.head || document.documentElement).appendChild(link);
  }

  function toolIdFromPath() {
    try {
      var p = location.pathname || "";
      var m = p.match(/tarkovtool-([^/]+)\.html/);
      if (m) return m[1];
      var f = p.split("/").pop() || "";
      return f.replace(/^tarkovtool-/, "").replace(/\.html$/, "");
    } catch (e) {
      return "";
    }
  }

  function ensureHelp() {
    if (document.getElementById("helpBtn")) return;
    var h1 = document.querySelector(".container h1, main h1, h1");
    if (!h1) {
      var title = document.querySelector(".container .card-title, .card-title");
      if (title) {
        h1 = document.createElement("h1");
        h1.textContent = title.textContent || "Tool";
        h1.style.cssText = "font-size:1.25rem;margin:0 0 8px";
        var box = document.querySelector(".container");
        if (box) box.insertBefore(h1, box.firstChild);
      }
    }
    if (!h1) return;
    var parent = h1.parentNode;
    if (!parent) return;
    if (!(parent.classList && parent.classList.contains("tt-tool-header"))) {
      var wrap = document.createElement("div");
      wrap.className = "tt-tool-header";
      wrap.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px";
      parent.insertBefore(wrap, h1);
      var main = document.createElement("div");
      main.className = "tt-tool-header-main";
      wrap.appendChild(main);
      main.appendChild(h1);
      var next = wrap.nextElementSibling;
      if (next && (next.classList.contains("sub") || next.classList.contains("subtitle"))) {
        main.appendChild(next);
      }
      var act = document.createElement("div");
      act.className = "tt-tool-header-actions";
      wrap.appendChild(act);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "helpBtn";
      btn.className = "btn-ghost tt-help-btn";
      btn.setAttribute("aria-label", "Help");
      btn.textContent = "?";
      btn.style.cssText = "min-width:36px!important;width:36px;min-height:36px;padding:0;border-radius:50%";
      act.appendChild(btn);
    }
    var hb = document.getElementById("helpBtn");
    if (!hb) return;
    var id = toolIdFromPath();
    hb.onclick = function () {
      try {
        if (!window.TarkovUI || !TarkovUI.helpModal) return;
        var h = TarkovUI.toolHelpFromI18n(id);
        var fallbacks = {
          "price-track": "Background flea price snapshots, charts, and countdown. Start BG to poll; open an item for history.",
          "price-alarm": "Rules on avg/low/offers. When a rule hits, you get Notify + sound. Start background to poll on an interval.",
          "restock": "Load trader reset times once, count down locally, Notify on restock. Enable traders you care about.",
          "barter-calc": "Offline barter calculator with flea tax.",
          "barter-live": "Live barter with flea prices from the API.",
          "containers": "Container capacity and value density.",
          "loot-slot": "Profit per inventory slot (flea / trader).",
          "trader-flip": "Buy from traders, sell on flea.",
          "streamer-flip": "Streamer item flips."
        };
        TarkovUI.helpModal({
          title: h.title || id || "Help",
          body: h.body || fallbacks[id] || "Tool help."
        });
      } catch (e) {}
    };
  }

  function ensureProgress() {
    if (document.getElementById("progressWrap") || document.getElementById("tt-progress")) return;
    var status = document.getElementById("status");
    var host = status && status.parentNode ? status.parentNode : document.querySelector(".container .card");
    if (!host) return;
    var wrap = document.createElement("div");
    wrap.id = "progressWrap";
    wrap.className = "progress-wrap tt-progress";
    wrap.innerHTML =
      '<div class="progress-track tt-progress-track"><div class="progress-bar tt-progress-bar" id="progressBar"></div></div>' +
      '<div class="progress-label tt-progress-label" id="progressLabel"></div>';
    if (status && status.parentNode === host) host.insertBefore(wrap, status.nextSibling);
    else host.appendChild(wrap);
  }

  function markPrimaryButtons() {
    var ids = ["fetchPricesBtn", "loadBtn", "startBtn", "checkBtn", "snapBtn"];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.classList && !el.classList.contains("btn-primary")) {
        el.classList.add("btn");
        el.classList.add("btn-primary");
      }
    });
  }

  function boot() {
    ensureCss();
    ensureHelp();
    ensureProgress();
    markPrimaryButtons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
