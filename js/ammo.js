/*! Ammo table — TarkovTableTool + caliber chips + crafts + gate */
(function () {
  "use strict";

  var activeCal = null;
  var api = null;

  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }
  function esc(s) {
    return TarkovTableTool.esc(s);
  }
  function formatNum(n) {
    return TarkovTableTool.fmtNum(n);
  }
  function caliberLabel(cal) {
    try {
      if (window.TarkovDicts && TarkovDicts.caliberLabel) return TarkovDicts.caliberLabel(cal);
    } catch (e) {}
    return String(cal || "").replace(/^Caliber/, "");
  }

  function penCells(pen) {
    if (window.TarkovWeaponDomain && TarkovWeaponDomain.penChart) {
      return TarkovWeaponDomain.penChart(pen)
        .map(function (cell) {
          return '<span class="' + cell.rating + '">' + cell.class + "</span>";
        })
        .join("");
    }
    return String(pen || "");
  }

  function paintCalibers(rows) {
    var counts = {};
    rows.forEach(function (r) {
      counts[r.cal] = (counts[r.cal] || 0) + 1;
    });
    var cals = Object.keys(counts).sort(function (a, b) {
      return caliberLabel(a).localeCompare(caliberLabel(b), "ru");
    });
    if (!activeCal || !counts[activeCal]) activeCal = cals[0] || null;
    var box = document.getElementById("calibers");
    if (!box) return;
    box.innerHTML = "";
    cals.forEach(function (cal) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-btn" + (activeCal === cal ? " active" : "");
      btn.dataset.cal = cal;
      btn.innerHTML =
        caliberLabel(cal) + '<span class="count">' + counts[cal] + "</span>";
      btn.onclick = function () {
        activeCal = cal;
        box.querySelectorAll(".cal-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        var title = document.getElementById("tableTitle");
        if (title)
          title.textContent =
            caliberLabel(cal) +
            " · " +
            (t("tool.ammo.ui.caliberRows", { count: counts[cal] }) || counts[cal]);
        if (window.render) window.render();
      };
      box.appendChild(btn);
    });
    var card = document.getElementById("calCard");
    if (card) card.style.display = cals.length ? "block" : "none";
  }

  var api = TarkovTableTool.create({
    autoLoad: false,
    tbody: "#tbody",
    thead: "#ammoHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: null,
    defaultSort: "pen",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row) {
      if (!activeCal || row.cal !== activeCal) return false;
      if (row._gateHide) return false;
      return true;
    },
    columns: [
      {
        key: "name",
        label: "Патрон",
        html: function (r, h) {
          return TarkovTableTool.nameCell(
            { name: r.name, slug: r.full || r.slug, icon: r.icon },
            h
          );
        }
      },
      { key: "pen", label: "Pen", format: "num" },
      { key: "dmg", label: "Dmg", format: "num" },
      { key: "ad", label: "AD", format: "num" },
      { key: "frag", label: "Frag%", format: "num" },
      {
        key: "chart",
        label: "vs armor",
        sort: false,
        html: function (r) {
          return '<div class="pen-chart">' + penCells(r.pen) + "</div>";
        }
      },
      { key: "avg", label: "Flea", format: "num" },
      {
        key: "traderPrice",
        label: "Торговец",
        html: function (r, h) {
          if (!r.traderPrice) return '<span class="meta">—</span>';
          return (
            "<div>" +
            h.esc(r.traderName || "") +
            (r.traderLL ? " LL" + r.traderLL : "") +
            "</div><div><strong>" +
            formatNum(r.traderPrice) +
            "</strong></div>"
          );
        }
      },
      {
        key: "craft",
        label: "Craft",
        html: function (r, h) {
          if (!r.hasCraft) return "—";
          var q = r.craftQuest ? ' <span class="bad">Q</span>' : "";
          return "×" + (r.craftCount || 1) + q;
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
        if (!tr || !r) return;
        if (r._gate && window.TarkovProfile && TarkovProfile.applyLockToElement) {
          try {
            TarkovProfile.applyLockToElement(tr, r._gate);
          } catch (e) {}
        }
      });
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: t("tool.ammo.ui.loadingItems") || "Ammo…", indeterminate: true });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var items = await TarkovAPI.items(mode);
      var craftsList = [];
      try {
        craftsList = await TarkovAPI.crafts(mode);
      } catch (eC) {
        craftsList = [];
      }
      var craftByProduct = {};
      (craftsList || []).forEach(function (c) {
        var pid = c.productItem && c.productItem.item;
        if (!pid) return;
        var entry = {
          count: Number(c.productItem.count) || 1,
          quest: !!c.taskUnlock,
          station: c.station,
          level: c.level
        };
        if (!craftByProduct[pid]) craftByProduct[pid] = [];
        craftByProduct[pid].push(entry);
      });

      var rows = [];
      (items || []).forEach(function (it) {
        var types = it.types || [];
        if (!types.includes("ammo") || types.includes("grenade")) return;
        var p = it.properties;
        if (!p || p.propertiesType !== "ItemPropertiesAmmo") return;
        if (p.ammoType === "grenade" || p.ammoType === "flashbang") return;
        var cal = p.caliber;
        if (!cal) return;

        var traderPrice = 0,
          traderName = "",
          traderQuest = false,
          traderLL = 0,
          traderKey = "",
          questName = "";
        if (window.TarkovItemDomain && TarkovItemDomain.bestBuy) {
          var best = TarkovItemDomain.bestBuy(it, { sources: "buyFromTrader" });
          if (best) {
            traderPrice = best.price || 0;
            traderName =
              best.traderName ||
              best.name ||
              (window.TarkovDicts && TarkovDicts.traderName
                ? TarkovDicts.traderName(best.trader)
                : "") ||
              "";
            traderQuest = !!(best.quest || best.questLocked);
            traderLL = best.ll || best.minLL || 0;
            traderKey = best.traderKey || best.trader || "";
            questName = best.questName || "";
          }
        }

        var crafts = craftByProduct[it.id] || [];
        var row = {
          id: it.id,
          cal: cal,
          slug: it.normalizedName || "",
          name: TarkovTableTool.itemName(it),
          full:
            window.TarkovNames && TarkovNames.displayFull
              ? TarkovNames.displayFull(it)
              : it.normalizedName || "",
          icon: it.iconLink || it.gridImageLink || "",
          pen: Number(p.penetrationPower) || 0,
          dmg: Number(p.damage) || 0,
          ad: Number(p.armorDamage) || 0,
          frag: Math.round((Number(p.fragmentationChance) || 0) * 100),
          speed: Number(p.initialSpeed) || 0,
          projectiles: Number(p.projectileCount) || 1,
          tracer: !!p.tracer,
          avg: it.avg24hPrice || 0,
          low: it.lastLowPrice || 0,
          traderPrice: traderPrice,
          traderName: traderName,
          traderQuest: traderQuest,
          traderLL: traderLL,
          traderKey: traderKey,
          questName: questName,
          hasCraft: crafts.length > 0,
          craftQuest: crafts.some(function (c) {
            return c.quest;
          }),
          craftCount: crafts.length ? crafts[0].count : 0,
          _gateHide: false,
          _gate: { locked: false, reason: "" }
        };

        if (window.TarkovProfile && TarkovProfile.gate && (row.traderLL || row.traderQuest)) {
          row._gate = TarkovProfile.gate({
            trader: row.traderKey || "",
            minLL: row.traderLL || 0,
            questLocked: !!row.traderQuest,
            questName: row.questName || ""
          });
          if (
            TarkovProfile.lockVisibility &&
            TarkovProfile.lockVisibility(row._gate) === "hide"
          ) {
            row._gateHide = true;
          }
        }
        rows.push(row);
      });

      api.setRows(rows);
      paintCalibers(rows);
      var tableCard = document.getElementById("tableCard");
      if (tableCard) tableCard.style.display = activeCal ? "block" : "none";
      var title = document.getElementById("tableTitle");
      if (title && activeCal) {
        var n = rows.filter(function (r) {
          return r.cal === activeCal;
        }).length;
        title.textContent =
          caliberLabel(activeCal) +
          " · " +
          (t("tool.ammo.ui.caliberRows", { count: n }) || n);
      }
      if (status) {
        status.className = "status ok";
        status.textContent =
          t("tool.itemScore.loaded", { count: rows.length }) || "OK · " + rows.length;
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
