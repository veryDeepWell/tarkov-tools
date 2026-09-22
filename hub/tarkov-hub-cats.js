/*! Hub categories: collapsible sections + horizontal card grids */
(function () {
  function getCatalogList() {
    return window.TarkovHubCATALOG || window.TarkovHubCatalog || window.CATALOG || [];
  }
  function tt(key, fallback, params) {
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key, params);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    var s = fallback || key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        s = String(s).split("{" + k + "}").join(String(params[k]));
      });
    }
    return s;
  }
  var CAT_ORDER = ["flea", "loadout", "hideout", "quests", "med", "util", "other"];

  function ensureCat(t) {
    if (!t.cat) {
      var base = String(t.file || "").split("/").pop();
      /* Prefer catalog.cat; fallback map removed — single source is catalog.json */
      t.cat = t.cat || "other";
    }
    return t;
  }

  function readHidden() {
    try { return JSON.parse(localStorage.getItem("tarkovHiddenTools") || "[]") || []; } catch (e) { return []; }
  }
  function readCollapsed() {
    try { return JSON.parse(localStorage.getItem("tarkovCollapsedCats") || "[]") || []; } catch (e) { return []; }
  }
  function writeCollapsed(arr) {
    try { localStorage.setItem("tarkovCollapsedCats", JSON.stringify(arr || [])); } catch (e) {}
  }

  function publishCatalog() {
    var list = getCatalogList();
    list.forEach(ensureCat);
    window.TarkovHubCATALOG = list;
    window.TarkovHubCatalog = list;
    window.CATALOG = list;
  }

  function card(t, pinned) {
    if (typeof window.cardHtml === "function") return window.cardHtml(t, !!pinned);
    var title = t.title || t.file;
    var desc = t.description || "";
    try {
      if (window.TarkovI18n && TarkovI18n.toolTitle) {
        var ti = TarkovI18n.toolTitle(t.file);
        if (ti && ti.indexOf("tool.") !== 0) title = ti;
      }
      if (window.TarkovI18n && TarkovI18n.toolDesc) {
        var de = TarkovI18n.toolDesc(t.file);
        if (de && de.indexOf("tool.") !== 0) desc = de;
      }
    } catch (e) {}
    return '<div class="tool" data-open="' + t.file + '" role="link" tabindex="0">' +
      '<div class="tool-head"><div class="tool-ico">📎</div>' +
      '<div><h2>' + title + '</h2><p>' + desc + '</p></div></div></div>';
  }

  function wireCards() {
    document.querySelectorAll(".tool-pin").forEach(function (btn) {
      btn.onclick = function (e) {
        if (typeof window.togglePin === "function") window.togglePin(btn.getAttribute("data-pin"), e);
      };
    });
    document.querySelectorAll(".tool[data-open]").forEach(function (el) {
      el.onclick = function (e) {
        if (e.target.closest && e.target.closest(".tool-pin")) return;
        var f = el.getAttribute("data-open");
        if (e.ctrlKey || e.metaKey) { window.open(f, "_blank"); return; }
        if (typeof window.openToolAsMini === "function") window.openToolAsMini(f);
        else window.location.href = f;
      };
      el.onkeydown = function (e) {
        if (e.key === "Enter" && typeof window.openToolAsMini === "function") {
          window.openToolAsMini(el.getAttribute("data-open"));
        }
      };
    });
    document.querySelectorAll(".cat-head[data-cat]").forEach(function (head) {
      var cat = head.getAttribute("data-cat");
      if (cat === "__pins__") return;
      head.onclick = function () {
        var col = readCollapsed();
        if (col.indexOf(cat) >= 0) col = col.filter(function (x) { return x !== cat; });
        else col.push(cat);
        writeCollapsed(col);
        window.renderCatalog();
      };
    });
  }

  window.renderCatalog = function () {
    publishCatalog();
    var CATALOG = getCatalogList();
    if (!CATALOG.length) {
      var grid0 = document.getElementById("grid");
      if (grid0) {
        grid0.classList.add("catalog-root");
        grid0.innerHTML = "<p class=meta>" + tt("hub.catalogLoading", "Loading catalog…") + "</p>";
      }
      return;
    }

    var qEl = document.getElementById("q");
    var q = ((qEl && qEl.value) || "").toLowerCase().trim();
    var hidden = readHidden();
    var collapsed = readCollapsed();
    var pins = [];
    try { pins = JSON.parse(localStorage.getItem("tarkovHubPins") || "[]") || []; } catch (e) {}

    var list = CATALOG.filter(function (t) {
      if (hidden.indexOf(t.file) >= 0) return false;
      if (!q) return true;
      var title = t.title || "";
      var desc = t.description || "";
      try {
        if (window.TarkovI18n) {
          var ti = TarkovI18n.toolTitle(t.file);
          var de = TarkovI18n.toolDesc ? TarkovI18n.toolDesc(t.file) : "";
          if (ti && ti.indexOf("tool.") !== 0) title = ti;
          if (de && de.indexOf("tool.") !== 0) desc = de;
        }
      } catch (e) {}
      var s = (title + " " + desc + " " + (t.file || "")).toLowerCase();
      return s.indexOf(q) >= 0;
    });

    var count = document.getElementById("count");
    if (count) {
      var extra = hidden.length
        ? " " + tt("hub.hiddenCount", "· hidden {n}", { n: hidden.length })
        : "";
      count.textContent = list.length + " / " + CATALOG.length + extra;
    }

    var byCat = {};
    CAT_ORDER.forEach(function (c) { byCat[c] = []; });
    list.forEach(function (t) {
      ensureCat(t);
      var c = t.cat || "other";
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(t);
    });

    var pinned = list.filter(function (t) { return pins.indexOf(t.file) >= 0; });
    pinned.sort(function (a, b) { return pins.indexOf(a.file) - pins.indexOf(b.file); });

    var html = "";
    if (pinned.length) {
      html += '<div class="cat-section" data-cat="__pins__">' +
        '<div class="cat-head" data-cat="__pins__"><span class="cat-chevron">📌</span><span class="cat-title">' +
        tt("hub.pinned", "Pinned") + '</span><span class="cat-count">' + pinned.length + '</span></div>' +
        '<div class="cat-body grid">' +
        pinned.map(function (t) { return card(t, true); }).join("") +
        "</div></div>";
    }

    CAT_ORDER.forEach(function (c) {
      var tools = byCat[c] || [];
      if (!tools.length) return;
      var isCol = collapsed.indexOf(c) >= 0;
      var title = c;
      try {
        if (window.TarkovI18n && TarkovI18n.catTitle) title = TarkovI18n.catTitle(c) || title;
        else if (window.TarkovI18n && TarkovI18n.t) title = TarkovI18n.t("cat." + c) || title;
      } catch (e) {}
      html += '<div class="cat-section" data-cat="' + c + '">' +
        '<div class="cat-head' + (isCol ? " is-collapsed" : "") + '" data-cat="' + c + '">' +
        '<span class="cat-chevron">' + (isCol ? "▶" : "▼") + '</span>' +
        '<span class="cat-title">' + title + '</span>' +
        '<span class="cat-count">' + tools.length + '</span></div>' +
        '<div class="cat-body grid' + (isCol ? " is-collapsed" : "") + '">' +
        tools.map(function (t) { return card(t, pins.indexOf(t.file) >= 0); }).join("") +
        "</div></div>";
    });

    if (!html && q) {
      html = "<p class=meta>" + tt("hub.noResults", "No tools found") + "</p>";
    }

    var grid = document.getElementById("grid");
    if (grid) {
      grid.classList.add("catalog-root");
      grid.innerHTML = html;
    }
    wireCards();
  };

  window.addEventListener("tt-hidden-changed", function () {
    try { window.renderCatalog(); } catch (e) {}
  });
  window.addEventListener("tt-settings-applied", function () {
    try { window.renderCatalog(); } catch (e) {}
  });
  window.addEventListener("tarkov-catalog-ready", function () {
    try { boot(); } catch (e) {}
  });
  window.addEventListener("tt-lang-changed", function () {
    try { window.renderCatalog(); } catch (e) {}
  });

  function boot() {
    publishCatalog();
    try { window.renderCatalog(); } catch (e) { console.error("[hub-cats]", e); }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); });
  } else {
    setTimeout(boot, 0);
  }
})();
