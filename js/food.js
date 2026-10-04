(function () {
  "use strict";

  var rows = [];
  var kind = "all";
  var sortKey = "score";
  var sortDir = -1;
  var settingKey = "tarkovtool-food-settings";
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
  function persist() {
    TarkovStorage.setJson(settingKey, {
      mode: document.getElementById("gameMode").value || "pve",
      kind: kind
    });
  }
  function render() {
    var query = document.getElementById("q").value || "";
    var list = TarkovItemDomain.filter(rows, { search: query })
      .filter(function (row) {
        return kind === "all" || row.kind === kind || row.kind === "both";
      });
    list.sort(function (a, b) {
      var left = a[sortKey];
      var right = b[sortKey];
      if (typeof left === "string") return sortDir * String(left).localeCompare(String(right));
      return sortDir * ((Number(left) || 0) - (Number(right) || 0));
    });
    document.getElementById("tbody").innerHTML = list.map(function (row) {
      var icon = row.icon
        ? '<img class="ico" src="' + esc(row.icon) + '" alt="" loading="lazy">'
        : "";
      return '<tr><td><div class="name-cell">' + icon + '<div><div class="name">' + esc(row.name) +
        '</div><div class="meta">' + esc(row.full) + '</div></div></div></td>' +
        '<td>' + esc(t("tool.food.ui.kind." + row.kind)) + '</td>' +
        '<td>' + row.energy + '</td><td>' + row.hydration + '</td><td>' + row.units + '</td>' +
        '<td>' + (row.avg ? formatNum(row.avg) : "—") + '</td>' +
        '<td>' + (row.perPoint ? formatNum(row.perPoint) : "—") + '</td>' +
        '<td class="score" title="' + esc(scoreTitle(row.scoreComponents, row.scoreDetails)) + '">' + row.score.toFixed(1) + '</td></tr>';
    }).join("") || '<tr><td colspan="8" class="meta empty-cell">' + esc(t("common.empty")) + '</td></tr>';
  }
  function selectKind(value) {
    kind = value;
    document.querySelectorAll("#kindChips .chip").forEach(function (chip) {
      chip.classList.toggle("active", chip.getAttribute("data-k") === kind);
    });
    persist();
    render();
  }

  document.getElementById("kindChips").addEventListener("click", function (event) {
    var button = event.target.closest(".chip");
    if (button) selectKind(button.getAttribute("data-k"));
  });
  document.querySelectorAll("th[data-s]").forEach(function (header) {
    header.addEventListener("click", function () {
      var key = header.getAttribute("data-s");
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = key === "name" || key === "kind" ? 1 : -1;
      }
      render();
    });
  });
  document.getElementById("btnLoad").addEventListener("click", async function () {
    var button = document.getElementById("btnLoad");
    var progress = window.TarkovUI && TarkovUI.progress;
    button.disabled = true;
    setStatus("tool.food.ui.loading");
    if (progress) progress.start({ label: t("tool.itemScore.loading"), indeterminate: true });
    try {
      var mode = document.getElementById("gameMode").value || "pve";
      rows = TarkovItemViewModels.food(await TarkovAPI.items(mode));
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
  window.addEventListener("tt-lang-changed", function () {
    render();
    renderStatus();
  });
  try {
    var saved = TarkovStorage.getJson(settingKey, {}) || {};
    if (saved.kind) selectKind(saved.kind);
    if (saved.mode) document.getElementById("gameMode").value = saved.mode;
  } catch (error) {
    console.error(error);
  }
})();
