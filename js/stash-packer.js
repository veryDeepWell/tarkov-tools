/*! Stash Packer — R3.21 visual layout and validation */
(function () {
  "use strict";
  var pool = [];
  var selectedIds = new Set();
  var hasLoaded = false;
  var lastResult = null;

  function $(id) { return document.getElementById(id); }
  function esc(value) {
    if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(String(value == null ? "" : value));
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function mode() { return ($("gameMode") && $("gameMode").value) || "pve"; }
  function setStatus(message, tone) {
    var el = $("status");
    if (!el) return;
    el.textContent = message || "";
    el.className = "status" + (tone ? " " + tone : "");
  }
  function normalizedTypes(item) {
    var raw = item && item.types;
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
  }
  function gridsOf(item) {
    var raw = item && item.properties && item.properties.grids;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") return Object.values(raw);
    return [];
  }
  function itemName(item) {
    try { if (window.TarkovItemMedia && TarkovItemMedia.name) return TarkovItemMedia.name(item); } catch (e) {}
    try { if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(item); } catch (e2) {}
    return item.shortName || item.name || item.normalizedName || item.id || "?";
  }
  function itemIcon(item) {
    try { if (window.TarkovItemMedia && TarkovItemMedia.icon) return TarkovItemMedia.icon(item); } catch (e) {}
    return item.displayIconLink || item.iconLink || item.gridImageLink || item.image512pxLink || "";
  }
  function containerInfo(item) {
    var p = item.properties || {}, types = normalizedTypes(item), grids = gridsOf(item);
    var propType = p.propertiesType || "";
    var nameKey = String(item.normalizedName || "").toLowerCase();
    var isBag = propType === "ItemPropertiesBackpack" || propType === "ItemPropertiesChestRig" || /backpack|chest.?rig|tactical.?rig/.test(nameKey);
    var isCase = propType === "ItemPropertiesContainer" || types.indexOf("container") >= 0 || /(^|[-_])(case|thicc|ammo.?box|mag.?box|grenade.?case|item.?case|weapon.?case|key.?tool|docs.?case|dog.?tag.?case)([-_]|$)/.test(nameKey);
    if ((!isCase && !isBag) || !grids.length) return null;
    var extW = Math.floor(Number(item.width) || Number(p.width) || 1);
    var extH = Math.floor(Number(item.height) || Number(p.height) || 1);
    if (extW < 1 || extH < 1 || extW > 12 || extH > 12) return null;
    return {
      id: String(item.id), name: itemName(item), icon: itemIcon(item), w: extW, h: extH,
      kind: isCase ? "case" : "bag", raw: item,
      interior: grids.reduce(function (sum, g) { return sum + (Number(g.width) || 0) * (Number(g.height) || 0); }, 0)
    };
  }
  function updateSelectedCount() {
    var el = $("selectedCount");
    if (el) el.textContent = String(selectedIds.size);
  }
  function filterOptions() {
    var q = String(($("containerSearch") && $("containerSearch").value) || "").trim().toLowerCase();
    var list = $("pickList");
    if (!list) return;
    list.querySelectorAll(".container-option").forEach(function (row) {
      row.hidden = !!q && String(row.getAttribute("data-filter-text") || "").indexOf(q) < 0;
    });
  }
  function renderPoolOptions() {
    var list = $("pickList");
    if (!list) return;
    var existing = new Set(pool.map(function (c) { return c.id; }));
    selectedIds = new Set(Array.from(selectedIds).filter(function (id) { return existing.has(id); }));
    list.innerHTML = pool.map(function (c) {
      var label = (c.name + " " + c.id + " " + c.kind + " " + c.w + "x" + c.h).toLowerCase();
      return '<label class="container-option" data-filter-text="' + esc(label) + '">' +
        '<input type="checkbox" class="container-check" value="' + esc(c.id) + '"' + (selectedIds.has(c.id) ? " checked" : "") + '>' +
        (c.icon ? '<img src="' + esc(c.icon) + '" alt="" loading="lazy" data-item-id="' + esc(c.id) + '" data-item-name="' + esc(c.name) + '" onerror="this.hidden=true">' : "") +
        '<span style="min-width:0;flex:1"><span class="container-name">' + esc(c.name) + '</span>' +
        '<span class="container-meta" style="display:block">' + c.w + "×" + c.h + " снаружи · " +
        (c.kind === "case" ? "кейс" : "рюкзак/разгрузка") + " · " + c.interior + " внутренних слотов</span></span></label>";
    }).join("") || '<div class="meta">Подходящие контейнеры не найдены.</div>';
    list.querySelectorAll(".container-check").forEach(function (input) {
      input.addEventListener("change", function () {
        if (input.checked) selectedIds.add(input.value);
        else selectedIds.delete(input.value);
        updateSelectedCount();
      });
    });
    filterOptions(); updateSelectedCount();
  }
  function validDimensions(cols, rows) {
    cols = Math.floor(Number(cols)); rows = Math.floor(Number(rows));
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 4 || rows < 4 || cols > 30 || rows > 50) {
      throw new Error("Размер сетки должен быть: ширина 4–30, высота 4–50 слотов");
    }
    return { cols: cols, rows: rows };
  }
  function pack(items, cols, rows, strategy, allowRotate) {
    var sorted = items.slice();
    if (strategy === "cases-first") {
      sorted.sort(function (a, b) { return (a.kind === b.kind ? b.w * b.h - a.w * a.h : a.kind === "case" ? -1 : 1); });
    } else if (strategy === "bags-first") {
      sorted.sort(function (a, b) { return (a.kind === b.kind ? b.w * b.h - a.w * a.h : a.kind === "bag" ? -1 : 1); });
    } else sorted.sort(function (a, b) { return b.w * b.h - a.w * a.h; });

    var cells = Array.from({ length: rows }, function () { return Array(cols).fill(null); });
    function free(x0, y0, w, h) {
      if (w < 1 || h < 1 || x0 < 0 || y0 < 0 || x0 + w > cols || y0 + h > rows) return false;
      for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) if (cells[yy][xx]) return false;
      return true;
    }
    function fill(x0, y0, w, h, uid) {
      for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) cells[yy][xx] = uid;
    }
    var placed = [], failed = [];
    sorted.forEach(function (item) {
      var shapes = [{ w: item.w, h: item.h, rotated: false }];
      if (allowRotate && item.w !== item.h) shapes.push({ w: item.h, h: item.w, rotated: true });
      var found = null;
      for (var si = 0; si < shapes.length && !found; si++) {
        var shape = shapes[si];
        if (shape.w > cols || shape.h > rows) continue;
        var yStart = strategy === "bottom-up" ? rows - shape.h : 0;
        var yStop = strategy === "bottom-up" ? -1 : rows - shape.h + 1;
        var yStep = strategy === "bottom-up" ? -1 : 1;
        for (var y = yStart; strategy === "bottom-up" ? y > yStop : y < yStop; y += yStep) {
          for (var x = 0; x <= cols - shape.w; x++) {
            if (free(x, y, shape.w, shape.h)) { found = { x: x, y: y, w: shape.w, h: shape.h, rotated: shape.rotated }; break; }
          }
          if (found) break;
        }
      }
      if (!found) { failed.push(item); return; }
      fill(found.x, found.y, found.w, found.h, item.uid);
      placed.push({ item: item, x: found.x, y: found.y, w: found.w, h: found.h, rotated: found.rotated });
    });
    return { grid: cells, placed: placed, failed: failed, cols: cols, rows: rows };
  }
  function renderMap(result) {
    var board = $("slotMap"), list = $("placedList"), summary = $("resultSummary");
    if (!board) return;
    board.style.gridTemplateColumns = "repeat(" + result.cols + ", minmax(30px, 40px))";
    board.style.gridTemplateRows = "repeat(" + result.rows + ", 42px)";
    board.style.backgroundSize = "42px 44px";
    board.style.backgroundPosition = "4px 4px";
    board.innerHTML = result.placed.map(function (p) {
      var item = p.item;
      var title = item.name + " · " + p.w + "×" + p.h + (p.rotated ? " · повёрнут" : "");
      return '<div class="stash-piece" title="' + esc(title) + '" data-item-id="' + esc(item.itemId || item.id) + '" data-item-name="' + esc(item.name) + '"' +
        ' style="grid-column:' + (p.x + 1) + ' / span ' + p.w + ';grid-row:' + (p.y + 1) + ' / span ' + p.h + ';" tabindex="0">' +
        (item.icon ? '<img src="' + esc(item.icon) + '" alt="" loading="lazy" onerror="this.hidden=true">' : "") +
        '<strong>' + esc(item.name) + '</strong><small>' + p.w + "×" + p.h + (p.rotated ? " ↻" : "") + "</small></div>";
    }).join("");
    if (summary) {
      var occupied = result.placed.reduce(function (sum, p) { return sum + p.w * p.h; }, 0);
      summary.innerHTML = '<span>Размещено: <strong>' + result.placed.length + " / " + (result.placed.length + result.failed.length) +
        '</strong></span><span>Занято: <strong>' + occupied + " / " + (result.cols * result.rows) + " слотов</strong></span><span>Заполнение: <strong>" +
        Math.round(occupied / (result.cols * result.rows) * 100) + "%</strong></span><span>Не влезло: <strong>" + result.failed.length + "</strong></span>";
    }
    if (list) {
      var placedRows = result.placed.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }).map(function (p) {
        return '<li><strong>' + esc(p.item.name) + '</strong> · столбец ' + (p.x + 1) + ', ряд ' + (p.y + 1) +
          ' · ' + p.w + "×" + p.h + (p.rotated ? " · повёрнут" : "") + "</li>";
      });
      if (result.failed.length) placedRows.push('<li class="status err"><strong>Не поместились:</strong> ' + result.failed.map(function (it) { return esc(it.name); }).join(", ") + "</li>");
      list.innerHTML = placedRows.length ? placedRows.join("") : '<li class="meta">Нет результата. Проверь выбор контейнеров.</li>';
    }
    lastResult = result;
  }
  async function load() {
    var btn = $("loadBtn");
    if (btn) btn.disabled = true;
    setStatus("Загрузка контейнеров…");
    try {
      if (!window.TarkovAPI || typeof TarkovAPI.items !== "function") throw new Error("TarkovAPI не подключён");
      var items = await TarkovAPI.items(mode());
      var seen = new Set();
      pool = [];
      (Array.isArray(items) ? items : []).forEach(function (item) {
        if (!item || !item.id || seen.has(item.id)) return;
        var info = containerInfo(item);
        if (!info) return;
        seen.add(item.id); pool.push(info);
      });
      pool.sort(function (a, b) { return a.name.localeCompare(b.name, "ru"); });
      renderPoolOptions(); hasLoaded = true;
      if (!pool.length) setStatus("API ответил, но контейнеры с сетками не найдены. Проверь свойства предметов.", "err");
      else setStatus("Загружено контейнеров: " + pool.length + ". Выбери несколько и нажми «Уложить».", "ok");
    } catch (err) {
      setStatus("Не удалось загрузить контейнеры: " + (err && err.message ? err.message : err), "err");
    } finally { if (btn) btn.disabled = false; }
  }
  function runPack() {
    var chosen = pool.filter(function (p) { return selectedIds.has(p.id); });
    if (!chosen.length) { setStatus("Сначала выбери хотя бы один контейнер из списка", "err"); return; }
    try {
      var sizes = validDimensions($("cols").value, $("rows").value);
      var count = Math.max(1, Math.min(20, Math.floor(Number($("count").value) || 1)));
      $("count").value = String(count);
      var items = [];
      chosen.forEach(function (c) {
        for (var i = 0; i < count; i++) {
          items.push({ uid: c.id + "#" + i, id: c.id + "#" + i, itemId: c.id, name: c.name + (count > 1 ? " #" + (i + 1) : ""),
            w: c.w, h: c.h, kind: c.kind, icon: c.icon, raw: c.raw });
        }
      });
      var result = pack(items, sizes.cols, sizes.rows, $("strategy").value || "top-down", !!$("rotateItems").checked);
      renderMap(result);
      setStatus("Раскладка рассчитана. Проверь список не поместившихся контейнеров перед выбором.", result.failed.length ? "err" : "ok");
    } catch (err) { setStatus(err.message || String(err), "err"); }
  }
  function render() { if (hasLoaded) load(); }
  function wire() {
    if ($("loadBtn")) $("loadBtn").addEventListener("click", load);
    if ($("packBtn")) $("packBtn").addEventListener("click", runPack);
    if ($("pickList")) $("pickList").addEventListener("change", updateSelectedCount);
    if ($("containerSearch")) $("containerSearch").addEventListener("input", filterOptions);
    if ($("selectAllBtn")) $("selectAllBtn").addEventListener("click", function () {
      pool.forEach(function (item) { selectedIds.add(item.id); });
      if ($("pickList")) $("pickList").querySelectorAll(".container-check").forEach(function (input) { input.checked = true; });
      updateSelectedCount();
    });
    if ($("clearSelectionBtn")) $("clearSelectionBtn").addEventListener("click", function () {
      selectedIds.clear();
      if ($("pickList")) $("pickList").querySelectorAll(".container-check").forEach(function (input) { input.checked = false; });
      updateSelectedCount();
    });
    if ($("gameMode")) $("gameMode").addEventListener("change", load);
    try {
      if (window.TarkovProfile && TarkovProfile.bindGameMode) TarkovProfile.bindGameMode("gameMode", { fallback: "pve" });
    } catch (e) {}
    window.render = render;
    window.onProfileRefresh = render;
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
