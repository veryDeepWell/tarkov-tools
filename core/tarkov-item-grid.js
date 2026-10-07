/**
 * TarkovItemGrid — reusable tetris-style item table (inventory grid).
 *
 * Usage:
 *   var grid = TarkovItemGrid.create(hostEl, { cols: 8, rows: 8, cellSize: 36 });
 *   grid.addItem({ id, name, w, h, meta, data }, x?, y?);
 *   grid.clear(); grid.getItems(); grid.pack(candidates, { orderBy });
 */
(function (global) {
  "use strict";
  if (global.TarkovItemGrid && global.TarkovItemGrid.__v >= 1) return;

  var uidSeq = 0;
  function nextUid() {
    uidSeq += 1;
    return "ig" + uidSeq + "_" + Date.now().toString(36);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function sizeOf(item) {
    var w = Math.max(1, Math.floor(Number(item.w) || Number(item.width) || 1));
    var h = Math.max(1, Math.floor(Number(item.h) || Number(item.height) || 1));
    return { w: w, h: h };
  }

  function create(host, opts) {
    opts = opts || {};
    if (!host) throw new Error("TarkovItemGrid.create: host required");

    var state = {
      cols: Math.max(1, Math.floor(opts.cols || 8)),
      rows: Math.max(1, Math.floor(opts.rows || 3)),
      cellSize: Math.max(20, Math.floor(opts.cellSize || 36)),
      readonly: !!opts.readonly,
      onChange: typeof opts.onChange === "function" ? opts.onChange : null,
      items: [], // { uid, id, name, w, h, x, y, meta, data, el }
      drag: null,
      ghost: null
    };

    host.classList.add("tt-igrid");
    if (state.readonly) host.classList.add("readonly");
    host.innerHTML = "";

    var toolbar = document.createElement("div");
    toolbar.className = "tt-igrid-toolbar";
    host.appendChild(toolbar);

    var board = document.createElement("div");
    board.className = "tt-igrid-board";
    host.appendChild(board);

    function emit() {
      if (state.onChange) {
        try {
          state.onChange(getItems());
        } catch (e) {}
      }
      paintToolbar();
    }

    function paintToolbar() {
      var used = 0;
      state.items.forEach(function (it) {
        used += it.w * it.h;
      });
      var total = state.cols * state.rows;
      toolbar.innerHTML =
        "<span><strong>" +
        used +
        "</strong> / " +
        total +
        " слотов</span>" +
        "<span>· сетка " +
        state.cols +
        "×" +
        state.rows +
        "</span>" +
        "<span>· предметов: <strong>" +
        state.items.length +
        "</strong></span>";
    }

    function layoutBoard() {
      var w = state.cols * state.cellSize;
      var h = state.rows * state.cellSize;
      board.style.width = w + "px";
      board.style.height = h + "px";
      board.style.backgroundSize = state.cellSize + "px " + state.cellSize + "px";
      state.items.forEach(positionEl);
      paintToolbar();
    }

    function positionEl(it) {
      if (!it.el) return;
      it.el.style.left = it.x * state.cellSize + "px";
      it.el.style.top = it.y * state.cellSize + "px";
      it.el.style.width = it.w * state.cellSize + "px";
      it.el.style.height = it.h * state.cellSize + "px";
    }

    function occupiedMap(excludeUid) {
      var map = [];
      var i, j;
      for (i = 0; i < state.rows; i++) {
        map[i] = [];
        for (j = 0; j < state.cols; j++) map[i][j] = false;
      }
      state.items.forEach(function (it) {
        if (excludeUid && it.uid === excludeUid) return;
        var y, x;
        for (y = it.y; y < it.y + it.h; y++) {
          for (x = it.x; x < it.x + it.w; x++) {
            if (y >= 0 && y < state.rows && x >= 0 && x < state.cols) map[y][x] = true;
          }
        }
      });
      return map;
    }

    function canPlace(w, h, x, y, excludeUid) {
      if (x < 0 || y < 0 || x + w > state.cols || y + h > state.rows) return false;
      var map = occupiedMap(excludeUid);
      var yy, xx;
      for (yy = y; yy < y + h; yy++) {
        for (xx = x; xx < x + w; xx++) {
          if (map[yy][xx]) return false;
        }
      }
      return true;
    }

    function findSlot(w, h, excludeUid) {
      var y, x;
      for (y = 0; y <= state.rows - h; y++) {
        for (x = 0; x <= state.cols - w; x++) {
          if (canPlace(w, h, x, y, excludeUid)) return { x: x, y: y };
        }
      }
      // try rotated
      if (w !== h) {
        for (y = 0; y <= state.rows - w; y++) {
          for (x = 0; x <= state.cols - h; x++) {
            if (canPlace(h, w, x, y, excludeUid)) return { x: x, y: y, rot: true };
          }
        }
      }
      return null;
    }

    function ensureGhost() {
      if (state.ghost) return state.ghost;
      var g = document.createElement("div");
      g.className = "tt-igrid-ghost";
      g.hidden = true;
      board.appendChild(g);
      state.ghost = g;
      return g;
    }

    function showGhost(w, h, x, y, ok) {
      var g = ensureGhost();
      g.hidden = false;
      g.className = "tt-igrid-ghost " + (ok ? "ok" : "bad");
      g.style.left = x * state.cellSize + "px";
      g.style.top = y * state.cellSize + "px";
      g.style.width = w * state.cellSize + "px";
      g.style.height = h * state.cellSize + "px";
    }

    function hideGhost() {
      if (state.ghost) state.ghost.hidden = true;
    }

    function buildItemEl(it) {
      var el = document.createElement("div");
      el.className = "tt-igrid-item";
      el.setAttribute("data-uid", it.uid);
      el.innerHTML =
        '<button type="button" class="tt-ig-x" title="Убрать" aria-label="Remove">×</button>' +
        '<div class="tt-ig-name"></div>' +
        '<div class="tt-ig-meta"></div>';
      el.querySelector(".tt-ig-name").textContent = it.name || it.id || "?";
      el.querySelector(".tt-ig-meta").textContent =
        it.w + "×" + it.h + (it.meta ? " · " + it.meta : "");
      var btnX = el.querySelector(".tt-ig-x");
      btnX.addEventListener("click", function (e) {
        e.stopPropagation();
        removeItem(it.uid);
      });
      if (!state.readonly) bindDrag(el, it);
      return el;
    }

    function pointerCell(ev) {
      var rect = board.getBoundingClientRect();
      var px = (ev.clientX != null ? ev.clientX : 0) - rect.left;
      var py = (ev.clientY != null ? ev.clientY : 0) - rect.top;
      return {
        x: clamp(Math.floor(px / state.cellSize), 0, state.cols - 1),
        y: clamp(Math.floor(py / state.cellSize), 0, state.rows - 1)
      };
    }

    function bindDrag(el, it) {
      el.addEventListener("pointerdown", function (ev) {
        if (state.readonly) return;
        if (ev.target && ev.target.classList && ev.target.classList.contains("tt-ig-x")) return;
        if (ev.button != null && ev.button !== 0) return;
        ev.preventDefault();
        el.setPointerCapture(ev.pointerId);
        el.classList.add("is-dragging");
        state.drag = {
          uid: it.uid,
          ox: it.x,
          oy: it.y,
          w: it.w,
          h: it.h,
          grabX: pointerCell(ev).x - it.x,
          grabY: pointerCell(ev).y - it.y
        };
      });
      el.addEventListener("pointermove", function (ev) {
        if (!state.drag || state.drag.uid !== it.uid) return;
        var cell = pointerCell(ev);
        var nx = clamp(cell.x - state.drag.grabX, 0, state.cols - it.w);
        var ny = clamp(cell.y - state.drag.grabY, 0, state.rows - it.h);
        var ok = canPlace(it.w, it.h, nx, ny, it.uid);
        showGhost(it.w, it.h, nx, ny, ok);
        it.x = nx;
        it.y = ny;
        positionEl(it);
      });
      function endDrag(ev) {
        if (!state.drag || state.drag.uid !== it.uid) return;
        el.classList.remove("is-dragging");
        hideGhost();
        var ok = canPlace(it.w, it.h, it.x, it.y, it.uid);
        if (!ok) {
          it.x = state.drag.ox;
          it.y = state.drag.oy;
          positionEl(it);
        }
        state.drag = null;
        emit();
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch (e) {}
      }
      el.addEventListener("pointerup", endDrag);
      el.addEventListener("pointercancel", endDrag);
    }

    function addItem(raw, x, y) {
      if (!raw) return null;
      var sz = sizeOf(raw);
      var w = sz.w;
      var h = sz.h;
      if (w > state.cols || h > state.rows) {
        if (h <= state.cols && w <= state.rows) {
          var t = w;
          w = h;
          h = t;
        } else {
          return null;
        }
      }
      var pos = null;
      if (x != null && y != null && canPlace(w, h, x, y)) {
        pos = { x: x, y: y };
      } else {
        pos = findSlot(w, h);
        if (pos && pos.rot) {
          var tmp = w;
          w = h;
          h = tmp;
        }
      }
      if (!pos) return null;
      var it = {
        uid: nextUid(),
        id: raw.id || null,
        name: raw.name || raw.shortName || raw.id || "item",
        w: w,
        h: h,
        x: pos.x,
        y: pos.y,
        meta: raw.meta || "",
        data: raw.data != null ? raw.data : raw
      };
      it.el = buildItemEl(it);
      board.appendChild(it.el);
      positionEl(it);
      state.items.push(it);
      emit();
      return it;
    }

    function removeItem(uid) {
      var i = state.items.findIndex(function (x) {
        return x.uid === uid;
      });
      if (i < 0) return false;
      var it = state.items[i];
      if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
      state.items.splice(i, 1);
      emit();
      return true;
    }

    function clear() {
      state.items.forEach(function (it) {
        if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
      });
      state.items = [];
      hideGhost();
      emit();
    }

    function getItems() {
      return state.items.map(function (it) {
        return {
          uid: it.uid,
          id: it.id,
          name: it.name,
          w: it.w,
          h: it.h,
          x: it.x,
          y: it.y,
          meta: it.meta,
          data: it.data
        };
      });
    }

    function setSize(cols, rows) {
      state.cols = Math.max(1, Math.floor(cols || state.cols));
      state.rows = Math.max(1, Math.floor(rows || state.rows));
      // drop items that no longer fit
      var keep = [];
      state.items.forEach(function (it) {
        if (it.x + it.w <= state.cols && it.y + it.h <= state.rows && canPlace(it.w, it.h, it.x, it.y, it.uid)) {
          keep.push(it);
        } else if (it.el && it.el.parentNode) {
          it.el.parentNode.removeChild(it.el);
        }
      });
      // re-validate overlaps after shrink
      state.items = [];
      keep.forEach(function (it) {
        if (canPlace(it.w, it.h, it.x, it.y)) {
          state.items.push(it);
          positionEl(it);
        } else if (it.el && it.el.parentNode) {
          it.el.parentNode.removeChild(it.el);
        }
      });
      layoutBoard();
      emit();
    }

    /**
     * Greedy pack candidates into empty grid (clears first if opts.clear !== false).
     * candidate: { id, name, w, h, meta, data, score? }
     * opts.orderBy: 'score' | function
     */
    function pack(candidates, packOpts) {
      packOpts = packOpts || {};
      if (packOpts.clear !== false) clear();
      var list = (candidates || []).slice();
      if (typeof packOpts.orderBy === "function") {
        list.sort(packOpts.orderBy);
      } else {
        list.sort(function (a, b) {
          return (Number(b.score) || 0) - (Number(a.score) || 0);
        });
      }
      var placed = [];
      list.forEach(function (c) {
        var res = addItem(c);
        if (res) placed.push(res);
      });
      return placed;
    }

    function usedSlots() {
      var n = 0;
      state.items.forEach(function (it) {
        n += it.w * it.h;
      });
      return n;
    }

    layoutBoard();

    return {
      addItem: addItem,
      removeItem: removeItem,
      clear: clear,
      getItems: getItems,
      setSize: setSize,
      pack: pack,
      canPlace: function (w, h, x, y) {
        return canPlace(w, h, x, y);
      },
      findSlot: findSlot,
      usedSlots: usedSlots,
      totalSlots: function () {
        return state.cols * state.rows;
      },
      cols: function () {
        return state.cols;
      },
      rows: function () {
        return state.rows;
      },
      destroy: function () {
        clear();
        host.innerHTML = "";
        host.classList.remove("tt-igrid", "readonly");
      }
    };
  }

  /** Helpers for Tarkov API items */
  function dimsFromItem(it) {
    if (!it) return { w: 1, h: 1 };
    var w = Number(it.width) || 0;
    var h = Number(it.height) || 0;
    var p = it.properties || {};
    if (!w && p.width) w = Number(p.width) || 0;
    if (!h && p.height) h = Number(p.height) || 0;
    if (!w) w = 1;
    if (!h) h = 1;
    return { w: Math.max(1, Math.floor(w)), h: Math.max(1, Math.floor(h)) };
  }

  global.TarkovItemGrid = {
    __v: 1,
    create: create,
    dimsFromItem: dimsFromItem
  };
})(typeof window !== "undefined" ? window : this);
