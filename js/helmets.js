/*! Helmets — TarkovTableTool + ViewModels */
(function () {
  "use strict";

  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }

  ["q", "minClass", "onlyFlea", "hideQuest"].forEach(function (id) {
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
    thead: "#helmHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#q",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      var minClass = Number((document.getElementById("minClass") || {}).value) || 0;
      if ((row.class || row.cls || 0) < minClass) return false;
      var onlyFlea = document.getElementById("onlyFlea");
      if (onlyFlea && onlyFlea.checked && !(row.avg > 0 || row.onFlea)) return false;
      var hideQuest = document.getElementById("hideQuest");
      if (hideQuest && hideQuest.checked && row.quest) return false;
      if (!q) return true;
      return ((row.name || "") + " " + (row.slug || "")).toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "Шлем",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "class", label: "Class", format: "num" },
      { key: "dur", label: "Dur", format: "num" },
      { key: "mat", label: "Mat" },
      { key: "zones", label: "Zones" },
      { key: "ergo", label: "Ergo", format: "num" },
      { key: "avg", label: "Flea", format: "num" },
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
    },
    onLoaded: function () {
      var c = document.getElementById("tableCard");
      if (c) c.hidden = false;
    }
  });

  document.getElementById("loadBtn").onclick = async function () {
    var button = document.getElementById("loadBtn");
    var status = document.getElementById("status");
    if (button) button.disabled = true;
    var progress = window.TarkovUI && TarkovUI.progress;
    try {
      if (progress) progress.start({ label: t("tool.itemScore.loading"), indeterminate: true });
      var mode = (document.getElementById("gameMode") || {}).value || "pve";
      var rows = TarkovItemViewModels.helmets(await TarkovAPI.items(mode));
      rows.forEach(function (r) {
        r.name = TarkovTableTool.itemName({
          id: r.id,
          name: r.name,
          shortName: r.shortName,
          normalizedName: r.slug
        });
        if (r.class == null && r.cls != null) r.class = r.cls;
      });
      api.setRows(rows);
      var card = document.getElementById("tableCard");
      if (card) {
        card.hidden = false;
        card.style.display = "block";
      }
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
