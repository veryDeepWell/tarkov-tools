/* Map admin UI */
(function () {
  "use strict";
  var MAPS = window.TT_MAPS || {};
  var ORDER = window.TT_MAP_ORDER || Object.keys(MAPS);
  var current = ORDER[0] || "customs";
  var draft = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fillMaps() {
    var sel = document.getElementById("mapSelect");
    sel.innerHTML = ORDER.filter(function (id) { return MAPS[id]; }).map(function (id) {
      return '<option value="' + esc(id) + '"' + (id === current ? " selected" : "") + ">" +
        esc((MAPS[id].title || id)) + "</option>";
    }).join("");
  }

  function loadDraft() {
    draft = TarkovMapOverrides.get(current);
    if (!draft.rename) draft.rename = {};
    if (!draft.hide) draft.hide = [];
    if (!draft.add) draft.add = [];
    if (!draft.labels) draft.labels = [];
    paint();
  }

  function baseRows() {
    var meta = MAPS[current];
    if (!meta || !meta.data) return [];
    var rows = [];
    Object.keys(meta.data).forEach(function (group) {
      (meta.data[group] || []).forEach(function (m) {
        rows.push({
          group: group,
          name: m.name || "",
          x: m.x,
          y: m.y,
          key: TarkovMapOverrides.markerKey(group, m)
        });
      });
    });
    return rows;
  }

  function paint() {
    var q = (document.getElementById("filterText").value || "").toLowerCase();
    var rows = baseRows().filter(function (r) {
      return !q || (r.name + " " + r.group).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 500);
    document.getElementById("baseBody").innerHTML = rows.map(function (r) {
      var ren = draft.rename[r.key] || "";
      var hid = draft.hide.indexOf(r.key) !== -1;
      return "<tr data-key=\"" + esc(r.key) + "\">" +
        "<td>" + esc(r.group) + "</td>" +
        "<td>" + esc(r.name) + "</td>" +
        "<td>" + r.x + "</td><td>" + r.y + "</td>" +
        "<td><input type=\"text\" class=\"ren\" value=\"" + esc(ren) + "\" style=\"width:100%\"></td>" +
        "<td><input type=\"checkbox\" class=\"hid\"" + (hid ? " checked" : "") + "></td></tr>";
    }).join("");

    document.getElementById("addBody").innerHTML = (draft.add || []).map(function (m, i) {
      return "<tr><td>" + esc(m.name) + "</td><td>" + esc(m.group || "") + "</td><td>" +
        m.x + "</td><td>" + m.y + "</td><td><button type=\"button\" data-i=\"" + i + "\" class=\"btn-ghost del\">×</button></td></tr>";
    }).join("");

    document.querySelectorAll("#addBody .del").forEach(function (b) {
      b.onclick = function () {
        draft.add.splice(+b.getAttribute("data-i"), 1);
        paint();
      };
    });

    document.getElementById("jsonOut").value = JSON.stringify(draft, null, 2);
  }

  function collectFromTable() {
    document.querySelectorAll("#baseBody tr").forEach(function (tr) {
      var k = tr.getAttribute("data-key");
      var ren = tr.querySelector(".ren").value.trim();
      var hid = tr.querySelector(".hid").checked;
      if (ren) draft.rename[k] = ren;
      else delete draft.rename[k];
      var ix = draft.hide.indexOf(k);
      if (hid && ix === -1) draft.hide.push(k);
      if (!hid && ix !== -1) draft.hide.splice(ix, 1);
    });
  }

  document.getElementById("mapSelect").onchange = function () {
    collectFromTable();
    TarkovMapOverrides.set(current, draft);
    current = this.value;
    loadDraft();
  };
  document.getElementById("filterText").oninput = function () {
    collectFromTable();
    paint();
  };
  document.getElementById("btnReload").onclick = function () {
    collectFromTable();
    paint();
  };
  document.getElementById("btnSave").onclick = function () {
    collectFromTable();
    TarkovMapOverrides.set(current, draft);
    paint();
    alert("Сохранено для «" + current + "»");
  };
  document.getElementById("btnAdd").onclick = function () {
    draft.add.push({
      name: document.getElementById("addName").value || "Метка",
      x: Number(document.getElementById("addX").value) || 0,
      y: Number(document.getElementById("addY").value) || 0,
      group: document.getElementById("addGroup").value,
      floor: document.getElementById("addFloor").value || "ground",
      filter: "landmark"
    });
    document.getElementById("addName").value = "";
    paint();
  };
  document.getElementById("btnExport").onclick = function () {
    collectFromTable();
    TarkovMapOverrides.set(current, draft);
    var data = TarkovMapOverrides.exportMap(current);
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "map-overrides-" + current + ".json";
    a.click();
  };
  document.getElementById("btnImport").onclick = function () {
    document.getElementById("fileImport").click();
  };
  document.getElementById("fileImport").onchange = function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        TarkovMapOverrides.importMap(JSON.parse(reader.result));
        current = document.getElementById("mapSelect").value;
        loadDraft();
        alert("Импорт OK");
      } catch (e) {
        alert("Ошибка: " + e.message);
      }
    };
    reader.readAsText(f);
    this.value = "";
  };

  fillMaps();
  loadDraft();
})();
