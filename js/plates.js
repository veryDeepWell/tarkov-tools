/*! Plates — TarkovTableTool + ViewModels + armor dialog */
(function () {
  "use strict";

  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }
  function esc(s) {
    return TarkovTableTool.esc(s);
  }

  function showArmors(plate) {
    var dialog = document.getElementById("armorDialog");
    var title = document.getElementById("armorDialogTitle");
    var body = document.getElementById("armorDialogBody");
    if (!dialog || !body) return;
    title.textContent = plate.name + " — " + t("tool.plates.ui.compatibleArmor");
    body.innerHTML = (plate.compatibleArmors || []).length
      ? plate.compatibleArmors
          .map(function (armor) {
            var icon = armor.icon
              ? '<img class="plate-icon" src="' + esc(armor.icon) + '" alt="" loading="lazy">'
              : "";
            return (
              '<div class="plate-option" data-item-id="' + esc(armor.id) + '" data-item-name="' + esc(armor.name || armor.id) + '">' +
              icon +
              "<span>" +
              esc(armor.name || armor.id) +
              "</span></div>"
            );
          })
          .join("")
      : '<p class="meta">' + esc(t("tool.plates.ui.noCompatibleArmor")) + "</p>";
    dialog.hidden = false;
    dialog.classList.add("show");
    if (typeof dialog.showModal === "function" && !dialog.open) {
      try { dialog.showModal(); } catch (e) { dialog.setAttribute("open", "open"); }
    } else if (typeof dialog.showModal !== "function") {
      dialog.style.display = "block";
    }
  }

  var closeBtn = document.getElementById("armorDialogClose");
  if (closeBtn)
    closeBtn.onclick = function () {
      var d = document.getElementById("armorDialog");
      if (d) {
        if (typeof d.close === "function" && d.open) d.close();
        d.hidden = true;
        d.classList.remove("show");
        d.style.display = "";
      }
    };

  ["plateSearch", "plateClass", "plateOnlyFlea"].forEach(function (id) {
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
    tbody: "#plateBody",
    thead: "#plateHead",
    status: "#status",
    loadBtn: "#loadBtn",
    search: "#plateSearch",
    defaultSort: "score",
    defaultSortDir: -1,
    progress: true,
    filterRow: function (row, q) {
      var minClass = Number((document.getElementById("plateClass") || {}).value) || 0;
      if ((row.class || 0) < minClass) return false;
      var onlyFlea = document.getElementById("plateOnlyFlea");
      if (onlyFlea && onlyFlea.checked && !(row.avg > 0 || row.onFlea)) return false;
      if (!q) return true;
      var hay =
        (row.name || "") +
        " " +
        (row.slug || "") +
        " " +
        (row.compatibleArmors || [])
          .map(function (a) {
            return a.name || "";
          })
          .join(" ");
      return hay.toLowerCase().indexOf(q) >= 0;
    },
    columns: [
      {
        key: "name",
        label: "name",
        html: function (r, h) {
          return TarkovTableTool.nameCell(r, h);
        }
      },
      { key: "class", label: "Class", format: "num" },
      { key: "dur", label: "Dur", format: "num" },
      { key: "material", label: "Mat" },
      { key: "avg", label: "Flea", format: "num" },
      {
        key: "score",
        label: "Score",
        html: function (r) {
          return "<strong>" + (r.score != null ? Number(r.score).toFixed(1) : "—") + "</strong>";
        }
      },
      {
        key: "compat",
        label: "Armor",
        sort: false,
        html: function (r, h) {
          var n = (r.compatibleArmors && r.compatibleArmors.length) || 0;
          if (!n) return "—";
          return (
            '<button type="button" class="copy-btn compat-btn" data-id="' +
            h.esc(r.id) +
            '">' +
            t("tool.plates.ui.show") +
            " (" +
            n +
            ")</button>"
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
      var byId = {};
      list.forEach(function (r) {
        byId[r.id] = r;
      });
      (ctx.tbody || document.getElementById("plateBody")).querySelectorAll(".compat-btn").forEach(function (btn) {
        btn.onclick = function () {
          var plate = byId[btn.getAttribute("data-id")];
          if (plate) showArmors(plate);
        };
      });
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
      var rows = TarkovItemViewModels.plates(await TarkovAPI.items(mode));
      rows.forEach(function (r) {
        r.name = TarkovTableTool.itemName({
          id: r.id,
          name: r.name,
          normalizedName: r.slug
        });
        if (r.dur == null && r.durability != null) r.dur = r.durability;
        if (r.material == null && r.mat != null) r.material = r.mat;
        if (r.score != null && typeof r.score === "object") r.score = r.score.score;
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
