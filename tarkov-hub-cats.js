/*! Hub categories: same square cards, collapsible sections (Prism-style) */
(function () {
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
    if (!t.cat) t.cat = CAT_MAP[t.file] || "other";
    return t;
  }
  function hiddenList() {
    if (window.TarkovTools && TarkovTools.hiddenTools) return TarkovTools.hiddenTools();
    try { return JSON.parse(localStorage.getItem("tarkovHiddenTools") || "[]") || []; } catch (e) { return []; }
  }
  function collapsedList() {
    if (window.TarkovTools && TarkovTools.collapsedCats) return TarkovTools.collapsedCats();
    try { return JSON.parse(localStorage.getItem("tarkovCollapsedCats") || "[]") || []; } catch (e) { return []; }
  }
  function setCollapsed(arr) {
    if (window.TarkovTools && TarkovTools.setCollapsedCats) TarkovTools.setCollapsedCats(arr);
    else try { localStorage.setItem("tarkovCollapsedCats", JSON.stringify(arr || [])); } catch (e) {}
  }
  function publishCatalog() {
    if (typeof CATALOG === "undefined") return;
    CATALOG.forEach(ensureCat);
    window.TarkovHubCatalog = CATALOG;
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
        if (e.target.closest(".tool-pin")) return;
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
        var col = collapsedList();
        if (col.indexOf(cat) >= 0) col = col.filter(function (x) { return x !== cat; });
        else col.push(cat);
        setCollapsed(col);
        window.renderCatalog();
      };
    });
  }

  window.renderCatalog = function () {
    publishCatalog();
    if (typeof CATALOG === "undefined") return;

    var qEl = document.getElementById("q");
    var q = ((qEl && qEl.value) || "").toLowerCase().trim();
    var pins = typeof loadPins === "function" ? loadPins() : (function () {
      try { return JSON.parse(localStorage.getItem("tarkovHubPins") || "[]"); } catch (e) { return []; }
    })();
    var hidden = hiddenList();
    var collapsed = collapsedList();

    var list = CATALOG.filter(function (t) {
      return hidden.indexOf(t.file) < 0;
    }).map(ensureCat);

    if (q) {
      list = list.filter(function (t) {
        return (t.title + " " + (t.description || "") + " " + (t.cat || "")).toLowerCase().includes(q);
      });
    }

    var pinned = list.filter(function (t) { return pins.indexOf(t.file) >= 0; });
    var rest = list.filter(function (t) { return pins.indexOf(t.file) < 0; });
    pinned.sort(function (a, b) { return pins.indexOf(a.file) - pins.indexOf(b.file); });

    var count = document.getElementById("count");
    if (count) {
      count.textContent = list.length + " / " + CATALOG.length + (hidden.length ? " · скрыто " + hidden.length : "");
    }

    function group(arr) {
      var map = {};
      arr.forEach(function (t) {
        var c = t.cat || "other";
        if (!map[c]) map[c] = [];
        map[c].push(t);
      });
      return map;
    }

    var html = "";
    if (pinned.length) {
      html += '<section class="cat-section">' +
        '<div class="cat-head" data-cat="__pins__">' +
        '<span class="cat-title">📌 Закреплённые</span>' +
        '<span class="cat-count">' + pinned.length + '</span></div>' +
        '<div class="cat-body"><div class="grid">' +
        pinned.map(function (t) { return card(t, true); }).join("") +
        '</div></div></section>';
    }

    var groups = group(rest);
    CAT_ORDER.forEach(function (c) {
      var tools = groups[c];
      if (!tools || !tools.length) return;
      var isCol = !q && collapsed.indexOf(c) >= 0;
      html += '<section class="cat-section">' +
        '<div class="cat-head' + (isCol ? " is-collapsed" : "") + '" data-cat="' + c + '" role="button" tabindex="0">' +
        '<span class="cat-chevron">' + (isCol ? "▸" : "▾") + '</span>' +
        '<span class="cat-title">' + (CAT_TITLE[c] || c) + '</span>' +
        '<span class="cat-count">' + tools.length + '</span></div>' +
        '<div class="cat-body' + (isCol ? " is-collapsed" : "") + '"><div class="grid">' +
        tools.map(function (t) { return card(t, false); }).join("") +
        '</div></div></section>';
    });

    var host = document.getElementById("grid");
    if (host) {
      host.className = "catalog-root";
      host.innerHTML = html || '<p class="meta">Ничего не найдено</p>';
    }
    wireCards();
  };

  if (!window.TarkovTools) window.TarkovTools = {};
  if (!TarkovTools.hiddenTools) {
    TarkovTools.hiddenTools = hiddenList;
    TarkovTools.setHiddenTools = function (arr) {
      try { localStorage.setItem("tarkovHiddenTools", JSON.stringify(arr || [])); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent("tt-hidden-changed")); } catch (e) {}
    };
    TarkovTools.isToolHidden = function (f) { return hiddenList().indexOf(f) >= 0; };
  }
  if (!TarkovTools.collapsedCats) {
    TarkovTools.collapsedCats = collapsedList;
    TarkovTools.setCollapsedCats = setCollapsed;
  }

  window.addEventListener("tt-hidden-changed", function () {
    try { window.renderCatalog(); } catch (e) {}
  });
  window.addEventListener("tt-settings-applied", function () {
    try { window.renderCatalog(); } catch (e) {}
  });

  function boot() {
    publishCatalog();
    try { window.renderCatalog(); } catch (e) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); });
  } else {
    setTimeout(boot, 0);
  }
})();
