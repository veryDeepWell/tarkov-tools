(function () {
  "use strict";

  var rows = [];
  var sortKey = "score";
  var sortDir = -1;
  var settingKey = "tarkovHelmets";
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
  function zoneLabels(row) {
    return (row.zones || []).map(function (zone) {
      return t("tool.itemScore.zone." + zone);
    }).join(", ");
  }
  function tooltip(row) {
    return [
      t("tool.helmets.ui.ricochet") + ": " + [row.rx, row.ry, row.rz].map(function (value) {
        return value == null ? "—" : value;
      }).join(" / "),
      t("tool.helmets.ui.blunt") + ": " + (row.blunt == null ? "—" : row.blunt),
      t("tool.helmets.ui.repair") + ": " + (row.repair == null ? "—" : row.repair),
      t("tool.helmets.ui.blocksEye") + ": " + t(row.blocksEye ? "tool.itemScore.yes" : "tool.itemScore.no"),
      t("tool.helmets.ui.blocksHead") + ": " + t(row.blocksHead ? "tool.itemScore.yes" : "tool.itemScore.no"),
      t("tool.helmets.ui.slots") + ": " + row.slotCount
    ].join("\n");
  }
  function persist() {
    TarkovStorage.setJson(settingKey, {
      mode: document.getElementById("gameMode").value || "pve"
    });
  }

  function render() {
    var query = document.getElementById("q").value || "";
    var minClass = Number(document.getElementById("minClass").value) || 0;
    var onlyFlea = document.getElementById("onlyFlea").checked;
    var hideQuest = document.getElementById("hideQuest").checked;
    var list = TarkovItemDomain.filter(rows, {
      search: query,
      classes: minClass ? [minClass, minClass + 1, minClass + 2, minClass + 3, minClass + 4, 6] : [],
      onlyFlea: onlyFlea
    }).filter(function (row) {
      return (!minClass || row.class >= minClass) && !(hideQuest && row.quest);
    });
    list.sort(function (a, b) {
      var left = a[sortKey];
      var right = b[sortKey];
      if (typeof left === "string") return sortDir * String(left).localeCompare(String(right));
      return sortDir * ((Number(left) || 0) - (Number(right) || 0));
    });
    document.getElementById("tbody").innerHTML = list.map(function (row) {
      var fleaPrice = row.avg || row.low;
      var trader = row.traderPrice
        ? formatNum(row.traderPrice) + (row.quest ? " · " + t("tool.itemScore.questLocked") : "")
        : "—";
      var icon = row.icon
        ? '<img class="ico" src="' + esc(row.icon) + '" loading="lazy" alt="">'
        : "";
      return '<tr>' +
        '<td title="' + esc(tooltip(row)) + '"><div class="name-cell">' + icon +
        '<div><div class="name">' + esc(row.name) + '</div><div class="meta">' + esc(row.slug) + '</div></div></div></td>' +
        '<td>' + (row.cls || "—") + '</td><td>' + (row.dur || "—") + '</td>' +
        '<td>' + esc(row.mat || "—") + '</td><td>' + esc(zoneLabels(row) || "—") + '</td>' +
        '<td>' + (fleaPrice ? formatNum(fleaPrice) : "—") + '</td><td>' + trader + '</td>' +
        '<td>' + formatNum(row.weight) + ' / ' + (row.size || "—") + '</td>' +
        '<td class="score" title="' + esc(scoreTitle(row.scoreComponents, row.scoreDetails)) + '">' + row.score.toFixed(1) + '</td>' +
        '<td><button type="button" class="copy-btn" data-name="' + esc(row.slug) + '">' +
        esc(t("tool.itemScore.copy")) + '</button></td></tr>';
    }).join("") || '<tr><td colspan="10" class="meta empty-cell">' + esc(t("common.empty")) + '</td></tr>';
    document.querySelectorAll("#tbody .copy-btn").forEach(function (button) {
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
    setStatus("tool.helmets.ui.loading");
    if (progress) progress.start({ label: t("tool.itemScore.loading"), indeterminate: true });
    try {
      var mode = document.getElementById("gameMode").value || "pve";
      rows = TarkovItemViewModels.helmets(await TarkovAPI.items(mode));
      document.getElementById("tableCard").style.display = "block";
      render();
      setStatus("tool.itemScore.loaded", { count: rows.length }, "ok");
      if (progress) progress.done(t("tool.itemScore.loaded", { count: rows.length }));
      persist();
    } catch (error) {
      setStatus("tool.itemScore.loadError", { message: error.message }, "err");
      if (progress) progress.fail(t("tool.itemScore.loadError", { message: error.message }));
      console.error(error);
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("q").addEventListener("input", render);
  document.getElementById("minClass").addEventListener("change", render);
  document.getElementById("onlyFlea").addEventListener("change", render);
  document.getElementById("hideQuest").addEventListener("change", render);
  document.querySelectorAll("#tbl th[data-k]").forEach(function (header) {
    header.addEventListener("click", function () {
      var key = header.dataset.k;
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = key === "name" || key === "mat" ? 1 : -1;
      }
      render();
    });
  });
  window.addEventListener("tt-lang-changed", function () {
    render();
    renderStatus();
  });
  try {
    var saved = TarkovStorage.getJson(settingKey, {}) || {};
    if (saved.mode) document.getElementById("gameMode").value = saved.mode;
  } catch (error) {
    console.error(error);
  }
})();
