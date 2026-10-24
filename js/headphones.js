/*! Headphones — TarkovTableTool */
(function () {
  "use strict";

  var tipEl = null;

  function traderBuy(it) {
    var list = it.buyFromTrader || it.buyFor || [];
    if (!Array.isArray(list) || !list.length) return null;
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var rub = Number(b.priceRUB != null ? b.priceRUB : b.price) || 0;
      if (!best || (rub > 0 && rub < best.rub)) {
        var meta =
          window.TarkovProfile && TarkovProfile.offerMeta
            ? TarkovProfile.offerMeta(b)
            : { traderKey: "", questName: "" };
        best = {
          rub: rub,
          level: Number(b.minTraderLevel) || 0,
          taskUnlock: b.taskUnlock || null,
          traderKey: meta.traderKey || "",
          questName: meta.questName || ""
        };
      }
    }
    return best;
  }

  function scoreOf(r) {
    var dist = Number(r.dist) || 1;
    var distort = Number(r.distort);
    if (!isFinite(distort)) distort = 0.2;
    var weight = Number(r.weight) || 0.01;
    var price = Number(r.avg) || Number(r.traderRub) || 0;
    var perf = dist * 100 - distort * 40 - weight * 15;
    if (price > 0) return Math.round(((perf * 1000) / Math.sqrt(price)) * 10) / 10;
    return Math.round(perf * 10) / 10;
  }

  function showTip(r, e) {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "tip";
      document.body.appendChild(tipEl);
    }
    var lines = [
      ["Distance modifier", r.dist],
      ["Distortion", r.distort],
      ["Ambient volume", r.ambient],
      ["Dry volume", r.dry],
      ["Weight", r.weight],
      ["Grid", r.width + "×" + r.height],
      ["Flea", r.avg],
      ["Trader", r.traderRub]
    ];
    tipEl.innerHTML = lines
      .map(function (x) {
        return "<div><span>" + x[0] + "</span> " + (x[1] != null ? x[1] : "—") + "</div>";
      })
      .join("");
    tipEl.style.display = "block";
    tipEl.style.left = e.clientX + 12 + "px";
    tipEl.style.top = e.clientY + 12 + "px";
  }

  function hideTip() {
    if (tipEl) tipEl.style.display = "none";
  }

  function numFilter(id, def) {
    var el = document.getElementById(id);
    if (!el || el.value === "") return def;
    var n = Number(el.value);
    return isFinite(n) ? n : def;
  }

  ["q", "minDist", "maxDistort", "maxPrice"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", function () {
        if (window.render) window.render();
      });
      el.addEventListener("change", function () {
        if (window.render) window.render();
      });
    }
  });

  TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#hpHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#q",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      var minDist = numFilter("minDist", 0);
      var maxDistort = numFilter("maxDistort", 99);
      var maxPrice = numFilter("maxPrice", 1e12);
      if (row.dist < minDist) return false;
      if (isFinite(row.distort) && row.distort > maxDistort) return false;
      var price = row.avg || row.traderRub || 0;
      if (price > maxPrice) return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "score",
        label: "Score",
        html: function (r, h) {
          return "<strong>" + h.esc(String(r.score)) + "</strong>";
        }
      },
      {
        key: "name",
        label: "Наушники",
        html: function (r, h) {
          return (
            '<div class="name-cell" data-tip="1">' +
            (r.icon ? '<img class="ico" src="' + h.esc(r.icon) + '" loading="lazy" alt="">' : "") +
            "<div><div class=\"name\">" +
            h.esc(r.name) +
            '</div><div class="meta">' +
            h.esc(r.slug) +
            "</div></div></div>"
          );
        }
      },
      { key: "dist", label: "Dist", format: "fixed2" },
      { key: "distort", label: "Distort", format: "fixed2" },
      { key: "weight", label: "Вес", format: "fixed2" },
      { key: "avg", label: "Flea", format: "num" },
      { key: "traderRub", label: "Торговец", format: "num" },
      {
        key: "traderLvl",
        label: "УЛ",
        html: function (r, h) {
          return r.traderLvl ? String(r.traderLvl) : "—";
        }
      }
    ],
    fetch: function (mode, API) {
      return API.items(mode);
    },
    mapItem: function (it) {
      var p = it.properties || {};
      if (p.propertiesType !== "ItemPropertiesHeadphone" && (it.types || []).indexOf("headphones") < 0) {
        return null;
      }
      var buy = traderBuy(it);
      var r = {
        id: it.id,
        name: TarkovTableTool.itemName(it),
        slug: it.normalizedName || it.shortName || "",
        icon: it.iconLink || it.gridImageLink || "",
        dist: Number(p.distanceModifier) || 1,
        distort: Number(p.distortion),
        ambient: Number(p.ambientVolume),
        dry: Number(p.dryVolume),
        weight: Number(it.weight) || 0,
        width: Number(it.width) || 1,
        height: Number(it.height) || 1,
        avg: Number(it.avg24hPrice) || 0,
        traderRub: buy ? buy.rub : 0,
        traderLvl: buy ? buy.level : 0,
        questLock: !!(buy && buy.taskUnlock),
        traderKey: buy ? buy.traderKey : "",
        questName: buy ? buy.questName : "",
        minLL: buy ? buy.level : 0
      };
      r.score = scoreOf(r);
      return r;
    },
    onLoaded: function () {
      var c = document.getElementById("tableCard");
      if (c) c.hidden = false;
    },
    afterPaint: function (list, ctx) {
      var tbody = ctx.tbody;
      if (!tbody) return;
      tbody.querySelectorAll("tr").forEach(function (tr, i) {
        var r = list[i];
        if (!r) return;
        tr.setAttribute("data-id", r.id || "");
        if (window.TarkovProfile && TarkovProfile.gate && TarkovProfile.applyLockToElement) {
          try {
            var g = TarkovProfile.gate({
              trader: r.traderKey,
              minLL: r.traderLvl,
              questLocked: r.questLock,
              questName: r.questName
            });
            TarkovProfile.applyLockToElement(tr, g);
          } catch (e) {}
        }
        var tip = tr.querySelector("[data-tip]");
        if (tip) {
          tip.addEventListener("mouseenter", function (e) {
            showTip(r, e);
          });
          tip.addEventListener("mousemove", function (e) {
            showTip(r, e);
          });
          tip.addEventListener("mouseleave", hideTip);
        }
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
