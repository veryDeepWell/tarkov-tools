/*! Food/Drink — TarkovTableTool + ViewModels */
(function () {
  "use strict";

  var kind = "all";

  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }

  document.querySelectorAll("#kindChips [data-kind], #kindChips .chip").forEach(function (el) {
    el.addEventListener("click", function () {
      kind = el.getAttribute("data-kind") || "all";
      document.querySelectorAll("#kindChips .chip, #kindChips [data-kind]").forEach(function (x) {
        x.classList.toggle("active", x === el);
      });
      if (window.render) window.render();
    });
  });

  var api = TarkovTableTool.create({
    tbody: "#tbody",
    thead: "#foodHead",
    status: "#status",
    loadBtn: "#btnLoad",
    search: "#q",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      if (kind !== "all" && row.kind !== kind && row.kind !== "both") return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.full || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Предмет",
        html: function (r, h) {
          return TarkovTableTool.nameCell(
            { name: r.name, slug: r.full || r.slug, icon: r.icon },
            h
          );
        }
      },
      {
        key: "kind",
        label: "Тип",
        html: function (r, h) {
          try {
            return h.esc(t("tool.food.ui.kind." + r.kind));
          } catch (e) {
            return h.esc(r.kind);
          }
        }
      },
      { key: "energy", label: "Energy", format: "num" },
      { key: "hydration", label: "Hydro", format: "num" },
      { key: "units", label: "Uses", format: "num" },
      { key: "avg", label: "Flea", format: "num" },
      {
        key: "perPoint",
        label: "₽/pt",
        format: "num"
      },
      {
        key: "score",
        label: "Score",
        html: function (r) {
          return "<strong>" + (r.score != null ? Number(r.score).toFixed(1) : "—") + "</strong>";
        }
      }
    ],
    fetch: function () {
      return Promise.resolve([]);
    },
    mapItem: function () {
      return null;
    }
  });

  document.getElementById("btnLoad").onclick = async function () {
    var button = document.getElementById("btnLoad");
    var status = document.getElementById("status");
    if (button) button.disabled = true;
    var progress = window.TarkovUI && TarkovUI.progress;
    try {
      if (progress) progress.start({ label: t("tool.itemScore.loading"), indeterminate: true });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      if (!window.TarkovItemViewModels) throw new Error("TarkovItemViewModels missing");
      var rows = TarkovItemViewModels.food(await TarkovAPI.items(mode));
      rows.forEach(function (r) {
        if (!r.name || /^[a-f0-9]{20,}$/i.test(r.name)) {
          r.name = TarkovTableTool.itemName({ id: r.id, name: r.name, normalizedName: r.slug || r.full });
        }
      });
      api.setRows(rows);
      if (status) {
        status.className = "status ok";
        status.textContent = t("tool.itemScore.loaded", { count: rows.length }) || "OK · " + rows.length;
      }
      if (progress) progress.done();
    } catch (e) {
      if (status) {
        status.className = "status err";
        status.textContent = e.message || String(e);
      }
      if (progress) progress.fail(e.message);
    } finally {
      if (button) button.disabled = false;
    }
  };
})();
