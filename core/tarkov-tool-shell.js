/*! Tarkov tool shell — Stage 3 full: header ?, progress, ui.css, local help */
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

  function showHelpLocal(title, body) {
    if (window.TarkovUI && TarkovUI.helpModal) {
      TarkovUI.helpModal({ title: title, body: body });
      return;
    }
    var id = "tt-help-modal";
    var bg = document.getElementById(id);
    if (!bg) {
      bg = document.createElement("div");
      bg.id = id;
      bg.className = "modal-bg";
      bg.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:300;padding:16px";
      bg.innerHTML = '<div class="modal" style="max-width:min(520px,94vw);max-height:80vh;overflow:auto;background:var(--card,#171a21);border:1px solid var(--border,#2a2f3a);border-radius:12px;padding:16px 18px;color:var(--text,#e8eaed)">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:12px"><h2 id="tt-help-title" style="margin:0;font-size:1.15rem"></h2>' +
        '<button type="button" class="btn-ghost" id="tt-help-x" style="min-width:36px!important;padding:0 10px">\u00d7</button></div>' +
        '<div id="tt-help-body" style="color:var(--muted,#8b919a);line-height:1.5;font-size:.95rem"></div></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) { if (e.target === bg) bg.style.display = "none"; });
      document.getElementById("tt-help-x").onclick = function () { bg.style.display = "none"; };
    }
    document.getElementById("tt-help-title").textContent = title || "Help";
    var bodyEl = document.getElementById("tt-help-body");
    bodyEl.innerHTML = String(body || "").split(/\n\n+/).map(function (p) {
      return "<p style=\"margin:0 0 10px\">" + String(p).replace(/</g, "<").replace(/\n/g, "<br>") + "</p>";
    }).join("");
    bg.style.display = "flex";
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
        var h = { title: id, body: "" };
        try {
          if (window.TarkovUI && TarkovUI.toolHelpFromI18n) h = TarkovUI.toolHelpFromI18n(id);
        } catch (e) {}
        var fallbacks = {
          "price-track": "Background flea price snapshots, charts, and countdown.",
          "price-alarm": "Price rules with background polling and Notify.",
          "restock": "Trader reset countdown with Notify on restock.",
          "barter-calc": "Offline barter calculator with flea tax.",
          "barter-live": "Live barter with flea prices from the API.",
          "containers": "Container capacity and value density.",
          "loot-slot": "Profit per inventory slot.",
          "trader-flip": "Buy from traders, sell on flea.",
          "streamer-flip": "Streamer item flips.",
          "ammo": "Ammo chart: penetration, damage, cost.",
          "armor": "Armor classes and material.",
          "plates": "Armor plates compatibility.",
          "helmets": "Helmet protection and slots.",
          "gun-builder": "Weapon build planner.",
          "loadout-builder": "Full loadout builder.",
          "hideout": "Hideout modules and upgrades.",
          "crafts": "Craft profitability.",
          "quests": "Quest list and requirements.",
          "medkits": "Medkits and healing.",
          "stims": "Stimulants effects."
        };
        showHelpLocal(h.title || id || "Help", h.body || fallbacks[id] || "Tarkov Tools utility.");
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
    var ids = ["fetchPricesBtn", "loadBtn", "startBtn", "checkBtn", "snapBtn", "runBtn", "calcBtn", "searchBtn"];
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
