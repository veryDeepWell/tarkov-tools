/*! Hub categories + hidden tools overlay */
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
    window.TarkovHubCatalog = CATALOG.slice();
  }

  const origRender = typeof renderCatalog === "function" ? renderCatalog : null;
  if (!origRender) { console.warn("[tt-cats] renderCatalog not found"); return; }

  window.renderCatalog = function () {
    publishCatalog();
    const qEl = document.getElementById("q");
    const q = ((qEl && qEl.value) || "").toLowerCase().trim();
    const pins = typeof loadPins === "function" ? loadPins() : (function () {
      try { return JSON.parse(localStorage.getItem("tarkovHubPins") || "[]"); } catch (e) { return []; }
    })();
    const hidden = hiddenList();
    let list = CATALOG.filter(function (t) { return hidden.indexOf(t.file) < 0; }).map(ensureCat);
    if (q) list = list.filter(function (t) {
      return (t.title + " " + (t.description || "") + " " + (t.cat || "")).toLowerCase().includes(q);
    });
    const pinned = list.filter(function (t) { return pins.indexOf(t.file) >= 0; });
    const rest = list.filter(function (t) { return pins.indexOf(t.file) < 0; });
    pinned.sort(function (a, b) { return pins.indexOf(a.file) - pins.indexOf(b.file); });
    const count = document.getElementById("count");
    if (count) count.textContent = list.length + " / " + CATALOG.length + (hidden.length ? " · скрыто " + hidden.length : "");

    const collapsed = collapsedList();
    function group(arr) {
      const map = {};
      arr.forEach(function (t) { const c = t.cat || "other"; if (!map[c]) map[c] = []; map[c].push(t); });
      return map;
    }
    const card = typeof cardHtml === "function" ? cardHtml : function (t) {
      return '<div class="tool" data-open="' + t.file + '"><h2>' + (t.title || t.file) + '</h2></div>';
    };

    let html = "";
    if (pinned.length) {
      html += '<div class="cat-head" data-cat="__pins__"><span class="cat-title">📌 Закреплённые</span><span class="cat-count">' + pinned.length + '</span></div>';
      html += '<div class="cat-body" data-body="__pins__"><div class="grid">' + pinned.map(function (t) { return card(t, true); }).join("") + '</div></div>';
    }
    const groups = group(rest);
    CAT_ORDER.forEach(function (c) {
      const tools = groups[c];
      if (!tools || !tools.length) return;
      const isCol = collapsed.indexOf(c) >= 0 && !q;
      html += '<div class="cat-head' + (isCol ? " collapsed" : "") + '" data-cat="' + c + '"><span class="cat-chevron">' + (isCol ? "▸" : "▾") + '</span><span class="cat-title">' + (CAT_TITLE[c] || c) + '</span><span class="cat-count">' + tools.length + '</span></div>';
      html += '<div class="cat-body' + (isCol ? " is-collapsed" : "") + '" data-body="' + c + '"><div class="grid">' + tools.map(function (t) { return card(t, false); }).join("") + '</div></div>';
    });

    const gridHost = document.getElementById("grid");
    if (gridHost) gridHost.innerHTML = html || '<p class="meta">Ничего не найдено</p>';

    document.querySelectorAll(".tool-pin").forEach(function (btn) {
      btn.onclick = function (e) { if (typeof togglePin === "function") togglePin(btn.getAttribute("data-pin"), e); };
    });
    document.querySelectorAll(".tool[data-open]").forEach(function (cardEl) {
      cardEl.onclick = function (e) {
        if (e.target.closest(".tool-pin")) return;
        const f = cardEl.getAttribute("data-open");
        if (e.ctrlKey || e.metaKey) { window.open(f, "_blank"); return; }
        if (typeof openToolAsMini === "function") openToolAsMini(f); else window.location.href = f;
      };
    });
    document.querySelectorAll(".cat-head[data-cat]").forEach(function (head) {
      const cat = head.getAttribute("data-cat");
      if (cat === "__pins__") return;
      head.onclick = function () {
        let col = collapsedList();
        if (col.indexOf(cat) >= 0) col = col.filter(function (x) { return x !== cat; });
        else col.push(cat);
        setCollapsed(col);
        window.renderCatalog();
      };
    });
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

  window.addEventListener("tt-hidden-changed", function () { try { window.renderCatalog(); } catch (e) {} });
  window.addEventListener("tt-settings-applied", function () { try { window.renderCatalog(); } catch (e) {} });

  publishCatalog();
  try { window.renderCatalog(); } catch (e) {}
})();
