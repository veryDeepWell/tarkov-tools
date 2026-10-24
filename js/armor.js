/*! Armor — TarkovTableTool + ViewModels + plate dialog */
(function () {
  "use strict";

  var platesById = {};
  var activeTypes = { armor: true, rig: true, helmet: true };
  var activeClasses = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };

  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }
  function esc(s) {
    return TarkovTableTool.esc(s);
  }
  function formatNum(n) {
    return TarkovTableTool.fmtNum(n);
  }

  function showPlates(row) {
    var dialog = document.getElementById("plateDialog");
    var title = document.getElementById("plateDialogTitle");
    var body = document.getElementById("plateDialogBody");
    if (!dialog || !body) return;
    title.textContent = row.name + " — " + t("tool.armor.ui.compatiblePlates");
    body.innerHTML = (row.plateIds || [])
      .map(function (id) {
        var plate = platesById[id];
        if (!plate) {
          return (
            '<div class="plate-option"><span>' +
            esc(id) +
            '</span><span class="meta">' +
            esc(t("tool.armor.ui.unresolved")) +
            "</span></div>"
          );
        }
        var icon = plate.icon
          ? '<img class="plate-icon" src="' +
            esc(plate.icon) +
            '" alt="" loading="lazy">'
          : "";
        var price = plate.avg || plate.low;
        return (
          '<div class="plate-option">' +
          icon +
          "<span><strong>" +
          esc(plate.name) +
          "</strong><small>Class " +
          plate.class +
          " · " +
          esc(plate.material || "—") +
          " · " +
          (price ? formatNum(price) + " ₽" : "—") +
          "</small></span></div>"
        );
      })
      .join("") ||
      '<p class="meta">' + esc(t("tool.armor.ui.noPlates") || "—") + "</p>";
    dialog.hidden = false;
    dialog.classList.add("show");
  }

  var closeBtn = document.getElementById("plateDialogClose");
  if (closeBtn)
    closeBtn.onclick = function () {
      var d = document.getElementById("plateDialog");
      if (d) {
        d.hidden = true;
        d.classList.remove("show");
      }
    };

  function wireChips() {
    var typeBox = document.getElementById("typeChips");
    if (typeBox) {
      typeBox.querySelectorAll("[data-type], .chip").forEach(function (el) {
        el.onclick = function () {
          var k = el.getAttribute("data-type") || el.textContent.trim().toLowerCase();
          if (k === "armor" || k === "rig" || k === "helmet") {
            activeTypes[k] = !activeTypes[k];
            el.classList.toggle("active", !!activeTypes[k]);
            if (window.render) window.render();
          }
        };
      });
    }
    var classBox = document.getElementById("classChips");
    if (classBox) {
      classBox.querySelectorAll("[data-class], .chip").forEach(function (el) {
        el.onclick = function () {
          var c = Number(el.getAttribute("data-class") || el.textContent);
          if (!c) return;
          activeClasses[c] = !activeClasses[c];
          el.classList.toggle("active", !!activeClasses[c]);
          if (window.render) window.render();
        };
      });
    }
  }
  wireChips();

  ["search", "hideQuest", "onlyFlea"].forEach(function (id) {
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
    autoLoad: false,
    tbody: "#tbody",
    thead: "#armorHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#search",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (row.kind && activeTypes[row.kind] === false) return false;
      if (row.class && activeClasses[row.class] === false) return false;
      var hideQuest = document.getElementById("hideQuest");
      if (hideQuest && hideQuest.checked && row.quest) return false;
      var onlyFlea = document.getElementById("onlyFlea");
      if (onlyFlea && onlyFlea.checked && !(row.avg > 0 || row.onFlea)) return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "name",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "kind", label: "Kind" },
      { key: "class", label: "Class", format: "num" },
      { key: "dur", label: "Dur", format: "num" },
      { key: "zones", label: "Zones" },
      { key: "avg", label: "Flea", format: "num" },
      { key: "traderPrice", label: "trader", format: "num" },
      {
        key: "score",
        label: "Score",
        html: function (r) {
          return "<strong>" + (r.score != null ? Number(r.score).toFixed(1) : "—") + "</strong>";
        }
      },
      {
        key: "plates",
        label: "Plates",
        sort: false,
        html: function (r, h) {
          var n = (r.plateIds && r.plateIds.length) || 0;
          if (!n) return "—";
          return (
            '<button type="button" class="copy-btn plate-show" data-id="' +
            h.esc(r.id) +
            '">' +
            n +
            "</button>"
          );
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
      var byId = {};
      list.forEach(function (r) {
        byId[r.id] = r;
      });
      tb.querySelectorAll(".plate-show").forEach(function (btn) {
        btn.onclick = function () {
          var row = byId[btn.getAttribute("data-id")];
          if (row) showPlates(row);
        };
      });
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var btn = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (btn) btn.disabled = true;
    var progress = window.TarkovUI && TarkovUI.progress;
    try {
      if (progress) progress.start({ label: t("tool.itemScore.loading"), indeterminate: true });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var items = await TarkovAPI.items(mode);
      var view = TarkovItemViewModels.armor(items, {
        traderLabel: function (id) {
          return window.TarkovDicts && TarkovDicts.traderName ? TarkovDicts.traderName(id) : id;
        }
      });
      var rows = view.rows || view;
      platesById = view.platesById || {};
      rows.forEach(function (r) {
        r.name = TarkovTableTool.itemName({
          id: r.id,
          name: r.name,
          normalizedName: r.slug
        });
      });
      api.setRows(rows);
      document.getElementById("filtersCard") &&
        (document.getElementById("filtersCard").style.display = "block");
      document.getElementById("tableCard") &&
        (document.getElementById("tableCard").style.display = "block");
      if (status) {
        status.className = "status ok";
        status.textContent = t("tool.itemScore.loaded", { count: rows.length }) || "OK · " + rows.length;
      }
      if (progress) progress.done();
    } catch (e) {
      console.error(e);
      if (status) {
        status.className = "status err";
        status.textContent = e.message || String(e);
      }
      if (progress) progress.fail(e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
})();
