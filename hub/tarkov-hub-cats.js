/*! Hub categories: collapsible sections */
(function () {
  function getCatalogList() {
    return window.TarkovHubCATALOG || window.TarkovHubCatalog || window.CATALOG || [];
  }
  const CAT_ORDER = ["flea", "loadout", "hideout", "quests", "med", "util", "other"];
  const CAT_TITLE = {
    flea: "Барахолка", loadout: "Лоадаут", hideout: "Убежка",
    quests: "Квесты", med: "Мед / еда", util: "Утилиты", other: "Прочее"
  };
  const CAT_MAP = {
    "tarkovtool-price-track.html": "flea", "tarkovtool-price-alarm.html": "flea",
    "tarkovtool-barter-calc.html": "flea", "tarkovtool-barter-live.html": "flea",
    "tarkovtool-trader-flip.html": "flea", "tarkovtool-streamer-flip.html": "flea",
    "tarkovtool-loot-slot.html": "flea", "tarkovtool-containers.html": "flea",
    "tarkovtool-random-loadout.html": "loadout", "tarkovtool-drip-loadout.html": "loadout",
    "tarkovtool-loadout-builder.html": "loadout", "tarkovtool-loadout-budget.html": "loadout",
    "tarkovtool-gun-builder.html": "loadout", "tarkovtool-gun-budget.html": "loadout",
    "tarkovtool-drip.html": "loadout", "tarkovtool-drip-builder.html": "loadout",
    "tarkovtool-armor.html": "loadout", "tarkovtool-helmets.html": "loadout",
    "tarkovtool-ammo.html": "loadout", "tarkovtool-mods.html": "loadout",
    "tarkovtool-plates.html": "loadout", "tarkovtool-mags.html": "loadout",
    "tarkovtool-scopes.html": "loadout", "tarkovtool-nvg.html": "loadout",
    "tarkovtool-hideout.html": "hideout", "tarkovtool-hideout-mgmt.html": "hideout",
    "tarkovtool-btc-farm.html": "hideout", "tarkovtool-crafts.html": "hideout",
    "tarkovtool-cultist.html": "hideout",
    "tarkovtool-quests.html": "quests", "tarkovtool-quest-items.html": "quests",
    "tarkovtool-raid-checklist.html": "quests", "tarkovtool-bosses.html": "quests",
    "tarkovtool-food.html": "med", "tarkovtool-medkits.html": "med",
    "tarkovtool-stims.html": "med", "tarkovtool-stim-combos.html": "med",
    "tarkovtool-my-tarkov.html": "util", "tarkovtool-restock.html": "util",
    "tarkovtool-shortname.html": "util", "tarkovtool-lang-search.html": "util",
    "tarkovtool-compare.html": "util", "tarkovtool-item-use.html": "util",
    "tarkovtool-skills.html": "util", "tarkovtool-keys.html": "util"
  };

  function ensureCat(t) {
    if (!t.cat) {
      var base = String(t.file || "").split("/").pop();
      t.cat = CAT_MAP[base] || CAT_MAP[t.file] || "other";
    }
    return t;
  }

  function readHidden() {
    try { return JSON.parse(localStorage.getItem("tarkovHiddenTools") || "[]") || []; } catch (e) { return []; }
  }
  function writeHidden(arr) {
    try { localStorage.setItem("tarkovHiddenTools", JSON.stringify(arr || [])); } catch (e) {}
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
    if (typeof cardHtml === "function") return cardHtml(t, !!pinned);
    var title = t.title || t.file;
    return '<div class="tool" data-open="' + t.file + '" role="link" tabindex="0">' +
      '<div class="tool-head"><div class="tool-ico">📎</div>' +
      '<div><h2>' + title + '</h2><p>' + (t.description || "") + '</p></div></div></div>';
  }

  function wireCards() {
    document.querySelectorAll(".tool-pin").forEach(function (btn) {
      btn.onclick = function (e) {
        if (typeof togglePin === "function") togglePin(btn.getAttribute("data-pin"), e);
      };
    });
    document.querySelectorAll(".tool[data-open]").forEach(function (el) {
      el.onclick = function (e) {
        if (e.target.closest && e.target.closest(".tool-pin")) return;
        var f = el.getAttribute("data-open");
        if (e.ctrlKey || e.metaKey) { window.open(f, "_blank"); return; }
        if (typeof openToolAsMini === "function") openToolAsMini(f);
        else window.location.href = f;
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
      if (grid0) grid0.innerHTML = "<p class=meta>Каталог загружается…</p>";
      return;
    }

    var qEl = document.getElementById("q");
    var q = ((qEl && qEl.value) || "").toLowerCase().trim();
    var hidden = readHidden();
    var collapsed = readCollapsed();
    var pins = [];
    try {
      pins = JSON.parse(localStorage.getItem("tarkovHubPins") || "[]") || [];
    } catch (e) {}

    var list = CATALOG.filter(function (t) {
      if (hidden.indexOf(t.file) >= 0) return false;
      if (!q) return true;
      var s = ((t.title || "") + " " + (t.description || "") + " " + (t.file || "")).toLowerCase();
      return s.indexOf(q) >= 0;
    });

    var count = document.getElementById("count");
    if (count) {
      count.textContent = list.length + " / " + CATALOG.length +
        (hidden.length ? " · скрыто " + hidden.length : "");
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
      html += '<div class="cat-block" data-cat="__pins__">' +
        '<div class="cat-head" data-cat="__pins__"><span class="cat-title">Закреплённые</span></div>' +
        '<div class="grid cat-body">' +
        pinned.map(function (t) { return card(t, true); }).join("") +
        "</div></div>";
    }

    CAT_ORDER.forEach(function (c) {
      var tools = byCat[c] || [];
      if (!tools.length) return;
      var isCol = collapsed.indexOf(c) >= 0;
      var title = (window.TarkovHubCATEGORIES && TarkovHubCATEGORIES[c]) || CAT_TITLE[c] || c;
      try {
        if (window.TarkovI18n && TarkovI18n.catTitle) title = TarkovI18n.catTitle(c) || title;
      } catch (e) {}
      html += '<div class="cat-block' + (isCol ? " collapsed" : "") + '" data-cat="' + c + '">' +
        '<div class="cat-head" data-cat="' + c + '">' +
        '<span class="cat-chev">' + (isCol ? "▶" : "▼") + '</span> ' +
        '<span class="cat-title">' + title + '</span> ' +
        '<span class="cat-count">' + tools.length + '</span></div>' +
        '<div class="grid cat-body"' + (isCol ? ' style="display:none"' : "") + '>' +
        tools.map(function (t) { return card(t, pins.indexOf(t.file) >= 0); }).join("") +
        "</div></div>";
    });

    var grid = document.getElementById("grid");
    if (grid) grid.innerHTML = html;
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
