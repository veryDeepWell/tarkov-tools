/**
 * TarkovItemGrid — tetris inventory like EFT (drag + rotate).
 * R while dragging/selected = rotate 90°.
 */
(function (global) {
  "use strict";

  var uidSeq = 0;
  function nextUid() {
    uidSeq += 1;
    return "ig" + uidSeq;
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
    if (!host) throw new Error("TarkovItemGrid: host element required");

    var state = {
      cols: Math.max(1, Math.floor(opts.cols || 8)),
      rows: Math.max(1, Math.floor(opts.rows || 3)),
      cell: Math.max(24, Math.floor(opts.cellSize || 44)),
      readonly: !!opts.readonly,
      onChange: typeof opts.onChange === "function" ? opts.onChange : null,
      items: [],
      selected: null,
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
    board.tabIndex = 0;
    host.appendChild(board);

    var hint = document.createElement("div");
    hint.className = "tt-igrid-hint";
    hint.textContent = "ЛКМ — таскать · R — повернуть · × — убрать";
    host.appendChild(hint);

    function emit() {
      paintToolbar();
      if (state.onChange) {
        try { state.onChange(getItems()); } catch (e) {}
      }
    }

    function paintToolbar() {
      var used = 0;
      state.items.forEach(function (it) { used += it.w * it.h; });
      toolbar.innerHTML =
        "<span><strong>" + used + "</strong>/" + (state.cols * state.rows) + "</span>" +
        "<span>" + state.cols + "×" + state.rows + "</span>" +
        "<span>предметов: <strong>" + state.items.length + "</strong></span>";
    }

    function layoutBoard() {
      board.style.width = state.cols * state.cell + "px";
      board.style.height = state.rows * state.cell + "px";
      board.style.backgroundSize = state.cell + "px " + state.cell + "px";
      state.items.forEach(positionEl);
      paintToolbar();
    }

    function positionEl(it) {
      if (!it.el) return;
      it.el.style.left = it.x * state.cell + "px";
      it.el.style.top = it.y * state.cell + "px";
      it.el.style.width = it.w * state.cell - 2 + "px";
      it.el.style.height = it.h * state.cell - 2 + "px";
      it.el.classList.toggle("selected", state.selected === it.uid);
    }

    function occupied(excludeUid) {
      var map = [];
      var r, c;
      for (r = 0; r < state.rows; r++) {
        map[r] = [];
        for (c = 0; c < state.cols; c++) map[r][c] = null;
      }
      state.items.forEach(function (it) {
        if (excludeUid && it.uid === excludeUid) return;
        var y, x;
        for (y = it.y; y < it.y + it.h; y++) {
          for (x = it.x; x < it.x + it.w; x++) {
            if (y >= 0 && y < state.rows && x >= 0 && x < state.cols) map[y][x] = it.uid;
          }
        }
      });
      return map;
    }

    function canPlace(w, h, x, y, excludeUid) {
      if (x < 0 || y < 0 || x + w > state.cols || y + h > state.rows) return false;
      var map = occupied(excludeUid);
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
          if (canPlace(w, h, x, y, excludeUid)) return { x: x, y: y, w: w, h: h };
        }
      }
      if (w !== h) {
        for (y = 0; y <= state.rows - w; y++) {
          for (x = 0; x <= state.cols - h; x++) {
            if (canPlace(h, w, x, y, excludeUid)) return { x: x, y: y, w: h, h: w };
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
      g.style.left = x * state.cell + "px";
      g.style.top = y * state.cell + "px";
      g.style.width = w * state.cell - 2 + "px";
      g.style.height = h * state.cell - 2 + "px";
    }

    function hideGhost() {
      if (state.ghost) state.ghost.hidden = true;
    }

    function select(uid) {
      state.selected = uid;
      state.items.forEach(positionEl);
      try { board.focus(); } catch (e) {}
    }

    function rotateItem(it) {
      if (!it || it.w === it.h) return false;
      var nw = it.h, nh = it.w;
      if (canPlace(nw, nh, it.x, it.y, it.uid)) {
        it.w = nw; it.h = nh; positionEl(it); emit(); return true;
      }
      var sx = clamp(it.x, 0, state.cols - nw);
      var sy = clamp(it.y, 0, state.rows - nh);
      if (canPlace(nw, nh, sx, sy, it.uid)) {
        it.w = nw; it.h = nh; it.x = sx; it.y = sy; positionEl(it); emit(); return true;
      }
      var slot = findSlot(nw, nh, it.uid);
      if (slot) {
        it.w = slot.w; it.h = slot.h; it.x = slot.x; it.y = slot.y; positionEl(it); emit(); return true;
      }
      return false;
    }

    function clientToCell(clientX, clientY) {
      var rect = board.getBoundingClientRect();
      return {
        x: clamp(Math.floor((clientX - rect.left) / state.cell), 0, state.cols - 1),
        y: clamp(Math.floor((clientY - rect.top) / state.cell), 0, state.rows - 1)
      };
    }

    function syncMeta(it) {
      if (!it.el) return;
      var m = it.el.querySelector(".tt-ig-meta");
      if (m) m.textContent = it.w + "×" + it.h + (it.meta ? " · " + it.meta : "");
    }

    function buildItemEl(it) {
      var el = document.createElement("div");
      el.className = "tt-igrid-item";
      el.setAttribute("data-uid", it.uid);
      el.innerHTML =
        '<div class="tt-ig-btns">' +
        '<button type="button" class="tt-ig-rot" title="Повернуть (R)" tabindex="-1">⟳</button>' +
        '<button type="button" class="tt-ig-x" title="Убрать" tabindex="-1">×</button></div>' +
        '<div class="tt-ig-name"></div><div class="tt-ig-meta"></div>';
      el.querySelector(".tt-ig-name").textContent = it.name || "?";
      syncMeta(it);

      el.querySelector(".tt-ig-x").addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation(); removeItem(it.uid);
      });
      el.querySelector(".tt-ig-rot").addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        select(it.uid); rotateItem(it); syncMeta(it);
      });

      if (!state.readonly) bindDrag(el, it);
      el.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("button")) return;
        select(it.uid);
      });
      return el;
    }

    function bindDrag(el, it) {
      function onDown(ev) {
        if (state.readonly) return;
        if (ev.button != null && ev.button !== 0) return;
        if (ev.target && ev.target.closest && ev.target.closest("button")) return;
        ev.preventDefault();
        select(it.uid);
        var cell = clientToCell(ev.clientX, ev.clientY);
        state.drag = {
          uid: it.uid, ox: it.x, oy: it.y, ow: it.w, oh: it.h,
          grabX: cell.x - it.x, grabY: cell.y - it.y
        };
        el.classList.add("is-dragging");
        try { el.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      function onMove(ev) {
        if (!state.drag || state.drag.uid !== it.uid) return;
        var cell = clientToCell(ev.clientX, ev.clientY);
        var nx = clamp(cell.x - state.drag.grabX, 0, state.cols - it.w);
        var ny = clamp(cell.y - state.drag.grabY, 0, state.rows - it.h);
        var ok = canPlace(it.w, it.h, nx, ny, it.uid);
        it.x = nx; it.y = ny; positionEl(it);
        showGhost(it.w, it.h, nx, ny, ok);
      }
      function onUp(ev) {
        if (!state.drag || state.drag.uid !== it.uid) return;
        el.classList.remove("is-dragging");
        hideGhost();
        if (!canPlace(it.w, it.h, it.x, it.y, it.uid)) {
          it.x = state.drag.ox; it.y = state.drag.oy; it.w = state.drag.ow; it.h = state.drag.oh;
          positionEl(it); syncMeta(it);
        }
        state.drag = null;
        emit();
        try { el.releasePointerCapture(ev.pointerId); } catch (e) {}
      }
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    }

    board.addEventListener("keydown", function (e) {
      if (e.key !== "r" && e.key !== "R") return;
      var it = null;
      if (state.drag) {
        it = state.items.find(function (x) { return x.uid === state.drag.uid; });
      } else if (state.selected) {
        it = state.items.find(function (x) { return x.uid === state.selected; });
      }
      if (!it) return;
      e.preventDefault();
      if (state.drag) {
        var nw = it.h, nh = it.w;
        it.w = nw; it.h = nh;
        it.x = clamp(it.x, 0, state.cols - nw);
        it.y = clamp(it.y, 0, state.rows - nh);
        state.drag.grabX = Math.min(state.drag.grabX, nw - 1);
        state.drag.grabY = Math.min(state.drag.grabY, nh - 1);
        positionEl(it); syncMeta(it);
        showGhost(it.w, it.h, it.x, it.y, canPlace(it.w, it.h, it.x, it.y, it.uid));
      } else {
        rotateItem(it); syncMeta(it);
      }
    });

    function addItem(raw, x, y) {
      if (!raw) return null;
      var sz = sizeOf(raw);
      var w = sz.w, h = sz.h;
      var pos = null;
      if (typeof x === "number" && typeof y === "number" && canPlace(w, h, x, y)) {
        pos = { x: x, y: y, w: w, h: h };
      } else {
        pos = findSlot(w, h);
      }
      if (!pos) return null;
      var it = {
        uid: nextUid(), id: raw.id || null,
        name: raw.name || raw.shortName || raw.id || "item",
        w: pos.w, h: pos.h, x: pos.x, y: pos.y,
        meta: raw.meta || "", data: raw.data != null ? raw.data : raw
      };
      it.el = buildItemEl(it);
      board.appendChild(it.el);
      positionEl(it);
      state.items.push(it);
      select(it.uid);
      emit();
      return it;
    }

    function removeItem(uid) {
      var i = state.items.findIndex(function (x) { return x.uid === uid; });
      if (i < 0) return false;
      var it = state.items[i];
      if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
      state.items.splice(i, 1);
      if (state.selected === uid) state.selected = null;
      emit();
      return true;
    }

    function clear() {
      state.items.slice().forEach(function (it) {
        if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
      });
      state.items = [];
      state.selected = null;
      hideGhost();
      emit();
    }

    function getItems() {
      return state.items.map(function (it) {
        return { uid: it.uid, id: it.id, name: it.name, w: it.w, h: it.h, x: it.x, y: it.y, meta: it.meta, data: it.data };
      });
    }

    function setSize(cols, rows) {
      var prev = getItems();
      state.cols = Math.max(1, Math.floor(cols || state.cols));
      state.rows = Math.max(1, Math.floor(rows || state.rows));
      clear();
      layoutBoard();
      prev.forEach(function (p) {
        addItem({ id: p.id, name: p.name, w: p.w, h: p.h, meta: p.meta, data: p.data }, p.x, p.y);
      });
      emit();
    }

    function pack(candidates, packOpts) {
      packOpts = packOpts || {};
      if (packOpts.clear !== false) clear();
      var list = (candidates || []).slice();
      if (typeof packOpts.orderBy === "function") list.sort(packOpts.orderBy);
      else list.sort(function (a, b) { return (Number(b.score) || 0) - (Number(a.score) || 0); });
      var placed = [];
      list.forEach(function (c) {
        var res = addItem(c);
        if (res) placed.push(res);
      });
      return placed;
    }

    function usedSlots() {
      var n = 0;
      state.items.forEach(function (it) { n += it.w * it.h; });
      return n;
    }

    layoutBoard();

    return {
      addItem: addItem, removeItem: removeItem, clear: clear, getItems: getItems,
      setSize: setSize, pack: pack, canPlace: canPlace, findSlot: findSlot,
      usedSlots: usedSlots,
      totalSlots: function () { return state.cols * state.rows; },
      cols: function () { return state.cols; },
      rows: function () { return state.rows; },
      destroy: function () {
        clear(); host.innerHTML = ""; host.classList.remove("tt-igrid", "readonly");
      }
    };
  }

  function dimsFromItem(it) {
    if (!it) return { w: 1, h: 1 };
    var w = Number(it.width) || 0;
    var h = Number(it.height) || 0;
    var p = it.properties || {};
    if (!w && p.width) w = Number(p.width) || 0;
    if (!h && p.height) h = Number(p.height) || 0;
    if (!w) w = 1; if (!h) h = 1;
    return { w: Math.max(1, Math.floor(w)), h: Math.max(1, Math.floor(h)) };
  }

  global.TarkovItemGrid = { __v: 2, create: create, dimsFromItem: dimsFromItem };
})(typeof window !== "undefined" ? window : this);
