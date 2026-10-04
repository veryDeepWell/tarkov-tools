(function () {
  "use strict";

  var rows = [];
  var sortKey = "score";
  var sortDir = -1;
  var statusState = null;

  function t(key, params) {
    return window.TarkovI18n && TarkovI18n.t ? TarkovI18n.t(key, params) : key;
  }
  function renderStatus() {
    if (!statusState) return;
    var status = document.getElementById("status");
    status.className = "status" + (statusState.tone ? " " + statusState.tone : "");
    status.textContent = t(statusState.key, statusState.params);
  }
  function setStatus(key, params, tone) {
    statusState = { key: key, params: params, tone: tone };
    renderStatus();
  }
  function esc(value) { return TarkovDicts.esc(value); }
  function formatNum(value) { return TarkovDicts.fmtNum(value); }
  function scoreTitle(components, details) {
    if (!components) return "";
    var lines = ["quality", "accessibility", "value", "load"].map(function (key) {
      return t("tool.itemScore.factor." + key) + ": " + components[key];
    });
    if (details) {
      lines.push(t("tool.itemScore.detail.fleaPrice") + ": " + (details.fleaPrice ? formatNum(details.fleaPrice) : "—"));
      lines.push(t("tool.itemScore.detail.traderPrice") + ": " + (details.traderPrice ? formatNum(details.traderPrice) : "—"));
      lines.push(t("tool.itemScore.detail.traderLevel") + ": " + (details.traderPrice ? details.traderLevel : "—"));
      lines.push(t("tool.itemScore.detail.questLocked") + ": " + t(details.questLocked ? "tool.itemScore.yes" : "tool.itemScore.no"));
      lines.push(t("tool.itemScore.detail.listingCount") + ": " + (details.listingCount || "—"));
      lines.push(t("tool.itemScore.detail.weightSize") + ": " + details.weight + " / " + details.size);
    }
    return lines.join("\n");
  }

  function showArmors(plate) {
    var dialog = document.getElementById("armorDialog");
    document.getElementById("armorDialogTitle").textContent =
      plate.name + " — " + t("tool.plates.ui.compatibleArmor");
    document.getElementById("armorDialogBody").innerHTML = plate.compatibleArmors.length
      ? plate.compatibleArmors.map(function (armor) {
        var icon = armor.icon
          ? '<img class="plate-icon" src="' + esc(armor.icon) + '" alt="' + esc(armor.name) +
            '" title="' + esc(armor.name) + '" loading="lazy">'
          : "";
        return '<div class="plate-option">' + icon + '<span>' + esc(armor.name) + '</span></div>';
      }).join("")
      : '<p class="meta">' + esc(t("tool.plates.ui.noCompatibleArmor")) + '</p>';
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function render() {
    var query = (document.getElementById("plateSearch").value || "").trim().toLowerCase();
    var minClass = Number(document.getElementById("plateClass").value) || 0;
    var onlyFlea = document.getElementById("plateOnlyFlea").checked;
    var list = rows.filter(function (row) {
      if (minClass && row.cls < minClass) return false;
      if (onlyFlea && !row.onFlea) return false;
      return !query || (row.name + " " + row.slug + " " + row.compatibleArmors.map(function (a) {
        return a.name;
      }).join(" ")).toLowerCase().indexOf(query) >= 0;
    });
    list.sort(function (a, b) {
      var left = a[sortKey];
      var right = b[sortKey];
      if (typeof left === "string") return sortDir * String(left).localeCompare(String(right));
      return sortDir * ((Number(left) || 0) - (Number(right) || 0));
    });
    var body = document.getElementById("plateBody");
    body.innerHTML = list.map(function (plate) {
      var icon = plate.icon
        ? '<img class="ico" src="' + esc(plate.icon) + '" loading="lazy" alt="">'
        : "";
      var compatibility = plate.compatibleArmors.length
        ? '<button type="button" class="copy-btn compat-btn" data-id="' + esc(plate.id) + '">' +
          esc(t("tool.plates.ui.show")) + " (" + plate.compatibleArmors.length + ")</button>"
        : '<span class="meta">—</span>';
      return '<tr>' +
        '<td class="score" title="' + esc(scoreTitle(plate.scoreComponents, plate.scoreDetails)) + '">' + plate.score.toFixed(1) + '</td>' +
        '<td><div class="name-cell">' + icon + '<div><div class="name">' + esc(plate.name) +
        '</div><div class="meta">' + esc(plate.slug) + '</div></div></div></td>' +
        '<td>' + plate.cls + '</td><td>' + plate.dur + '</td><td>' + plate.weight.toFixed(2) + '</td>' +
        '<td>' + formatNum(plate.repair) + '</td><td>' + plate.pen.toFixed(2) + '</td>' +
        '<td>' + (plate.avg || plate.low ? formatNum(plate.avg || plate.low) : "—") + '</td>' +
        '<td>' + compatibility + '</td>' +
        '<td><button type="button" class="copy-btn" data-name="' + esc(plate.slug) + '">' +
        esc(t("tool.itemScore.copy")) + '</button></td></tr>';
    }).join("") || '<tr><td colspan="10" class="meta empty-cell">' + esc(t("common.empty")) + '</td></tr>';
    body.querySelectorAll(".compat-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        var plate = rows.find(function (item) { return item.id === button.dataset.id; });
        if (plate) showArmors(plate);
      });
    });
    body.querySelectorAll(".copy-btn:not(.compat-btn)").forEach(function (button) {
      button.addEventListener("click", function () {
        navigator.clipboard.writeText(button.dataset.name || "").catch(function (error) {
          console.error(error);
        });
      });
    });
  }

  document.getElementById("loadBtn").addEventListener("click", async function () {
    var button = document.getElementById("loadBtn");
    var progress = window.TarkovUI && TarkovUI.progress;
    button.disabled = true;
    setStatus("tool.plates.ui.loading");
    if (progress) progress.start({ label: t("tool.itemScore.loading"), indeterminate: true });
    try {
      var mode = document.getElementById("gameMode").value || "pve";
      var items = await TarkovAPI.items(mode);
      rows = TarkovItemViewModels.plates(items);
      render();
      setStatus("tool.itemScore.loaded", { count: rows.length }, "ok");
      if (progress) progress.done(t("tool.itemScore.loaded", { count: rows.length }));
    } catch (error) {
      setStatus("tool.itemScore.loadError", { message: error.message }, "err");
      if (progress) progress.fail(t("tool.itemScore.loadError", { message: error.message }));
      console.error(error);
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("plateSearch").addEventListener("input", render);
  document.getElementById("plateClass").addEventListener("change", render);
  document.getElementById("plateOnlyFlea").addEventListener("change", render);
  document.querySelectorAll("#plateTable th[data-k]").forEach(function (header) {
    header.addEventListener("click", function () {
      var key = header.dataset.k;
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = key === "name" ? 1 : -1;
      }
      render();
    });
  });
  document.getElementById("armorDialogClose").addEventListener("click", function () {
    document.getElementById("armorDialog").close();
  });
  window.addEventListener("tt-lang-changed", function () {
    render();
    renderStatus();
  });
})();
