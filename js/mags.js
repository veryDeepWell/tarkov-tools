/*! Magazines — TarkovTableTool */
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


  var activeCal = "";

  function calLabel(cal) {
    try {
      if (window.TarkovDicts && TarkovDicts.caliberLabel) return TarkovDicts.caliberLabel(cal);
      if (window.TarkovDicts && TarkovDicts.calibers && TarkovDicts.calibers[cal])
        return TarkovDicts.calibers[cal].label || cal;
    } catch (e) {}
    return String(cal || "?").replace(/^Caliber/, "");
  }

  function paintCals(rows) {
    var box = document.getElementById("cals");
    if (!box) return;
    var map = {};
    rows.forEach(function (r) {
      map[r.cal] = (map[r.cal] || 0) + 1;
    });
    var cals = Object.keys(map).sort(function (a, b) {
      return calLabel(a).localeCompare(calLabel(b), "ru");
    });
    if (!activeCal && cals.length) activeCal = cals[0];
    box.innerHTML = cals
      .map(function (c) {
        var on = c === activeCal ? " active" : "";
        return (
          '<span class="chip' +
          on +
          '" data-cal="' +
          c +
          '">' +
          calLabel(c) +
          " (" +
          map[c] +
          ")</span>"
        );
      })
      .join("");
    box.querySelectorAll("[data-cal]").forEach(function (chip) {
      chip.onclick = function () {
        activeCal = chip.getAttribute("data-cal");
        box.querySelectorAll(".chip").forEach(function (x) {
          x.classList.toggle("active", x.getAttribute("data-cal") === activeCal);
        });
        if (window.render) window.render();
      };
    });
  }

  var hq = document.getElementById("hideQuest");
  if (hq)
    hq.addEventListener("change", function () {
      if (window.render) window.render();
    });
  var search = document.getElementById("search");
  if (search)
    search.addEventListener("input", function () {
      if (window.render) window.render();
    });

  var api = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#magsHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#search",
    defaultSort: "rating",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (activeCal && row.cal !== activeCal) return false;
      var hideQ = document.getElementById("hideQuest");
      if (hideQ && hideQ.checked && row.quest) return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Магазин",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "calLabel", label: "Калибр" },
      { key: "cap", label: "Cap", format: "num" },
      { key: "ergo", label: "Ergo", format: "num" },
      {
        key: "recoilPct",
        label: "Recoil%",
        html: function (r) {
          return r.recoilPct != null ? Number(r.recoilPct).toFixed(1) : "—";
        }
      },
      {
        key: "malfPct",
        label: "Malf%",
        html: function (r) {
          return r.malfPct != null ? Number(r.malfPct).toFixed(2) : "—";
        }
      },
      { key: "avg", label: "Flea", format: "num" },
      { key: "traderPrice", label: "Торговец", format: "num" },
      {
        key: "rating",
        label: "Score",
        html: function (r) {
          return "<strong>" + (r.rating != null ? Math.round(r.rating) : "—") + "</strong>";
        }
      }
    ],
    fetch: function (mode, API) {
      return API.items(mode);
    },
    mapItem: function (it, ctx) {
      var p = it.properties;
      if (!p || p.propertiesType !== "ItemPropertiesMagazine") return null;
      var byId = ctx.byId || {};
      var ammoIds = p.allowedAmmo || [];
      var cal = "?";
      for (var i = 0; i < ammoIds.length; i++) {
        var a = byId[ammoIds[i]];
        if (a && a.properties && a.properties.caliber) {
          cal = a.properties.caliber;
          break;
        }
      }
      var ergo = Number(p.ergonomics) || 0;
      var recoil = Number(p.recoilModifier) || 0;
      var malf = Number(p.malfunctionChance) || 0;
      var cap = Number(p.capacity) || 0;
      var buy = buyInfo(it);
      var avg = Number(it.avg24hPrice) || 0;
      var rating = cap * 1.2 + ergo * 2 + -recoil * 100 * 1.5 - malf * 50;
      return {
        id: it.id,
        slug: it.normalizedName || "",
        name: TarkovTableTool.itemName(it),
        icon: it.iconLink || it.gridImageLink || "",
        cal: cal,
        calLabel: calLabel(cal),
        cap: cap,
        ergo: ergo,
        recoil: recoil,
        recoilPct: recoil * 100,
        malf: malf,
        malfPct: malf * 100,
        avg: avg,
        traderPrice: buy.price,
        traderLL: buy.ll,
        traderKey: buy.traderKey,
        questName: buy.questName,
        quest: buy.quest,
        rating: rating
      };
    },
    onLoaded: function (info) {
      var f = document.getElementById("filters");
      var c = document.getElementById("tableCard");
      if (f) f.style.display = "block";
      if (c) c.style.display = "block";
      paintCals(info.rows || []);
    },
    afterPaint: function (list, ctx) {
      (ctx.tbody || document.getElementById("tbody")).querySelectorAll("tr").forEach(function (tr, i) {
        if (list[i]) applyGate(tr, list[i]);
      });
    }
  });

  // enrich fetch context with byId for caliber resolve
  var _fetch = api.load;
  // patch create's internal via wrapping loadBtn already bound — override map by pre-hook
  // TableTool mapItem gets ctx from forEach only with {mode} — need byId on all items
  // Rebind load
  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Mags…" });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var items = await TarkovAPI.items(mode);
      var byId = {};
      (items || []).forEach(function (it) {
        if (it && it.id) byId[it.id] = it;
      });
      var rows = [];
      (items || []).forEach(function (it) {
        var row = null;
        var p = it.properties;
        if (!p || p.propertiesType !== "ItemPropertiesMagazine") return;
        var ammoIds = p.allowedAmmo || [];
        var cal = "?";
        for (var i = 0; i < ammoIds.length; i++) {
          var a = byId[ammoIds[i]];
          if (a && a.properties && a.properties.caliber) {
            cal = a.properties.caliber;
            break;
          }
        }
        var ergo = Number(p.ergonomics) || 0;
        var recoil = Number(p.recoilModifier) || 0;
        var malf = Number(p.malfunctionChance) || 0;
        var cap = Number(p.capacity) || 0;
        var buy = buyInfo(it);
        var avg = Number(it.avg24hPrice) || 0;
        rows.push({
          id: it.id,
          slug: it.normalizedName || "",
          name: TarkovTableTool.itemName(it),
          icon: it.iconLink || it.gridImageLink || "",
          cal: cal,
          calLabel: calLabel(cal),
          cap: cap,
          ergo: ergo,
          recoil: recoil,
          recoilPct: recoil * 100,
          malf: malf,
          malfPct: malf * 100,
          avg: avg,
          traderPrice: buy.price,
          traderLL: buy.ll,
          traderKey: buy.traderKey,
          questName: buy.questName,
          quest: buy.quest,
          rating: cap * 1.2 + ergo * 2 + -recoil * 100 * 1.5 - malf * 50
        });
      });
      api.setRows(rows);
      paintCals(rows);
      var f = document.getElementById("filters");
      var c = document.getElementById("tableCard");
      if (f) f.style.display = "block";
      if (c) c.style.display = "block";
      if (status) {
        status.className = "status ok";
        status.textContent = "Магазинов: " + rows.length;
      }
      if (P) P.done("OK");
    } catch (e) {
      if (status) {
        status.className = "status err";
        status.textContent = e.message || String(e);
      }
      if (P) P.fail(e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
})();
