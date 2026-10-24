/*! item-card — R3.1a header, stats, prices, traders + gate */
(function () {
  "use strict";

  var items = [];
  var selectedId = "";
  var graphReady = false;

  function esc(s) {
    return window.TarkovDicts && TarkovDicts.esc ? TarkovDicts.esc(s) : String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmt(n) {
    if (n == null || !isFinite(Number(n))) return "—";
    return window.TarkovDicts && TarkovDicts.fmtNum ? TarkovDicts.fmtNum(n) : String(Math.round(Number(n)));
  }
  function setStatus(msg, tone) {
    var el = document.getElementById("status");
    if (!el) return;
    el.textContent = msg;
    el.className = "status" + (tone ? " " + tone : "");
  }
  function mode() {
    var el = document.getElementById("gameMode");
    return (el && el.value) || "pve";
  }
  function queryItemId() {
    try {
      var sp = new URLSearchParams(location.search);
      return sp.get("item") || sp.get("id") || "";
    } catch (e) { return ""; }
  }
  function setUrlItem(id) {
    try {
      var sp = new URLSearchParams(location.search);
      if (id) sp.set("item", id); else sp.delete("item");
      sp.delete("id");
      history.replaceState(null, "", location.pathname + (sp.toString() ? "?" + sp.toString() : "") + location.hash);
    } catch (e) {}
  }
  function emptyLi(text) {
    return '<li class="meta">' + esc(text || "—") + "</li>";
  }
  function fillList(elId, rows, fmtRow) {
    var el = document.getElementById(elId);
    if (!el) return;
    if (!rows || !rows.length) { el.innerHTML = emptyLi("нет связей"); return; }
    el.innerHTML = rows.map(fmtRow).join("");
  }

  function traderLabel(t) {
    if (t == null) return "?";
    if (window.TarkovDicts && TarkovDicts.traderName) return TarkovDicts.traderName(t) || String(t);
    return String(t);
  }

  function renderStats(item) {
    var grid = document.getElementById("statGrid");
    if (!grid) return;
    var stats = window.TarkovItemCard && TarkovItemCard.stats ? TarkovItemCard.stats(item) : [];
    if (!stats.length) {
      grid.innerHTML = '<div class="meta">Нет ключевых статов для этого типа</div>';
      return;
    }
    grid.innerHTML = stats.map(function (s) {
      return '<div class="stat"><div class="v">' + esc(String(s.value)) + esc(s.suffix || "") +
        '</div><div class="l">' + esc(s.label) + "</div></div>";
    }).join("");
  }

  function renderPrices(item) {
    var grid = document.getElementById("priceGrid");
    var note = document.getElementById("priceNote");
    if (!grid) return;
    var p = window.TarkovItemCard && TarkovItemCard.prices ? TarkovItemCard.prices(item) : {};
    var cells = [];
    cells.push({ l: "Flea", v: p.flea != null ? fmt(p.flea) : "—" });
    cells.push({ l: "Avg 24h", v: p.avg24h != null ? fmt(p.avg24h) : "—" });
    cells.push({ l: "Last low", v: p.lastLow != null ? fmt(p.lastLow) : "—" });
    cells.push({ l: "Flea tax", v: p.fleaTax != null ? fmt(p.fleaTax) : "—" });
    if (p.bestBuy) {
      cells.push({ l: "Best buy", v: fmt(p.bestBuy.price) });
      cells.push({
        l: "Best trader",
        v: (p.bestBuy.traderName || p.bestBuy.name || traderLabel(p.bestBuy.traderKey || p.bestBuy.trader) || "?") +
          (p.bestBuy.ll ? " LL" + p.bestBuy.ll : "")
      });
    }
    grid.innerHTML = cells.map(function (c) {
      return '<div class="stat"><div class="v">' + esc(c.v) + '</div><div class="l">' + esc(c.l) + "</div></div>";
    }).join("");
    if (note) {
      var ban = item && (item.types || []).indexOf("noFlea") >= 0;
      note.textContent = ban ? "Ограничение: noFlea / не на барахолке" : "";
    }
  }

  function renderTraders(item) {
    var tbody = document.getElementById("tbodyTraders");
    if (!tbody) return;
    tbody.innerHTML = "";
    var offers = (item && (item.buyFromTrader || item.buyFor)) || [];
    if (!offers.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="meta">Нет офферов</td></tr>';
      return;
    }
    offers.forEach(function (o) {
      if (!o) return;
      var price = o.priceRUB != null ? o.priceRUB : o.price;
      var tr = document.createElement("tr");
      var gate = { locked: false, reason: "" };
      if (window.TarkovProfile) {
        try {
          if (TarkovProfile.offerGate) gate = TarkovProfile.offerGate(o);
          else if (TarkovProfile.gate) {
            var meta = TarkovProfile.offerMeta ? TarkovProfile.offerMeta(o) : {};
            gate = TarkovProfile.gate({
              trader: meta.traderKey || (o.trader && (o.trader.id || o.trader)),
              minLL: meta.minLL != null ? meta.minLL : (o.minTraderLevel || o.loyaltyLevel),
              questLocked: meta.questLocked != null ? meta.questLocked : !!o.taskUnlock,
              questName: meta.questName || ""
            });
          }
        } catch (eG) {}
      }
      if (window.TarkovProfile && TarkovProfile.lockVisibility && TarkovProfile.lockVisibility(gate) === "hide") {
        return;
      }
      var tName = traderLabel(o.trader || o.vendor);
      var ll = o.minTraderLevel || o.loyaltyLevel || o.ll || "—";
      var quest = o.taskUnlock
        ? (typeof o.taskUnlock === "object" ? (o.taskUnlock.name || o.taskUnlock.id) : o.taskUnlock)
        : "";
      tr.innerHTML =
        "<td>" + esc(tName) + "</td>" +
        "<td>" + esc(String(ll)) + "</td>" +
        "<td><strong>" + (price != null ? fmt(price) : "—") + "</strong></td>" +
        "<td>" + (quest ? '<span class="tag quest">' + esc(String(quest)) + "</span>" : "—") + "</td>" +
        "<td class=\"meta\">" + (gate.locked ? esc(gate.reason || "locked") : "ok") + "</td>";
      tbody.appendChild(tr);
      if (window.TarkovProfile && TarkovProfile.applyLockToElement) {
        TarkovProfile.applyLockToElement(tr, gate);
      }
    });
    if (!tbody.children.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="meta">Скрыто фильтром профиля</td></tr>';
    }
  }

  function showCard(itemId) {
    if (!window.TarkovItemGraph || !graphReady) {
      setStatus("Сначала загрузи базу", "err");
      return;
    }
    selectedId = String(itemId || "");
    if (!selectedId) return;
    var c = TarkovItemGraph.card(selectedId);
    var item = c.item || TarkovItemGraph.get(selectedId);
    setUrlItem(selectedId);

    var panel = document.getElementById("cardPanel");
    if (panel) panel.style.display = "block";

    document.getElementById("cardName").textContent = c.name || selectedId;
    document.getElementById("cardId").textContent = selectedId;
    var types = (c.types || (item && item.types) || []).join(", ");
    document.getElementById("cardMeta").textContent =
      (c.normalizedName || (item && item.normalizedName) || "") + (types ? " · " + types : "");

    var icon = document.getElementById("cardIcon");
    var itemIcon = "";
    try { itemIcon = window.TarkovItemMedia && TarkovItemMedia.icon ? TarkovItemMedia.icon(item) : ""; } catch (eIcon) {}
    itemIcon = itemIcon || c.icon || (item && (item.displayIconLink || item.iconLink || item.gridImageLink || item.image512pxLink)) || "";
    if (itemIcon) {
      icon.src = itemIcon;
      icon.style.display = "";
      icon.onerror = function () { icon.onerror = null; icon.style.display = "none"; };
    } else {
      icon.style.display = "none";
    }

    var wiki = document.getElementById("cardWiki");
    if (wiki) {
      var w = window.TarkovItemCard && TarkovItemCard.wikiUrl ? TarkovItemCard.wikiUrl(item) : "";
      if (w) {
        wiki.href = w;
        wiki.style.display = "";
      } else {
        wiki.style.display = "none";
      }
    }

    renderStats(item);
    renderPrices(item);
    renderTraders(item);

    var L = c.links;
    fillList("listSold", L.soldBy, function (o) {
      return "<li>" + esc(traderLabel(o.trader)) +
        (o.minTraderLevel ? " LL" + o.minTraderLevel : "") +
        (o.price != null ? " · " + fmt(o.price) : "") + "</li>";
    });
    function taskLabel(tid) {
      return (window.TarkovItemGraph && TarkovItemGraph.taskName)
        ? TarkovItemGraph.taskName(tid) : tid;
    }
    function craftLab(ck) {
      return (window.TarkovItemGraph && TarkovItemGraph.craftLabel)
        ? TarkovItemGraph.craftLabel(ck) : ck;
    }
    var questsHref = "tarkovtool-quests.html";
    var craftsHref = "tarkovtool-crafts.html";
    var hideoutHref = "tarkovtool-hideout.html";
    var barterHref = "tarkovtool-barter-opt.html";

    fillList("listQuestUse", L.questsUsing, function (o) {
      var taskId = String(o.taskId || "");
      var name = taskLabel(taskId);
      return '<li><a class="item-link" href="' + questsHref + '">' + esc(name) + '</a>' +
        ' <code>' + esc(taskId.slice(0, 8)) + (taskId.length > 8 ? "…" : "") + '</code> · ' +
        esc(o.objectiveType || "") + (o.count ? " ×" + esc(o.count) : "") + "</li>";
    });
    fillList("listQuestReward", L.questsRewarding, function (tid) {
      tid = String(tid || "");
      return '<li><a class="item-link" href="' + questsHref + '">' + esc(taskLabel(tid)) +
        '</a> <code>' + esc(tid.slice(0, 8)) + (tid.length > 8 ? "…" : "") + "</code></li>";
    });
    fillList("listCraftIn", L.craftsAsInput, function (o) {
      return '<li><a class="item-link" href="' + craftsHref + '">' + esc(craftLab(o.craftKey)) +
        '</a> · требуется ×' + esc(o.count || 1) + '</li>';
    });
    fillList("listCraftOut", L.craftsAsProduct, function (o) {
      return '<li><a class="item-link" href="' + craftsHref + '">' + esc(craftLab(o.craftKey)) +
        '</a> · результат ×' + esc(o.count || 1) + '</li>';
    });
    fillList("listBarterIn", L.bartersAsInput, function (o) {
      var tr = o.trader ? (window.TarkovDicts && TarkovDicts.traderName ? TarkovDicts.traderName(o.trader) : o.trader) : "";
      return '<li><a class="item-link" href="' + barterHref + '">' + esc(tr || "Обмен") +
        '</a> · требуется ×' + esc(o.count || 1) + ' <code>' + esc(String(o.barterKey || "").slice(0, 12)) + '</code></li>';
    });
    fillList("listBarterOut", L.bartersAsReward, function (o) {
      var tr = o.trader ? (window.TarkovDicts && TarkovDicts.traderName ? TarkovDicts.traderName(o.trader) : o.trader) : "";
      return '<li><a class="item-link" href="' + barterHref + '">' + esc(tr || "Обмен") +
        '</a> · награда ×' + esc(o.count || 1) + ' <code>' + esc(String(o.barterKey || "").slice(0, 12)) + '</code></li>';
    });
    fillList("listHideout", L.hideoutRequiring, function (o) {
      var label = (o.stationName || o.stationId || "Убежище") + (o.level != null ? " · уровень " + o.level : "");
      return '<li><a class="item-link" href="' + hideoutHref + '">' + esc(label) +
        '</a> · требуется ×' + esc(o.count || 1) + "</li>";
    });

    function itemLabel(iid) {
      var it = TarkovItemGraph.get(iid);
      if (!it) return iid;
      try { if (window.TarkovItemMedia && TarkovItemMedia.name) return TarkovItemMedia.name(it); } catch (e) {}
      try { if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it); } catch (e2) {}
      return it.shortName || it.name || it.normalizedName || iid;
    }
    function itemLi(iid) {
      var href = TarkovItemGraph.href(iid);
      return '<li><a class="item-link" href="' + href + '">' + esc(itemLabel(iid)) +
        '</a> <code>' + esc(String(iid).slice(0, 8)) + '…</code></li>';
    }

    fillList("listFamily", (L.family || []).slice(0, 30), function (iid) { return itemLi(iid); });
    fillList("listAmmo", (L.ammoFor || []).slice(0, 25), function (iid) { return itemLi(iid); });
    fillList("listMags", (L.magsFor || []).slice(0, 25), function (iid) { return itemLi(iid); });
    fillList("listMods", (L.modsFor || []).slice(0, 25), function (iid) { return itemLi(iid); });

    setStatus("Узел: " + (c.name || selectedId), "ok");
  }

  function filterSuggest(q) {
    q = String(q || "").toLowerCase().trim();
    var box = document.getElementById("suggest");
    if (!box) return;
    if (!q || q.length < 2) { box.style.display = "none"; box.innerHTML = ""; return; }
    var hits = [];
    for (var i = 0; i < items.length && hits.length < 20; i++) {
      var it = items[i];
      if (!it || !it.id) continue;
      var hay = ((it.name || "") + " " + (it.shortName || "") + " " + (it.normalizedName || "") + " " + it.id).toLowerCase();
      if (hay.indexOf(q) >= 0) hits.push(it);
    }
    if (!hits.length) { box.style.display = "none"; return; }
    box.style.display = "block";
    box.innerHTML = hits.map(function (it) {
      var name = itemLabel(it.id);
      var image = "";
      try { image = window.TarkovItemMedia && TarkovItemMedia.icon ? TarkovItemMedia.icon(it) : ""; } catch (e) {}
      image = image || it.displayIconLink || it.iconLink || it.gridImageLink || it.image512pxLink || "";
      return '<div data-id="' + esc(it.id) + '" data-item-id="' + esc(it.id) + '" data-item-name="' + esc(name) + '" title="Двойной клик — быстрый просмотр предмета">' +
        (image ? '<img class="ico" src="' + esc(image) + '" alt="" loading="lazy" onerror="this.hidden=true">' : "") +
        "<span>" + esc(name) + "</span></div>";
    }).join("");
    box.querySelectorAll("div[data-id]").forEach(function (row) {
      row.addEventListener("click", function () {
        box.style.display = "none";
        showCard(row.getAttribute("data-id"));
      });
    });
  }

  async function loadBase() {
    var btn = document.getElementById("loadBtn");
    if (btn) btn.disabled = true;
    var __ttProgress = window.TarkovUI && TarkovUI.progress;
    if (__ttProgress) {
      try {
        __ttProgress.start({ label: "Loading…", indeterminate: true });
      } catch (e0) {}
    }
    setStatus("Загрузка items / tasks / crafts…");
    try {
      var m = mode();
      var pack = await Promise.all([
        TarkovAPI.items(m),
        TarkovAPI.tasks(m),
        TarkovAPI.crafts(m),
        TarkovAPI.barters ? TarkovAPI.barters(m) : Promise.resolve([]),
        TarkovAPI.hideout ? TarkovAPI.hideout(m) : Promise.resolve([])
      ]);
      items = Array.isArray(pack[0]) ? pack[0] : [];
      TarkovItemGraph.build({
        items: items,
        tasks: Array.isArray(pack[1]) ? pack[1] : [],
        crafts: Array.isArray(pack[2]) ? pack[2] : [],
        barters: Array.isArray(pack[3]) ? pack[3] : [],
        hideout: Array.isArray(pack[4]) ? pack[4] : []
      });
      graphReady = true;
      if (__ttProgress) try { __ttProgress.done("OK"); } catch (e1) {}
      setStatus("База: " + items.length + " items", "ok");
      var fromUrl = queryItemId();
      if (fromUrl) showCard(fromUrl);
    } catch (e) {
      try { if (__ttProgress) __ttProgress.fail(e && e.message ? e.message : "Error"); } catch (e2) {}
      setStatus("Ошибка: " + (e && e.message ? e.message : e), "err");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.getElementById("loadBtn").addEventListener("click", loadBase);
  document.getElementById("openBtn").addEventListener("click", function () {
    var q = document.getElementById("q").value.trim();
    if (!q) return;
    if (graphReady && TarkovItemGraph.get(q)) { showCard(q); return; }
    var hit = items.find(function (it) {
      return it.id === q || it.normalizedName === q || it.shortName === q;
    });
    if (hit) showCard(hit.id);
    else setStatus("Не найден: " + q, "err");
  });
  document.getElementById("q").addEventListener("input", function () {
    filterSuggest(document.getElementById("q").value);
  });

  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
    } catch (e0) {}
    if (selectedId && graphReady) {
      try { showCard(selectedId); } catch (e1) {}
    }
  };
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () { window.render(); });
  }
  try {
    if (window.TarkovProfile && TarkovProfile.bindGameMode) {
      TarkovProfile.bindGameMode("gameMode", { fallback: "pve" });
    }
  } catch (e) {}

  try {
    var requestedMode = new URLSearchParams(location.search).get("mode");
    var modeControl = document.getElementById("gameMode");
    if (modeControl && (requestedMode === "pve" || requestedMode === "regular" || requestedMode === "pvp-season")) modeControl.value = requestedMode;
  } catch (eMode) {}
  if (queryItemId()) loadBase();
})();
