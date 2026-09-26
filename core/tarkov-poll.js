/*! TarkovPoll — single interval runner + countdown for all live background tools.
 * Source of truth: TarkovStorage (tarkovPoll.<id>).
 * No per-tool timers, no dual run-state. Notify is caller responsibility.
 */
(function (global) {
  "use strict";
  var PREFIX = "tarkovPoll.";
  var timers = Object.create(null);
  var inFlight = Object.create(null);
  var countdownIv = null;
  var boundEls = [];

  function storage() {
    return global.TarkovStorage || null;
  }

  function key(id) {
    return PREFIX + String(id || "default");
  }

  function read(id) {
    var S = storage();
    if (S && S.getJson) {
      try {
        return S.getJson(key(id), null);
      } catch (e) {
        return null;
      }
    }
    try {
      return JSON.parse(localStorage.getItem(key(id)) || "null") || null;
    } catch (e) {
      return null;
    }
  }

  function write(id, obj) {
    var S = storage();
    if (S && S.setJson) {
      try {
        if (!obj) S.remove(key(id));
        else S.setJson(key(id), obj);
        return;
      } catch (e) {}
    }
    try {
      if (!obj) localStorage.removeItem(key(id));
      else localStorage.setItem(key(id), JSON.stringify(obj));
    } catch (e) {}
  }

  function fmtRemain(ms) {
    if (ms == null || isNaN(ms)) return "—";
    if (ms <= 0) return "сейчас";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "ч " + String(m).padStart(2, "0") + "м";
    if (m > 0) return m + "м " + String(sec).padStart(2, "0") + "с";
    return sec + "с";
  }

  function clearTimer(id) {
    if (timers[id]) {
      clearTimeout(timers[id].timeout);
      if (timers[id].interval) clearInterval(timers[id].interval);
      delete timers[id];
    }
  }

  function status(id) {
    var st = read(id);
    if (!st) {
      return {
        on: false,
        mins: 0,
        nextAt: null,
        remainMs: null,
        remainText: "выкл",
        mode: "",
        label: "",
        inFlight: false
      };
    }
    var remain = st.on && st.nextAt ? Number(st.nextAt) - Date.now() : null;
    return {
      on: !!st.on,
      mins: Number(st.mins) || 0,
      nextAt: st.nextAt || null,
      remainMs: remain,
      remainText: st.on ? fmtRemain(remain) : "выкл",
      mode: st.mode || "",
      label: st.label || id,
      inFlight: !!inFlight[id]
    };
  }

  function setInFlight(id, v) {
    if (v) inFlight[id] = true;
    else delete inFlight[id];
    paintAll();
  }

  function isInFlight(id) {
    return !!inFlight[id];
  }

  /** Report mini-tab status to hub (single channel). */
  function reportMini(toolFile, running, label) {
    try {
      if (global.parent && global.parent !== global) {
        global.parent.postMessage(
          {
            type: "tt-status",
            tool: toolFile,
            running: !!running,
            ready: true,
            label: label || ""
          },
          location.origin
        );
      }
    } catch (e) {}
  }

  function start(id, mins, onFire, opts) {
    opts = opts || {};
    mins = Math.max(1, Number(mins) || 5);
    clearTimer(id);
    var now = Date.now();
    var st = read(id) || {};
    var nextAt = Number(st.nextAt) || 0;
    var prevMins = Number(st.mins) || 0;
    var minsChanged = prevMins > 0 && prevMins !== mins;
    // Re-arm when interval changes, explicit reset, or schedule is stale
    if (
      opts.reset ||
      minsChanged ||
      !nextAt ||
      nextAt < now - mins * 60000
    ) {
      nextAt = opts.fireNow === false ? now + mins * 60000 : now;
    }
    st = {
      on: true,
      mins: mins,
      nextAt: nextAt,
      mode: opts.mode || st.mode || "",
      label: opts.label || st.label || id,
      tool: opts.tool || st.tool || ""
    };
    write(id, st);

    function arm() {
      clearTimer(id);
      st = read(id) || st;
      if (!st.on) return;
      var wait = Math.max(0, Number(st.nextAt) - Date.now());
      timers[id] = {
        timeout: setTimeout(function () {
          if (inFlight[id]) {
            arm();
            return;
          }
          setInFlight(id, true);
          Promise.resolve()
            .then(function () {
              return onFire && onFire();
            })
            .catch(function () {})
            .then(function () {
              setInFlight(id, false);
              var cur = read(id);
              if (!cur || !cur.on) return;
              cur.nextAt = Date.now() + (Number(cur.mins) || mins) * 60000;
              write(id, cur);
              paintAll();
              arm();
            });
        }, wait)
      };
      paintAll();
    }

    if (opts.fireNow !== false && nextAt <= now) {
      if (!inFlight[id]) {
        setInFlight(id, true);
        Promise.resolve()
          .then(function () {
            return onFire && onFire();
          })
          .catch(function () {})
          .then(function () {
            setInFlight(id, false);
            var cur = read(id) || st;
            if (!cur.on) return;
            cur.nextAt = Date.now() + mins * 60000;
            write(id, cur);
            arm();
          });
      } else {
        arm();
      }
    } else {
      arm();
    }
    ensureCountdownLoop();
    return st;
  }

  function stop(id) {
    clearTimer(id);
    setInFlight(id, false);
    var st = read(id) || {};
    st.on = false;
    st.nextAt = null;
    write(id, st);
    paintAll();
  }

  function paintEl(el, id) {
    if (!el) return;
    var st = status(id);
    var prefix = el.getAttribute("data-poll-prefix");
    if (prefix == null) prefix = "Следующий запуск: ";
    if (st.on) {
      if (st.inFlight) {
        el.textContent = prefix + "идёт…";
      } else {
        el.textContent =
          prefix +
          st.remainText +
          (st.mins ? " · каждые " + st.mins + " мин" : "");
      }
      el.classList.add("on");
      el.classList.remove("off");
    } else {
      el.textContent = prefix + "выкл";
      el.classList.add("off");
      el.classList.remove("on");
    }
  }

  function paintAll() {
    for (var i = 0; i < boundEls.length; i++) {
      try {
        paintEl(boundEls[i].el, boundEls[i].id);
      } catch (e) {}
    }
  }

  function ensureCountdownLoop() {
    if (countdownIv) return;
    countdownIv = setInterval(paintAll, 1000);
  }

  function bindCountdown(el, id) {
    if (!el) return function () {};
    boundEls.push({ el: el, id: id });
    ensureCountdownLoop();
    paintEl(el, id);
    return function unbind() {
      boundEls = boundEls.filter(function (x) {
        return x.el !== el;
      });
    };
  }

  global.TarkovPoll = {
    start: start,
    stop: stop,
    status: status,
    read: read,
    write: write,
    bindCountdown: bindCountdown,
    fmtRemain: fmtRemain,
    paintAll: paintAll,
    setInFlight: setInFlight,
    isInFlight: isInFlight,
    reportMini: reportMini
  };
})(window);
