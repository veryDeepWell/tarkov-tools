/*! Barter optimizer — TarkovTableTool */
(function () {
  "use strict";

  var itemsById = {};
  var barters = [];

  function asArray(x) {
    if (Array.isArray(x)) return x;
    if (x && typeof x === "object") return Object.values(x);
    return [];
  }
  function resolveItemRef(ref) {
    if (!ref) return null;
    if (typeof ref === "object" && ref.id) return ref.id ? itemsById[ref.id] || ref : ref;
    return itemsById[ref] || null;
  }
  function unitPrice(it) {
    if (!it) return { price: 0, flea: 0, source: "" };
    var flea = Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0;
    return { price: flea, flea: flea, source: flea ? "flea" : "" };
  }
  function traderKeyOf(tr) {
    if (!tr) return "";
    if (typeof tr === "object") return tr.normalizedName || tr.key || tr.id || "";
    return String(tr);
  }
  function questLabel(tu) {
    if (!tu) return "";
    if (typeof tu === "object") return String(tu.name || tu.id || "");
    return String(tu);
  }
  function matchQuery(it, q) {
    var hay = (
      (it.normalizedName || "") +
      " " +
      (it.name || "") +
      " " +
      (it.shortName || "")
    ).toLowerCase();
    return hay.indexOf(q) >= 0;
  }
  function formatNum(n) {
    return TarkovTableTool.fmtNum(n);
  }

  ["q", "budget", "maxLL", "sort"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      rebuild();
    });
    el.addEventListener("change", function () {
      rebuild();
    });
  });

  var api = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#boHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#q",
    defaultSort: "total",
    defaultSortDir: 1,
    progress: true,
    filterRow: function (row) {
      var budget = Number((document.getElementById("budget") || {}).value) || 0;
      if (budget > 0 && row.total > budget) return false;
      if (row._gate && row._gate.locked && window.TarkovProfile && TarkovProfile.lockVisibility) {
        if (TarkovProfile.lockVisibility(row._gate) === "hide") return false;
      }
      return true;
    },
    columns: [
      {
        key: "name",
        label: "Награда",
        html: function (r, h) {
          return TarkovTableTool.nameCell(
            {
              name: r.name,
              slug: r.slug,
              icon: r.icon
            },
            h
          );
        }
      },
      {
        key: "trader",
        label: "Торговец",
        html: function (r) {
          return r.traderKey + (r.ll ? " LL" + r.ll : "");
        }
      },
      { key: "total", label: "Cost", format: "num" },
      {
        key: "fleaReward",
        label: "Flea",
        format: "num"
      },
      {
        key: "edge",
        label: "Edge",
        html: function (r) {
          var v = r.fleaReward - r.total;
          var cls = v > 0 ? "pos" : "neg";
          return '<span class="' + cls + '">' + formatNum(v) + "</span>";
        }
      },
      {
        key: "ingredients",
        label: "In",
        sort: false,
        html: function (r, h) {
          return (r.ingredients || [])
            .slice(0, 4)
            .map(function (ing) {
              var n = ing.item
                ? TarkovTableTool.itemName(ing.item)
                : "?";
              return h.esc(n) + "×" + ing.count;
            })
            .join(", ");
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

  function rebuild() {
    var q = ((document.getElementById("q") || {}).value || "").trim().toLowerCase();
    var maxLL = Number((document.getElementById("maxLL") || {}).value) || 4;
    var rows = [];
    barters.forEach(function (b) {
      var ll = Number(b.minTraderLevel) || 1;
      if (ll > maxLL) return;
      var offeredRef = b.offeredItem;
      var offeredCount = 1;
      var offeredItem = null;
      if (offeredRef && typeof offeredRef === "object") {
        offeredCount = Number(offeredRef.count) || 1;
        offeredItem = resolveItemRef(
          offeredRef.item != null ? offeredRef.item : offeredRef
        );
      } else {
        offeredItem = resolveItemRef(offeredRef);
      }
      if (!offeredItem) return;
      if (q && !matchQuery(offeredItem, q)) return;

      var ingredients = [];
      var total = 0;
      asArray(b.requiredItems).forEach(function (req) {
        var count = Number(req.count) || 1;
        var it = resolveItemRef(req.item != null ? req.item : req);
        var up = unitPrice(it);
        total += up.price * count;
        ingredients.push({ item: it, count: count, unit: up.price, line: up.price * count });
      });
      var fleaReward = (unitPrice(offeredItem).flea || 0) * offeredCount;
      var tKey = traderKeyOf(b.trader);
      var qLocked = !!b.taskUnlock;
      var qName = questLabel(b.taskUnlock);
      var gateRes = null;
      if (window.TarkovProfile && TarkovProfile.gate) {
        gateRes = TarkovProfile.gate({
          trader: tKey,
          minLL: ll,
          questLocked: qLocked,
          questName: qName
        });
      }
      rows.push({
        name: TarkovTableTool.itemName(offeredItem),
        slug: offeredItem.normalizedName || "",
        icon: offeredItem.iconLink || offeredItem.gridImageLink || "",
        traderKey: tKey,
        ll: ll,
        total: total,
        fleaReward: fleaReward,
        edge: fleaReward - total,
        ingredients: ingredients,
        quest: qLocked,
        _gate: gateRes
      });
    });
    var sort = (document.getElementById("sort") || {}).value || "cost";
    if (sort === "edge") rows.sort(function (a, b) { return b.edge - a.edge; });
    else if (sort === "flea") rows.sort(function (a, b) { return b.fleaReward - a.fleaReward; });
    else rows.sort(function (a, b) { return a.total - b.total; });
    api.setRows(rows);
  }

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Barters…" });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var items = asArray(await TarkovAPI.items(mode));
      itemsById = {};
      items.forEach(function (it) {
        if (it && it.id) itemsById[it.id] = it;
      });
      if (P) P.set(55, "Barters…");
      barters = asArray(await TarkovAPI.barters(mode));
      var fc = document.getElementById("filterCard");
      if (fc) fc.hidden = false;
      // ensure table host
      var results = document.getElementById("results");
      if (results && !document.getElementById("tbody")) {
        results.innerHTML =
          '<table class="data"><thead id="boHead"><tr></tr></thead><tbody id="tbody"></tbody></table>';
      }
      rebuild();
      if (status) {
        status.className = "status ok";
        status.textContent =
          "Предметов: " + items.length + " · бартеров: " + barters.length;
      }
      if (P) P.done();
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
