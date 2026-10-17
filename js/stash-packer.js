/*! stash packer — R3.6 greedy layout */
(function () {
  "use strict";
  var pool = []; // {id,name,w,h,kind}

  function esc(s) {
    return window.TarkovDicts && TarkovDicts.esc ? TarkovDicts.esc(s) :
      String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
  function mode() {
    return (document.getElementById("gameMode") || {}).value || "pve";
  }
  function setStatus(m, t) {
    var el = document.getElementById("status");
    el.textContent = m;
    el.className = "status" + (t ? " " + t : "");
  }

  function gridSize(it) {
    var p = it.properties || {};
    // container interior
    var grids = p.grids || [];
    if (grids.length && grids[0].width) {
      return { w: Number(grids[0].width) || 1, h: Number(grids[0].height) || 1, kind: "case" };
    }
    if (p.propertiesType === "ItemPropertiesBackpack" || p.propertiesType === "ItemPropertiesChestRig") {
      var g = (p.grids && p.grids[0]) || {};
      return { w: Number(g.width) || Number(it.width) || 1, h: Number(g.height) || Number(it.height) || 1, kind: "bag" };
    }
    return { w: Number(it.width) || 1, h: Number(it.height) || 1, kind: "item" };
  }

  function pack(items, cols, rows, strategy) {
    // strategy: top-down, bottom-up, cases-first, min-gap
    var sorted = items.slice();
    if (strategy === "cases-first") {
      sorted.sort(function (a, b) {
        if (a.kind === b.kind) return (b.w * b.h) - (a.w * a.h);
        return a.kind === "case" ? -1 : 1;
      });
    } else if (strategy === "bags-first") {
      sorted.sort(function (a, b) {
        if (a.kind === b.kind) return (b.w * b.h) - (a.w * a.h);
        return a.kind === "bag" ? -1 : 1;
      });
    } else {
      sorted.sort(function (a, b) { return (b.w * b.h) - (a.w * a.h); });
    }
    var grid = [];
    var y;
    for (y = 0; y < rows; y++) {
      grid[y] = [];
      for (var x = 0; x < cols; x++) grid[y][x] = null;
    }
    function free(x0, y0, w, h) {
      if (x0 + w > cols || y0 + h > rows) return false;
      for (var yy = y0; yy < y0 + h; yy++)
        for (var xx = x0; xx < x0 + w; xx++)
          if (grid[yy][xx]) return false;
      return true;
    }
    function fill(x0, y0, w, h, id) {
      for (var yy = y0; yy < y0 + h; yy++)
        for (var xx = x0; xx < x0 + w; xx++)
          grid[yy][xx] = id;
    }
    var placed = [];
    var failed = [];
    sorted.forEach(function (it) {
      var yStart = strategy === "bottom-up" ? rows - it.h : 0;
      var yEnd = strategy === "bottom-up" ? -1 : rows;
      var yStep = strategy === "bottom-up" ? -1 : 1;
      var found = false;
      for (var yy = yStart; strategy === "bottom-up" ? yy >= 0 : yy < rows; yy += yStep) {
        for (var xx = 0; xx <= cols - it.w; xx++) {
          if (free(xx, yy, it.w, it.h)) {
            fill(xx, yy, it.w, it.h, it.id);
            placed.push({ item: it, x: xx, y: yy });
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) failed.push(it);
    });
    return { grid: grid, placed: placed, failed: failed, cols: cols, rows: rows };
  }

  function renderMap(result) {
    var lines = [];
    for (var y = 0; y < result.rows; y++) {
      var row = "";
      for (var x = 0; x < result.cols; x++) {
        var c = result.grid[y][x];
        row += c ? "██" : "··";
      }
      lines.push(row);
    }
    document.getElementById("slotMap").textContent = lines.join("\n");
    var list = document.getElementById("placedList");
    list.innerHTML = result.placed.map(function (p) {
      return "<li>" + esc(p.item.name) + " @ " + p.x + "," + p.y +
        " (" + p.item.w + "×" + p.item.h + ")</li>";
    }).join("") + (result.failed.length
      ? "<li class=\"status err\">Не влезло: " + result.failed.map(function (f) { return esc(f.name); }).join(", ") + "</li>"
      : "");
  }

  document.getElementById("loadBtn").onclick = async function () {
    var btn = this;
    btn.disabled = true;
    setStatus("Загрузка контейнеров…");
    try {
      var items = await TarkovAPI.items(mode());
      pool = [];
      (items || []).forEach(function (it) {
        var types = it.types || [];
        var p = it.properties || {};
        var isCase = types.indexOf("container") >= 0 || /Case|container/i.test(it.normalizedName || "");
        var isBag = p.propertiesType === "ItemPropertiesBackpack" || p.propertiesType === "ItemPropertiesChestRig";
        if (!isCase && !isBag) return;
        if (!p.grids || !p.grids.length) return;
        var g = gridSize(it);
        pool.push({
          id: it.id,
          name: it.shortName || it.name || it.normalizedName,
          w: Math.min(g.w, 6), // footprint on stash — use external size if present
          h: Math.min(g.h, 6),
          extW: Number(it.width) || g.w,
          extH: Number(it.height) || g.h,
          kind: isCase ? "case" : "bag",
          raw: it
        });
      });
      // use external footprint for packing into stash grid
      pool.forEach(function (c) {
        c.w = c.extW || c.w;
        c.h = c.extH || c.h;
      });
      var sel = document.getElementById("pick");
      sel.innerHTML = pool.slice(0, 200).map(function (c) {
        return "<option value=\"" + esc(c.id) + "\">" + esc(c.name) + " (" + c.w + "×" + c.h + " · " + c.kind + ")</option>";
      }).join("");
      setStatus("Контейнеров: " + pool.length, "ok");
    } catch (e) {
      setStatus("Ошибка: " + (e.message || e), "err");
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById("packBtn").onclick = function () {
    var sel = document.getElementById("pick");
    var chosen = Array.prototype.slice.call(sel.selectedOptions).map(function (o) {
      return pool.find(function (p) { return p.id === o.value; });
    }).filter(Boolean);
    if (!chosen.length) {
      setStatus("Выбери кейсы/рюкзаки (Ctrl+клик)", "err");
      return;
    }
    // allow duplicates via count
    var count = Math.max(1, Number(document.getElementById("count").value) || 1);
    var items = [];
    chosen.forEach(function (c) {
      for (var i = 0; i < count; i++) {
        items.push({
          id: c.id + "#" + i,
          name: c.name + (count > 1 ? " #" + (i + 1) : ""),
          w: c.w, h: c.h, kind: c.kind
        });
      }
    });
    var cols = Number(document.getElementById("cols").value) || 10;
    var rows = Number(document.getElementById("rows").value) || 28;
    var strategy = document.getElementById("strategy").value || "top-down";
    var result = pack(items, cols, rows, strategy);
    renderMap(result);
    setStatus("Размещено " + result.placed.length + " / " + items.length, result.failed.length ? "err" : "ok");
  };

  try {
    if (window.TarkovProfile && TarkovProfile.bindGameMode)
      TarkovProfile.bindGameMode("gameMode", { fallback: "pve" });
  } catch (e) {}
})();
