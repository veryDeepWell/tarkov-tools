/*! Trader flip — TarkovTableTool */
(function () {
  "use strict";

  var activeTypes = null;

  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }
  function formatNum(n) {
    return TarkovTableTool.fmtNum(n);
  }
  function traderLabel(key) {
    try {
      if (window.TarkovDicts && TarkovDicts.traderName) return TarkovDicts.traderName(key) || key;
    } catch (e) {}
    return key || "";
  }
  function profileLevels() {
    var levels = {};
    try {
      if (window.TarkovProfile && TarkovProfile.getActive) {
        var p = TarkovProfile.getActive();
        if (p && p.traders) levels = Object.assign({}, p.traders);
      }
    } catch (e) {}
    return levels;
  }

  ["minProfit", "minRoi", "minOffers", "search", "hideQuest"].forEach(function (id) {
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
    thead: "#tfHead",
    status: "#status",
    loadBtn: "#fetchBtn",
    search: "#search",
    defaultSort: "profit",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      var minProfit = Number((document.getElementById("minProfit") || {}).value) || 0;
      var minRoi = Number((document.getElementById("minRoi") || {}).value) || 0;
      var minOffers = Number((document.getElementById("minOffers") || {}).value) || 0;
      if (row.profit < minProfit) return false;
      if (row.roi < minRoi) return false;
      if (row.offers < minOffers) return false;
      var hideQuest = document.getElementById("hideQuest");
      if (hideQuest && hideQuest.checked && row.quest) return false;
      if (row._gate && row._gate.locked && window.TarkovProfile && TarkovProfile.lockVisibility) {
        if (TarkovProfile.lockVisibility(row._gate) === "hide") return false;
      }
      if (activeTypes && activeTypes.size) {
        var ok = false;
        (row.typesArr || []).forEach(function (ty) {
          if (activeTypes.has(ty)) ok = true;
        });
        if (!ok && (row.typesArr || []).length) return false;
      }
      if (!q) return true;
      var hay = (row.name + " " + row.shortName + " " + row.normalizedName).toLowerCase();
      return hay.indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Предмет",
        html: function (r, h) {
          return TarkovTableTool.nameCell(
            { name: r.name, slug: r.normalizedName || r.shortName, icon: r.icon },
            h
          );
        }
      },
      {
        key: "trader",
        label: "Торговец",
        html: function (r) {
          return traderLabel(r.traderKey);
        }
      },
      { key: "ll", label: "УЛ", format: "num" },
      {
        key: "quest",
        label: "Quest",
        html: function (r) {
          return r.quest ? "✓" : "";
        }
      },
      { key: "traderPrice", label: "Buy", format: "num" },
      { key: "avg24h", label: "avg24", format: "num" },
      { key: "profit", label: "Profit", format: "num" },
      {
        key: "roi",
        label: "ROI%",
        html: function (r) {
          return isFinite(r.roi) ? Number(r.roi).toFixed(1) : "—";
        }
      },
      { key: "offers", label: "Offers", format: "num" }
    ],
    fetch: function () {
      return Promise.resolve([]);
    },
    mapItem: function () {
      return null;
    },
    afterPaint: function (list, ctx) {
      var tb = ctx.tbody;
      if (!tb) return;
      list.forEach(function (r, i) {
        var tr = tb.querySelectorAll("tr")[i];
        if (!tr || !r._gate) return;
        try {
          if (window.TarkovProfile && TarkovProfile.applyLockToElement)
            TarkovProfile.applyLockToElement(tr, r._gate);
        } catch (e) {}
      });
    }
  });

  document.getElementById("fetchBtn").onclick = async function () {
    var fetchBtn = document.getElementById("fetchBtn");
    var statusEl = document.getElementById("status");
    if (fetchBtn) fetchBtn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Trader flip…", indeterminate: true });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var intel3 = !!(document.getElementById("intel3") || {}).checked;
      var hmLvl = Number((document.getElementById("hmLvl") || {}).value) || 0;
      var taxOpts = { intelCenter3: intel3, hideoutManagementLevel: hmLvl };
      var levels = profileLevels();

      var items = await TarkovAPI.items(mode);
      var rawRows = [];
      (items || []).forEach(function (item) {
        var offers = item.buyFromTrader;
        if (!Array.isArray(offers) || !offers.length) return;
        var avg = item.avg24hPrice || 0;
        var lastLow = item.lastLowPrice || 0;
        if (!avg && !lastLow) return;
        var name = TarkovTableTool.itemName(item);
        var typesArr = item.types || [];
        var offersCount = item.lastOfferCount || 0;

        offers.forEach(function (offer) {
          var traderRaw = offer.trader;
          if (traderRaw && typeof traderRaw === "object")
            traderRaw = traderRaw.id || traderRaw.key || "";
          var traderKey = String(traderRaw || "").toLowerCase();
          try {
            if (window.TarkovProfile && TarkovProfile.offerMeta) {
              var meta = TarkovProfile.offerMeta(offer);
              if (meta.traderKey) traderKey = String(meta.traderKey).toLowerCase();
            }
          } catch (eM) {}
          if (!traderKey || traderKey === "fence") return;
          // mongo id → try dicts
          if (traderKey.length > 20 && window.TarkovDicts && TarkovDicts.traders) {
            var hit = TarkovDicts.traders.find(function (x) {
              return x.id === offer.trader || x.id === traderKey;
            });
            if (hit && hit.key) traderKey = hit.key;
          }

          var reqLL = Number(offer.minTraderLevel) || 1;
          var myLL = levels[traderKey] != null ? Number(levels[traderKey]) : 1;
          if (myLL < 1) myLL = 1;

          var traderPrice =
            offer.priceRUB != null ? Number(offer.priceRUB) : Number(offer.price);
          if (!traderPrice || traderPrice <= 0) return;

          var fleaRef = avg || lastLow;
          var basePrice = Number(item.basePrice) || 0;
          var result =
            window.TarkovItemDomain && TarkovItemDomain.evaluateProfit
              ? TarkovItemDomain.evaluateProfit(basePrice, fleaRef, 1, traderPrice, taxOpts)
              : {
                  tax: 0,
                  revenue: fleaRef,
                  profit: fleaRef - traderPrice,
                  roi: traderPrice ? ((fleaRef - traderPrice) / traderPrice) * 100 : 0
                };

          var tu = offer.taskUnlock;
          var questLocked = tu != null && tu !== "" && tu !== false;
          var questName = "";
          if (questLocked) {
            questName =
              typeof tu === "object" ? String(tu.name || tu.id || "") : String(tu);
          }

          var gateRes = null;
          if (window.TarkovProfile && TarkovProfile.gate) {
            gateRes = TarkovProfile.gate({
              trader: traderKey,
              minLL: reqLL,
              questLocked: questLocked,
              questName: questName
            });
          }

          rawRows.push({
            id: item.id,
            name: name,
            shortName: item.shortName || "",
            normalizedName: item.normalizedName || "",
            icon: item.iconLink || item.gridImageLink || "",
            traderKey: traderKey,
            ll: reqLL,
            quest: questLocked,
            questName: questName,
            traderPrice: traderPrice,
            avg24h: avg,
            lastLow: lastLow,
            offers: offersCount,
            profit: Math.round(result.profit),
            roi: result.roi,
            typesArr: typesArr,
            _gate: gateRes
          });
        });
      });

      api.setRows(rawRows);
      var card = document.getElementById("resultsCard");
      if (card) card.style.display = "block";
      if (statusEl) {
        statusEl.className = "status ok";
        statusEl.textContent = "Офферов: " + rawRows.length;
      }
      if (P) P.done();
    } catch (e) {
      console.error(e);
      if (statusEl) {
        statusEl.className = "status err";
        statusEl.textContent = e.message || String(e);
      }
      if (P) P.fail(e.message);
    } finally {
      if (fetchBtn) fetchBtn.disabled = false;
    }
  };
})();
