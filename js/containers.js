/*! Containers (rigs/backpacks) — TarkovTableTool */
(function () {
  "use strict";

  function buyInfo(it) {
    var b = null;
    try {
      if (window.TarkovItemDomain && TarkovItemDomain.bestBuy)
        b = TarkovItemDomain.bestBuy(it, { sources: "buyFromTrader", allowQuest: true });
    } catch (e) {}
    if (!b) return { price: 0, ll: 0, quest: false, traderKey: "", questName: "" };
    return {
      price: Number(b.price != null ? b.price : b.priceRUB) || 0,
      ll: Number(b.minLL != null ? b.minLL : b.minTraderLevel) || 0,
      quest: !!(b.questLocked || b.taskUnlock),
      traderKey: b.traderKey || "",
      questName: b.questName || ""
    };
  }
  function applyGate(tr, r) {
    if (!window.TarkovProfile || !TarkovProfile.gate || !TarkovProfile.applyLockToElement) return;
    try {
      var g = TarkovProfile.gate({
        trader: r.traderKey,
        minLL: r.traderLL || r.ll,
        questLocked: r.quest,
        questName: r.questName
      });
      TarkovProfile.applyLockToElement(tr, g);
    } catch (e) {}
  }


  var tab = "rig";

  function segmentScore(grids) {
    if (!grids || !grids.length) return 0;
    var cells = grids.map(function (g) {
      return (g.width || 0) * (g.height || 0);
    });
    var total = cells.reduce(function (s, n) {
      return s + n;
    }, 0);
    if (!total) return 0;
    var max = Math.max.apply(null, cells);
    return Math.round((max / total) * 100);
  }

  function mobilityScore(p) {
    var turn = Number(p.turnPenalty) || 0;
    var move = Number(p.movePenalty) || 0;
    var ergo = Number(p.ergonomics) || 0;
    return Math.round(-turn * 2 - move * 2 + ergo);
  }

  function buildRow(it, kind) {
    var p = it.properties || {};
    var grids = p.grids || [];
    var capacity =
      Number(p.capacity) ||
      grids.reduce(function (s, g) {
        return s + (g.width || 0) * (g.height || 0);
      }, 0);
    var weight = Number(it.weight) || 0;
    var spk = weight > 0.01 ? capacity / weight : capacity * 10;
    var buy = buyInfo(it);
    var avg = Number(it.avg24hPrice) || 0;
    return {
      id: it.id,
      kind: kind,
      slug: it.normalizedName || "",
      name: TarkovTableTool.itemName(it),
      icon: it.iconLink || it.gridImageLink || "",
      capacity: capacity,
      weight: weight,
      spk: spk,
      seg: segmentScore(grids),
      grids: grids.length,
      mob: mobilityScore(p),
      avg: avg,
      traderPrice: buy.price,
      traderLL: buy.ll,
      traderKey: buy.traderKey,
      questName: buy.questName,
      quest: buy.quest,
      armorClass: Number(p.class) || Number(p.armorClass) || 0,
      plateSlots: (p.armorPlateSlots && p.armorPlateSlots.length) || 0
    };
  }

  document.querySelectorAll("#tabs [data-tab], #tabs .tab").forEach(function (el) {
    el.addEventListener("click", function () {
      var t = el.getAttribute("data-tab") || el.dataset.tab;
      if (!t) {
        if (/rig|разгруз/i.test(el.textContent)) t = "rig";
        else if (/back|рюкзак/i.test(el.textContent)) t = "backpack";
      }
      if (!t) return;
      tab = t;
      document.querySelectorAll("#tabs .tab, #tabs [data-tab]").forEach(function (x) {
        x.classList.toggle("active", x === el);
      });
      var title = document.getElementById("tableTitle");
      if (title) title.textContent = tab === "rig" ? "Разгрузки" : "Рюкзаки";
      var wrap = document.getElementById("armorFilterWrap");
      if (wrap) wrap.style.display = tab === "rig" ? "" : "none";
      if (window.render) window.render();
    });
  });

  ["search", "minSlots", "hideQuest", "onlyArmorRig"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      if (window.render) window.render();
    });
    el.addEventListener("change", function () {
      if (window.render) window.render();
    });
  });

  var api = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#contHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#search",
    defaultSort: "spk",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (row.kind !== tab) return false;
      var minSlots = Number((document.getElementById("minSlots") || {}).value) || 0;
      if (row.capacity < minSlots) return false;
      var hideQuest = document.getElementById("hideQuest");
      if (hideQuest && hideQuest.checked && row.quest) return false;
      var onlyArmor = document.getElementById("onlyArmorRig");
      if (tab === "rig" && onlyArmor && onlyArmor.checked && !row.plateSlots && !row.armorClass)
        return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Предмет",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "capacity", label: "Слоты", format: "num" },
      { key: "weight", label: "Вес", format: "fixed2" },
      {
        key: "spk",
        label: "Слот/кг",
        html: function (r) {
          return r.spk != null ? Number(r.spk).toFixed(1) : "—";
        }
      },
      { key: "seg", label: "Сегм%", format: "num" },
      { key: "mob", label: "Mob", format: "num" },
      { key: "avg", label: "Flea", format: "num" },
      { key: "traderPrice", label: "Торговец", format: "num" },
      {
        key: "quest",
        label: "Quest",
        html: function (r) {
          return r.quest ? "✓" : "";
        }
      }
    ],
    fetch: function (mode, API) {
      return API.items(mode);
    },
    mapItem: function (it) {
      var p = it.properties;
      if (!p || typeof p !== "object") return null;
      if (p.propertiesType === "ItemPropertiesChestRig") return buildRow(it, "rig");
      if (p.propertiesType === "ItemPropertiesBackpack") return buildRow(it, "backpack");
      return null;
    },
    onLoaded: function (info) {
      document.getElementById("tabs") && (document.getElementById("tabs").style.display = "flex");
      document.getElementById("filtersCard") &&
        (document.getElementById("filtersCard").style.display = "block");
      document.getElementById("tableCard") &&
        (document.getElementById("tableCard").style.display = "block");
    },
    afterPaint: function (list, ctx) {
      var tb = ctx.tbody;
      if (!tb) return;
      tb.querySelectorAll("tr").forEach(function (tr, i) {
        if (list[i]) applyGate(tr, list[i]);
      });
    }
  });


  window.render = function () {
    try {
      if (window.TarkovProfile && TarkovProfile.wireToolPage) TarkovProfile.wireToolPage();
    } catch (e0) {}
    try {
      if (typeof api !== "undefined" && api && typeof api.setRows === "function") {
        if (typeof api.getRows === "function") api.setRows(api.getRows());
        else if (typeof api.paint === "function") api.paint();
      }
    } catch (e1) {}
  };
  if (window.TarkovProfile && TarkovProfile.bindRefresh) {
    TarkovProfile.bindRefresh(function () {
      window.render();
    });
  }

})();
