/* Interactive map admin editor */
(function () {
  "use strict";

  var MAPS = window.TT_MAPS || {};
  var ORDER = window.TT_MAP_ORDER || Object.keys(MAPS);
  var current = ORDER[0] || "customs";
  var currentFloor = "ground";
  var draft = null;
  var map = null;
  var layer = null;
  var baseLayer = null;
  var addMode = false;
  var BOUNDS = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function enterApp() {
    document.getElementById("gate").style.display = "none";
    document.getElementById("app").style.display = "flex";
    init();
  }

  function gate() {
    var btn = document.getElementById("btnGate");
    function tryIn() {
      if (window.TarkovSessionGate && TarkovSessionGate.isElevated()) {
        enterApp();
        return;
      }
      if (TarkovSessionGate.promptElevate()) enterApp();
    }
    btn.onclick = tryIn;
    /* if opened from elevated hub same tab memory is lost — always prompt */
    if (TarkovSessionGate && TarkovSessionGate.isElevated()) enterApp();
  }

  function status(msg) {
    document.getElementById("status").textContent = msg || "";
  }

  function loadDraft() {
    draft = TarkovMapOverrides.get(current);
    draft.rename = draft.rename || {};
    draft.hide = draft.hide || [];
    draft.add = draft.add || [];
    draft.labels = draft.labels || [];
  }

  function fillMaps() {
    var sel = document.getElementById("mapSelect");
    sel.innerHTML = ORDER.filter(function (id) { return MAPS[id]; }).map(function (id) {
      return '<option value="' + esc(id) + '"' + (id === current ? " selected" : "") + ">" +
        esc(MAPS[id].title || id) + "</option>";
    }).join("");
  }

  function floorsFor(meta) {
    var floors = (meta && meta.floors) || ["ground"];
    if (!floors.length) floors = ["ground"];
    return floors;
  }

  function setBackground(meta) {
    if (baseLayer) { map.removeLayer(baseLayer); baseLayer = null; }
    var floors = floorsFor(meta);
    var floor = currentFloor;
    if (floors.indexOf(floor) < 0) floor = floors[0];
    currentFloor = floor;
    var b = meta.bounds || { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    BOUNDS = L.latLngBounds(L.latLng(b.minY, b.minX), L.latLng(b.maxY, b.maxX));
    map.setMaxBounds(BOUNDS.pad(0.05));
    var url = null;
    if (meta.floorImages && meta.floorImages[floor]) url = meta.floorImages[floor];
    else if (meta.image) url = meta.image;
    else if (meta.svg) url = meta.svg;
    if (url) {
      baseLayer = L.imageOverlay(url, BOUNDS);
      baseLayer.addTo(map);
    }
    map.fitBounds(BOUNDS, { padding: [12, 12] });
    var fs = document.getElementById("floorSelect");
    fs.innerHTML = floors.map(function (f) {
      return '<option value="' + esc(f) + '"' + (f === floor ? " selected" : "") + ">" + esc(f) + "</option>";
    }).join("");
  }

  function appliedData() {
    var meta = MAPS[current];
    var data = (meta && meta.data) || {};
    return TarkovMapOverrides.apply(current, data);
  }

  function iconFor(m) {
    var letter = (m.name || "?").charAt(0).toUpperCase();
    return L.divIcon({
      className: "tt-admin-icon",
      html: "<span>" + esc(letter) + "</span>",
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  }

  function openEditor(marker, payload, isNew) {
    var m = payload;
    var html =
      '<div class="popup-form">' +
      '<label>Название</label><input type="text" data-f="name" value="' + esc(m.name || "") + '">' +
      '<label>Группа</label><select data-f="group">' +
      ["landmarks","tasks","extracts","spawns","lootables","looseLoot","hazards","switches"].map(function (g) {
        return '<option value="' + g + '"' + ((m.group || m._group) === g ? " selected" : "") + ">" + g + "</option>";
      }).join("") +
      "</select>" +
      '<label>Фильтр / тип</label><input type="text" data-f="filter" value="' + esc(m.filter || "landmark") + '">' +
      '<label>Этаж</label><input type="text" data-f="floor" value="' + esc(m.floor || currentFloor || "ground") + '">' +
      '<div class="row"><div><label>X</label><input type="number" step="any" data-f="x" value="' + esc(m.x) + '"></div>' +
      '<div><label>Y</label><input type="number" step="any" data-f="y" value="' + esc(m.y) + '"></div></div>' +
      '<label>Заметка</label><textarea data-f="note" rows="2">' + esc(m.note || "") + "</textarea>" +
      (m._key ? '<label><input type="checkbox" data-f="hide"' + (m._hidden ? " checked" : "") + "> Скрыть базовую метку</label>" : "") +
      '<div class="row" style="margin-top:8px">' +
      '<button type="button" class="btn" data-act="save">OK</button>' +
      (isNew || m._added != null ? '<button type="button" class="btn-ghost" data-act="del">Удалить</button>' : "") +
      "</div></div>";
    marker.bindPopup(html, { maxWidth: 280 }).openPopup();
    setTimeout(function () {
      var root = marker.getPopup().getElement();
      if (!root) return;
      var form = root.querySelector(".popup-form");
      form.querySelector('[data-act="save"]').onclick = function () {
        var val = function (f) {
          var el = form.querySelector('[data-f="' + f + '"]');
          if (!el) return null;
          if (el.type === "checkbox") return el.checked;
          return el.value;
        };
        var name = val("name") || "Метка";
        var x = Number(val("x"));
        var y = Number(val("y"));
        var group = val("group") || "landmarks";
        var filter = val("filter") || "landmark";
        var floor = val("floor") || "ground";
        var note = val("note") || "";
        if (m._key) {
          var oldName = m._baseName || m.name;
          if (name !== oldName) draft.rename[m._key] = name;
          else delete draft.rename[m._key];
          var hide = !!val("hide");
          var ix = draft.hide.indexOf(m._key);
          if (hide && ix < 0) draft.hide.push(m._key);
          if (!hide && ix >= 0) draft.hide.splice(ix, 1);
        } else if (m._added != null) {
          draft.add[m._added] = {
            name: name, x: x, y: y, group: group, filter: filter, floor: floor, note: note
          };
        } else if (isNew) {
          draft.add.push({
            name: name, x: x, y: y, group: group, filter: filter, floor: floor, note: note
          });
        }
        marker.setLatLng([y, x]);
        marker.closePopup();
        redraw();
        status("Черновик изменён (не забудь Сохранить / Экспорт)");
      };
      var del = form.querySelector('[data-act="del"]');
      if (del) {
        del.onclick = function () {
          if (m._added != null) draft.add.splice(m._added, 1);
          marker.closePopup();
          redraw();
        };
      }
    }, 0);
  }

  function redraw() {
    if (layer) { map.removeLayer(layer); }
    layer = L.layerGroup().addTo(map);
    var meta = MAPS[current];
    var raw = (meta && meta.data) || {};
    Object.keys(raw).forEach(function (group) {
      (raw[group] || []).forEach(function (m) {
        var key = TarkovMapOverrides.markerKey(group, m);
        var hidden = draft.hide.indexOf(key) >= 0;
        var name = draft.rename[key] || m.name || "";
        if (m.floor && currentFloor && m.floor !== currentFloor && m.floor !== "all") return;
        var mk = L.marker([m.y, m.x], {
          icon: iconFor({ name: name }),
          opacity: hidden ? 0.35 : 1,
          draggable: true
        });
        mk.__payload = {
          name: name, x: m.x, y: m.y, filter: m.filter, floor: m.floor || "ground",
          group: group, _group: group, _key: key, _baseName: m.name, _hidden: hidden
        };
        mk.on("click", function () { openEditor(mk, mk.__payload, false); });
        mk.on("dragend", function () {
          var ll = mk.getLatLng();
          /* base markers: store as rename-only isn't enough for move — convert to hide+add */
          var payload = mk.__payload;
          if (payload._key) {
            if (draft.hide.indexOf(payload._key) < 0) draft.hide.push(payload._key);
            draft.add.push({
              name: payload.name,
              x: ll.lng,
              y: ll.lat,
              group: payload.group,
              filter: payload.filter || "landmark",
              floor: payload.floor || currentFloor,
              note: "moved from base"
            });
            status("Базовая метка скрыта, добавлена копия со сдвигом");
            redraw();
          }
        });
        mk.addTo(layer);
      });
    });
    (draft.add || []).forEach(function (m, i) {
      if (m.floor && currentFloor && m.floor !== currentFloor && m.floor !== "all") return;
      var mk = L.marker([m.y, m.x], { icon: iconFor(m), draggable: true });
      mk.__payload = Object.assign({ _added: i, group: m.group }, m);
      mk.on("click", function () { openEditor(mk, mk.__payload, false); });
      mk.on("dragend", function () {
        var ll = mk.getLatLng();
        draft.add[i].x = ll.lng;
        draft.add[i].y = ll.lat;
        status("Позиция обновлена");
      });
      mk.addTo(layer);
    });
  }

  function loadMap(id) {
    if (id) current = id;
    loadDraft();
    var meta = MAPS[current];
    if (!meta) return;
    setBackground(meta);
    redraw();
    status(meta.title || current);
  }

  function init() {
    fillMaps();
    map = L.map("map", { crs: L.CRS.Simple, minZoom: -5, maxZoom: 4 });
    document.getElementById("mapSelect").onchange = function () {
      current = this.value;
      loadMap(current);
    };
    document.getElementById("floorSelect").onchange = function () {
      currentFloor = this.value;
      setBackground(MAPS[current]);
      redraw();
    };
    document.getElementById("btnAddMode").onclick = function () {
      addMode = !addMode;
      this.textContent = addMode ? "Клик по карте…" : "+ Метка";
      status(addMode ? "Кликните по карте, чтобы поставить метку" : "");
    };
    map.on("click", function (e) {
      if (!addMode) return;
      addMode = false;
      document.getElementById("btnAddMode").textContent = "+ Метка";
      var m = {
        name: "Новая метка",
        x: e.latlng.lng,
        y: e.latlng.lat,
        group: "landmarks",
        filter: "landmark",
        floor: currentFloor || "ground"
      };
      draft.add.push(m);
      redraw();
      /* open last */
      status("Метка добавлена — кликните её для правки");
    });
    document.getElementById("btnSave").onclick = function () {
      TarkovMapOverrides.set(current, draft);
      status("Сохранено в localStorage");
    };
    document.getElementById("btnExport").onclick = function () {
      TarkovMapOverrides.set(current, draft);
      var data = TarkovMapOverrides.exportMap(current);
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "map-overrides-" + current + ".json";
      a.click();
      status("Экспорт JSON");
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
          loadDraft();
          redraw();
          status("Импорт OK");
        } catch (err) {
          (window.TarkovUI && TarkovUI.softAlert ? TarkovUI.softAlert.bind(TarkovUI) : function(m,o){ var el=document.getElementById("status"); if(el){ el.textContent=m; el.className="status err"; } })(err.message, { tone: "err" });
        }
      };
      reader.readAsText(f);
      this.value = "";
    };
    loadMap(current);
  }

  gate();
})();
