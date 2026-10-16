/*! Tarkov tool shell — Stage 4: i18n ensure + help from locales */
(function () {
  "use strict";

  function ensureCss() {
    if (document.querySelector('link[href*="tarkov-ui.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    var path = location.pathname || "";
    link.href = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-ui.css?v=4";
    (document.head || document.documentElement).appendChild(link);
  }

  function ensureUiJs() {
    if (window.TarkovUI) return;
    if (document.getElementById("tt-ui-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-ui-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-ui.js";
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureItemsJs() {
    if (window.TarkovItems || document.getElementById("tt-items-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-items-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-items.js";
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureProfileJs() {
    if (window.TarkovProfile || document.getElementById("tt-profile-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-profile-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-profile.js";
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureStorageJs() {
    if (window.TarkovStorage || document.getElementById("tt-storage-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-storage-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-storage.js";
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureItemDomainJs() {
    if (window.TarkovItemDomain || document.getElementById("tt-item-domain-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-item-domain-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-item-domain.js";
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureItemViewModelsJs() {
    if (window.TarkovItemViewModels || document.getElementById("tt-item-view-models-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-item-view-models-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-item-view-models.js";
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureWeaponDomainJs() {
    if (window.TarkovWeaponDomain || document.getElementById("tt-weapon-domain-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-weapon-domain-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-weapon-domain.js";
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureDictsJs() {
    if (window.TarkovDicts || document.getElementById("tt-dicts-js")) return;
    var path = location.pathname || "";
    var s = document.createElement("script");
    s.id = "tt-dicts-js";
    s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-dicts.js";
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureI18n() {
    return new Promise(function (resolve) {
      function done() {
        try {
          if (window.TarkovI18n && TarkovI18n.ready) {
            var p = typeof TarkovI18n.ready === "function" ? TarkovI18n.ready() : TarkovI18n.ready;
            Promise.resolve(p)
              .then(function () {
                try {
                  TarkovI18n.applyDom(document);
                } catch (e) {}
                resolve();
              })
              .catch(function () {
                resolve();
              });
            return;
          }
        } catch (e) {}
        resolve();
      }
      if (window.TarkovI18n) {
        done();
        return;
      }
      if (document.getElementById("tt-i18n-js")) {
        done();
        return;
      }
      var path = location.pathname || "";
      var s = document.createElement("script");
      s.id = "tt-i18n-js";
      s.src = (path.indexOf("/tools/") >= 0 ? "../core/" : "core/") + "tarkov-i18n.js";
      s.async = false;
      s.onload = done;
      s.onerror = function () {
        resolve();
      };
      (document.head || document.documentElement).appendChild(s);
    });
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

  function localizeToolChrome() {
    try {
      if (!window.TarkovI18n || !TarkovI18n.t) return;
      var id = toolIdFromPath();
      if (!id) return;
      var title = TarkovI18n.t("tool." + id + ".title");
      var description = TarkovI18n.t("tool." + id + ".description");
      if (!title || title.indexOf("tool.") === 0) return;
      document.title = title + " - Tarkov Tools";
      var heading = document.querySelector("h1");
      if (heading && !heading.hasAttribute("data-i18n-preserve")) heading.textContent = title;
      var subtitle = document.querySelector(".sub, .subtitle");
      if (subtitle && description && description.indexOf("tool.") !== 0) subtitle.textContent = description;
    } catch (e) {}
  }

  function showHelpLocal(title, body) {
    if (window.TarkovUI && TarkovUI.helpModal) {
      TarkovUI.helpModal({ title: title, body: body });
      return;
    }
    var mid = "tt-help-modal";
    var bg = document.getElementById(mid);
    if (!bg) {
      bg = document.createElement("div");
      bg.id = mid;
      bg.className = "modal-bg";
      bg.style.cssText =
        "display:flex;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:300;padding:16px";
      bg.innerHTML =
        '<div class="modal" style="max-width:min(520px,94vw);max-height:80vh;overflow:auto;background:var(--card,#171a21);border:1px solid var(--border,#2a2f3a);border-radius:12px;padding:16px 18px;color:var(--text,#e8eaed)">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px"><h2 id="tt-help-title" style="margin:0;font-size:1.15rem"></h2>' +
        '<button type="button" class="btn-ghost" id="tt-help-x" style="min-width:36px!important;width:36px;min-height:36px;padding:0;flex-shrink:0;border-radius:8px;line-height:1;font-size:1.25rem">\u00d7</button></div>' +
        '<div id="tt-help-body" style="color:var(--muted,#8b919a);line-height:1.5;font-size:.95rem"></div></div>';
      document.body.appendChild(bg);
      bg.addEventListener("click", function (e) {
        if (e.target === bg) bg.style.display = "none";
      });
      document.getElementById("tt-help-x").onclick = function () {
        bg.style.display = "none";
      };
    }
    document.getElementById("tt-help-title").textContent = title || "Help";
    var bodyEl = document.getElementById("tt-help-body");
    bodyEl.innerHTML = String(body || "")
      .split(/\n\n+/)
      .map(function (p) {
        return (
          '<p style="margin:0 0 10px">' +
          String(p).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>") +
          "</p>"
        );
      })
      .join("");
    bg.style.display = "flex";
  }

  function ensureHelp() {
    if (document.getElementById("helpBtn")) return;
    var h1 = document.querySelector(".container h1, main h1, h1");
    if (!h1) {
      var titleEl = document.querySelector(".container .card-title, .card-title");
      if (titleEl) {
        h1 = document.createElement("h1");
        h1.textContent = titleEl.textContent || "Tool";
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
      wrap.style.cssText =
        "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px";
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
      btn.style.cssText =
        "min-width:36px!important;width:36px;min-height:36px;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center";
      act.appendChild(btn);
    }
    var hb = document.getElementById("helpBtn");
    if (!hb) return;
    var id = toolIdFromPath();
    hb.onclick = function () {
      try {
        var title = id || "Help";
        var body = "";
        try {
          if (window.TarkovI18n && TarkovI18n.t) {
            var th = TarkovI18n.t("tool." + id + ".title");
            var hh = TarkovI18n.t("tool." + id + ".help");
            var dh = TarkovI18n.t("tool." + id + ".description");
            if (th && th.indexOf("tool.") !== 0) title = th;
            if (hh && hh.indexOf("tool.") !== 0) body = hh;
            else if (dh && dh.indexOf("tool.") !== 0) body = dh;
          }
        } catch (e3) {}
        showHelpLocal(title, body || "Tarkov Tools utility.");
      } catch (e) {}
    };
  }

  function ensureProgress() {
    if (document.getElementById("progressWrap") || document.getElementById("tt-progress")) return;
    var status = document.getElementById("status");
    var host =
      status && status.parentNode
        ? status.parentNode
        : document.querySelector(".container .card");
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
    var ids = [
      "fetchPricesBtn",
      "loadBtn",
      "startBtn",
      "checkBtn",
      "snapBtn",
      "runBtn",
      "calcBtn",
      "searchBtn",
      "refreshBtn",
      "applyBtn",
      "saveBtn",
      "buildBtn",
      "generateBtn",
      "filterBtn",
      "goBtn",
      "submitBtn"
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.classList && !el.classList.contains("btn-primary")) {
        el.classList.add("btn");
        el.classList.add("btn-primary");
      }
    });
  }



  /**
   * R-2: load gameMode from profile (else default); on change save to profile.
   * Synchronous bind — no delayed overwrites.
   */
  function wireProfileGameMode() {
    try {
      if (!window.TarkovProfile) return;
      if (TarkovProfile.ensureMigrated) TarkovProfile.ensureMigrated();
      // clear bind flags so profile switch re-applies
      ["gameMode", "playerLevel", "level", "prestige"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.__ttProfileBound = false;
        el.__ttProfileBoundNum = null;
        el.__ttProfileBoundPrestige = false;
      });
      if (TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
      else if (TarkovProfile.bindGameMode) TarkovProfile.bindGameMode("gameMode", { fallback: "pve" });
      if (TarkovProfile.context) window.__ttProfileContext = TarkovProfile.context();
      if (TarkovProfile.subscribe && !window.__ttProfileWireBound) {
        window.__ttProfileWireBound = true;
        TarkovProfile.subscribe(function () { wireProfileGameMode(); });
      }
    } catch (e) {}
  }



  function ensureProfileChrome() {
    if (!window.TarkovProfile) return;
    try { if (TarkovProfile.ensureMigrated) TarkovProfile.ensureMigrated(); } catch (e) {}

    function iconUrl(id) {
      var base = (location.pathname || "").indexOf("/tools/") >= 0 ? "../assets/icons/" : "assets/icons/";
      return base + (id || "util") + ".svg";
    }

    function closePop() {
      var p = document.getElementById("tt-profile-pop");
      if (p) p.hidden = true;
    }

    function paintChip() {
      var chip = document.getElementById("tt-profile-chip");
      if (!chip) return;
      var p = TarkovProfile.getActive();
      var name = (p && p.name) || "ЧВК";
      var lvl = (p && p.level) || 1;
      var ico = (p && p.icon) || "util";
      chip.innerHTML =
        '<img src="' + iconUrl(ico) + '" alt="" style="width:18px;height:18px">' +
        '<span class="tt-profile-chip-text">' + name + " · L" + lvl + "</span>";
      try {
        document.documentElement.setAttribute("data-tt-filter-mode", TarkovProfile.getFilterMode ? TarkovProfile.getFilterMode() : "off");
      } catch (e) {}
    }

    function paintPop() {
      var body = document.getElementById("tt-profile-pop-body");
      if (!body) return;
      var list = TarkovProfile.list();
      var active = TarkovProfile.getActiveId();
      var mode = TarkovProfile.getFilterMode ? TarkovProfile.getFilterMode() : "off";
      var html = '<div class="tt-profile-pop-title">Профиль</div>';
      html += list.map(function (m) {
        return (
          '<button type="button" class="tt-profile-pick' + (m.id === active ? " is-on" : "") + '" data-id="' + m.id + '">' +
          '<img src="' + iconUrl(m.icon || "util") + '" alt="">' +
          "<span>" + (m.name || "ЧВК") + " · L" + (m.level || 1) + "</span></button>"
        );
      }).join("");
      html +=
        '<div class="tt-profile-pop-title" style="margin-top:10px">Фильтр по профилю</div>' +
        '<div class="tt-profile-filter-row">' +
        ['off','dim','hide'].map(function (m) {
          var label = m === "off" ? "Выкл" : m === "dim" ? "Серым" : "Скрыть";
          return '<button type="button" class="tt-filter-mode' + (mode === m ? " is-on" : "") + '" data-mode="' + m + '">' + label + "</button>";
        }).join("") +
        "</div>" +
        '<p class="meta" style="margin:8px 0 0;font-size:.75rem">Недоступное по уровню / УЛ / квестам</p>' +
        '<a class="link" href="tarkovtool-my-tarkov.html" style="display:inline-block;margin-top:8px">Мой Тарков →</a>';
      body.innerHTML = html;
      body.querySelectorAll(".tt-profile-pick").forEach(function (btn) {
        btn.onclick = function () {
          var id = btn.getAttribute("data-id");
          try {
            TarkovProfile.setActive(id);
            paintChip();
            paintPop();
            if (window.wireProfileGameMode) wireProfileGameMode();
            else if (TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
            try {
              window.dispatchEvent(new CustomEvent("tt-profile-changed", { detail: { id: id } }));
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: "tt-profile-changed", id: id }, "*");
              }
            } catch (e) {}
            // soft rebuild: onProfileRefresh → render → paint (R2.1)
            try {
              if (typeof window.onProfileRefresh === "function") window.onProfileRefresh();
              else if (typeof window.render === "function") window.render();
              else if (typeof window.paint === "function") window.paint();
            } catch (eRef) {}
            closePop();
          } catch (err) {
            alert(err.message || String(err));
          }
        };
      });
      body.querySelectorAll(".tt-filter-mode").forEach(function (btn) {
        btn.onclick = function () {
          TarkovProfile.setFilterMode(btn.getAttribute("data-mode"));
          paintPop();
          try {
            if (typeof window.onProfileRefresh === "function") window.onProfileRefresh();
            else if (typeof window.render === "function") window.render();
            else if (typeof window.paint === "function") window.paint();
          } catch (eRef) {}
        };
      });
    }

    var actions = document.querySelector(".tt-tool-header-actions");
    if (!actions) {
      // create minimal bar at top of body
      var bar = document.getElementById("tt-profile-bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "tt-profile-bar";
        bar.style.cssText = "display:flex;justify-content:flex-end;gap:8px;padding:6px 0;margin-bottom:4px";
        var box = document.querySelector(".container") || document.body;
        box.insertBefore(bar, box.firstChild);
        actions = bar;
      } else {
        actions = bar;
      }
    }

    if (!document.getElementById("tt-profile-chip")) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.id = "tt-profile-chip";
      chip.className = "btn-ghost tt-profile-chip";
      chip.style.cssText = "display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 10px;font-size:.85rem";
      actions.insertBefore(chip, actions.firstChild);

      var pop = document.createElement("div");
      pop.id = "tt-profile-pop";
      pop.hidden = true;
      pop.className = "tt-profile-pop card";
      pop.innerHTML = '<div id="tt-profile-pop-body"></div>';
      pop.style.cssText =
        "position:absolute;right:0;top:100%;margin-top:6px;z-index:50;min-width:220px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.35)";
      var wrap = actions.closest(".tt-tool-header") || actions;
      if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
      wrap.appendChild(pop);

      chip.onclick = function (ev) {
        ev.stopPropagation();
        var p = document.getElementById("tt-profile-pop");
        if (!p) return;
        p.hidden = !p.hidden;
        if (!p.hidden) paintPop();
      };
      document.addEventListener("click", function (ev) {
        var p = document.getElementById("tt-profile-pop");
        var c = document.getElementById("tt-profile-chip");
        if (!p || p.hidden) return;
        if (p.contains(ev.target) || (c && c.contains(ev.target))) return;
        p.hidden = true;
      });
    }

    paintChip();
    try {
      if (TarkovProfile.subscribe && !window.__ttProfileChromeBound) {
        window.__ttProfileChromeBound = true;
        TarkovProfile.subscribe(function () {
          paintChip();
          wireProfileGameMode();
        });
      }
    } catch (e) {}
  }


  function boot() {
    ensureCss();
    ensureUiJs();
    ensureStorageJs();
    ensureProfileJs();
    ensureItemsJs();
    ensureItemDomainJs();
    ensureItemViewModelsJs();
    ensureWeaponDomainJs();
    ensureDictsJs();
    ensureI18n().then(function () {
      ensureHelp();
      setTimeout(ensureHelp, 100);
      setTimeout(ensureHelp, 500);
      ensureProgress();
      markPrimaryButtons();
      try {
        if (window.TarkovDicts && TarkovDicts.syncGameMode) {
          TarkovDicts.syncGameMode();
        }
      } catch (eMode) {}
      try {
        if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
        localizeToolChrome();
      } catch (e) {}
    });
  }

  window.addEventListener("tt-lang-changed", function () {
    try {
      if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
    } catch (e) {
      console.error(e);
    }
    localizeToolChrome();
  });

  // Restore #gameMode as early as possible: the per-tool sync blocks removed in
  // Phase 2 ran at parse time, so the shell must not wait for DOMContentLoaded
  // (still kept as a safety net for pages loading the shell from <head>).
  try {
    if (window.TarkovDicts && TarkovDicts.syncGameMode) TarkovDicts.syncGameMode();
  } catch (ePre) {}

  window.addEventListener("tt-profile-changed", function () {
    try { wireProfileGameMode(); } catch (e) {}
    try {
      if (typeof window.onProfileRefresh === "function") window.onProfileRefresh();
      else if (typeof window.render === "function") window.render();
      else if (typeof window.paint === "function") window.paint();
    } catch (eRef) {}
  });
  window.addEventListener("tt-profile-refresh", function () {
    try { wireProfileGameMode(); } catch (e) {}
    try {
      if (typeof window.onProfileRefresh === "function") window.onProfileRefresh();
      else if (typeof window.render === "function") window.render();
      else if (typeof window.paint === "function") window.paint();
    } catch (eRef) {}
  });
  window.addEventListener("message", function (ev) {
    if (!ev.data || !ev.data.type) return;
    if (ev.data.type === "tt-profile-changed" || ev.data.type === "tt-profile-filter" || ev.data.type === "tt-profile-refresh") {
      try { wireProfileGameMode(); } catch (e) {}
      try {
        if (typeof window.onProfileRefresh === "function") window.onProfileRefresh();
        else if (typeof window.render === "function") window.render();
        else if (typeof window.paint === "function") window.paint();
      } catch (eRef) {}
    }
  });
  /* tt-profile-changed-listener */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
