/*! Crafts — TarkovTableTool */
(function () {
  "use strict";

  var activeStations = null;

  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }
  function formatNum(n) {
    return TarkovTableTool.fmtNum(n);
  }
  function formatDur(sec) {
    sec = Number(sec) || 0;
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    return h > 0 ? h + "ч " + m + "м" : m + "м";
  }
  function pickPrice(it, mode) {
    if (!it) return 0;
    var avg = Number(it.avg24hPrice) || 0;
    var low = Number(it.lastLowPrice) || 0;
    if (mode === "lastLow") return low || avg || 0;
    if (mode === "max") return Math.max(avg, low) || 0;
    return avg || low || 0;
  }

  function paintStations(rows) {
    var counts = {};
    rows.forEach(function (r) {
      counts[r.stationSlug] = (counts[r.stationSlug] || 0) + 1;
    });
    if (!activeStations) {
      activeStations = {};
      Object.keys(counts).forEach(function (k) {
        activeStations[k] = true;
      });
    }
    var box = document.getElementById("stationChips");
    if (!box) return;
    box.innerHTML = Object.keys(counts)
      .sort()
      .map(function (slug) {
        var on = activeStations[slug] ? " active" : "";
        return (
          '<span class="chip' +
          on +
          '" data-station="' +
          slug +
          '">' +
          slug +
          " (" +
          counts[slug] +
          ")</span>"
        );
      })
      .join("");
    box.querySelectorAll("[data-station]").forEach(function (chip) {
      chip.onclick = function () {
        var s = chip.getAttribute("data-station");
        activeStations[s] = !activeStations[s];
        chip.classList.toggle("active", !!activeStations[s]);
        if (window.render) window.render();
      };
    });
  }

  ["minProfit", "minPerHour", "search", "hideQuest", "onlyProfit", "priceIn", "priceOut", "intel3", "hmLvl"].forEach(function (id) {
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
    thead: "#thead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#search",
    defaultSort: "perHour",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (activeStations && row.stationSlug && !activeStations[row.stationSlug]) return false;
      var minP = Number((document.getElementById("minProfit") || {}).value) || 0;
      var minH = Number((document.getElementById("minPerHour") || {}).value) || 0;
      if (row.profit < minP) return false;
      if (row.perHour < minH) return false;
      var hideQuest = document.getElementById("hideQuest");
      if (hideQuest && hideQuest.checked && row.quest) return false;
      var onlyProfit = document.getElementById("onlyProfit");
      if (onlyProfit && onlyProfit.checked && row.profit <= 0) return false;
      if (!q) return true;
      var hay =
        (row.product || "") +
        " " +
        (row.productSlug || "") +
        " " +
        (row.station || "") +
        " " +
        (row.stationSlug || "");
      return hay.toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "product",
        label: "Продукт",
        html: function (r, h) {
          return TarkovTableTool.nameCell(
            { name: r.product, slug: r.productSlug, icon: r.productIcon },
            h
          );
        }
      },
      { key: "station", label: "Станция" },
      { key: "level", label: "Lvl", format: "num" },
      {
        key: "duration",
        label: "Время",
        html: function (r) {
          return formatDur(r.duration);
        }
      },
      {
        key: "cost",
        label: "Cost",
        html: function (r) {
          return formatNum(r.cost);
        }
      },
      {
        key: "revenue",
        label: "Out",
        html: function (r) {
          return formatNum(r.revenue);
        }
      },
      {
        key: "profit",
        label: "Profit",
        html: function (r) {
          var cls = r.profit > 0 ? "ok" : r.profit < 0 ? "bad" : "";
          return '<span class="' + cls + '">' + formatNum(r.profit) + "</span>";
        }
      },
      {
        key: "perHour",
        label: "₽/ч",
        html: function (r) {
          return formatNum(Math.round(r.perHour));
        }
      },
      {
        key: "roi",
        label: "ROI%",
        html: function (r) {
          return r.roi != null ? Number(r.roi).toFixed(1) : "—";
        }
      }
    ],
    fetch: function () {
      return Promise.resolve([]);
    },
    mapItem: function () {
      return null;
    },
    afterPaint: function (list, ctx) {
      var tb = ctx.tbody;
      if (!tb || !window.TarkovProfile || !TarkovProfile.gate) return;
      list.forEach(function (r, i) {
        var tr = tb.querySelectorAll("tr")[i];
        if (!tr || !r.quest) return;
        try {
          var g = TarkovProfile.gate({
            questLocked: true,
            questName: r.questName || ""
          });
          TarkovProfile.applyLockToElement(tr, g);
        } catch (e) {}
      });
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: t("common.loading") || "Loading…", indeterminate: true });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var priceIn = (document.getElementById("priceIn") || {}).value || "avg24h";
      var priceOut = (document.getElementById("priceOut") || {}).value || "avg24h";
      var intel3 = !!(document.getElementById("intel3") || {}).checked;
      var hmLvl = Number((document.getElementById("hmLvl") || {}).value) || 0;
      var taxOpts = { intelCenter3: intel3, hideoutManagementLevel: hmLvl };

      var crafts = await TarkovAPI.crafts(mode);
      var items = await TarkovAPI.items(mode);
      var stationList = [];
      try {
        stationList = await TarkovAPI.hideout(mode);
      } catch (eH) {}

      var itemsMap = {};
      (items || []).forEach(function (it) {
        if (it && it.id) itemsMap[it.id] = it;
      });
      var stationsMap = {};
      (stationList || []).forEach(function (s) {
        if (s && s.id) stationsMap[s.id] = s;
      });

      function itemName(id) {
        var it = itemsMap[id];
        if (!it) return String(id).slice(0, 8) + "…";
        return TarkovTableTool.itemName(it);
      }
      function stationName(idOrSlug) {
        var s = stationsMap[idOrSlug];
        var slug = (s && s.normalizedName) || idOrSlug;
        var key = "tool.crafts.ui.station." + slug;
        var translated = t(key);
        return translated === key
          ? window.TarkovDicts && TarkovDicts.humanize
            ? TarkovDicts.humanize(slug)
            : slug
          : translated;
      }

      var rows = (crafts || []).map(function (c) {
        var reqs = c.requiredItems || [];
        var inputs = [];
        var cost = 0;
        var missing = false;
        reqs.forEach(function (r) {
          var isTool = !!(
            r.attributes &&
            (r.attributes.tool === true || r.attributes.tool === "true")
          );
          var it = itemsMap[r.item];
          var unit = pickPrice(it, priceIn);
          var count = Number(r.count) || 0;
          if (!isTool) {
            if (!unit) missing = true;
            cost += unit * count;
          }
          inputs.push({
            id: r.item,
            name: itemName(r.item),
            count: count,
            unit: unit,
            isTool: isTool,
            sub: isTool ? 0 : unit * count
          });
        });
        var prod = c.productItem || {};
        var prodId = prod.item;
        var prodCount = Number(prod.count) || 1;
        var prodItem = itemsMap[prodId];
        var unitOut = pickPrice(prodItem, priceOut);
        var baseOut = Number(prodItem && prodItem.basePrice) || 0;
        var profitResult =
          window.TarkovItemDomain && TarkovItemDomain.evaluateProfit
            ? TarkovItemDomain.evaluateProfit(baseOut, unitOut, prodCount, cost, taxOpts)
            : {
                tax: 0,
                revenue: unitOut * prodCount,
                profit: unitOut * prodCount - cost,
                roi: cost ? ((unitOut * prodCount - cost) / cost) * 100 : 0
              };
        var profit = profitResult.profit;
        var dur = Number(c.duration) || 0;
        var perHour = dur > 0 ? profit / (dur / 3600) : 0;
        var stId = c.station;
        var stSlug = (stationsMap[stId] && stationsMap[stId].normalizedName) || stId;
        return {
          id: c.id,
          product: itemName(prodId),
          productSlug: (prodItem && prodItem.normalizedName) || "",
          productIcon: (prodItem && (prodItem.iconLink || prodItem.gridImageLink)) || "",
          productId: prodId,
          prodCount: prodCount,
          station: stationName(stId),
          stationSlug: stSlug,
          stationId: stId,
          level: Number(c.level) || 0,
          duration: dur,
          cost: cost,
          revenue: profitResult.revenue,
          profit: profit,
          perHour: perHour,
          roi: profitResult.roi,
          inputs: inputs,
          missing: missing,
          quest: !!(c.taskUnlock),
          questName:
            c.taskUnlock && (c.taskUnlock.name || c.taskUnlock.id)
              ? c.taskUnlock.name || c.taskUnlock.id
              : ""
        };
      });

      activeStations = null;
      paintStations(rows);
      api.setRows(rows);
      var card = document.getElementById("resultsCard");
      if (card) card.style.display = "block";
      if (status) {
        status.className = "status ok";
        status.textContent = t("tool.itemScore.loaded", { count: rows.length }) || "OK · " + rows.length;
      }
      if (P) P.done();
    } catch (e) {
      console.error(e);
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
