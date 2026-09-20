/*! TarkovPoll — unified interval runner + countdown for background tools */
(function (global) {
  "use strict";
  var PREFIX = "tarkovPoll.";
  var timers = Object.create(null);
  var countdownIv = null;
  var boundEls = [];

  function key(id) { return PREFIX + String(id || "default"); }

  function read(id) {
    try { return JSON.parse(localStorage.getItem(key(id)) || "null") || null; } catch (e) { return null; }
  }
  function write(id, obj) {
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
      clearInterval(timers[id].interval);
      delete timers[id];
    }
  }

  function start(id, mins, onFire, opts) {
    opts = opts || {};
    mins = Math.max(1, Number(mins) || 5);
    clearTimer(id);
    var now = Date.now();
    var st = read(id) || {};
    var nextAt = Number(st.nextAt) || 0;
    if (opts.reset || !nextAt || nextAt < now - mins * 60000) {
      nextAt = opts.fireNow === false ? now + mins * 60000 : now;
    }
    st = {
      on: true,
      mins: mins,
      nextAt: nextAt,
      mode: opts.mode || st.mode || "",
      label: opts.label || st.label || id
    };
    write(id, st);

    function arm() {
      clearTimer(id);
      st = read(id) || st;
      if (!st.on) return;
      var wait = Math.max(0, Number(st.nextAt) - Date.now());
      timers[id] = {
        timeout: setTimeout(function () {
          Promise.resolve()
            .then(function () { return onFire && onFire(); })
            .catch(function () {})
            .then(function () {
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
      Promise.resolve()
        .then(function () { return onFire && onFire(); })
        .catch(function () {})
        .then(function () {
          var cur = read(id) || st;
          if (!cur.on) return;
          cur.nextAt = Date.now() + mins * 60000;
          write(id, cur);
          arm();
        });
    } else {
      arm();
    }
    ensureCountdownLoop();
    return st;
  }

  function stop(id) {
    clearTimer(id);
    var st = read(id) || {};
    st.on = false;
    st.nextAt = null;
    write(id, st);
    paintAll();
  }

  function status(id) {
    var st = read(id);
    if (!st) return { on: false, mins: 0, nextAt: null, remainMs: null, label: "" };
    var remain = st.on && st.nextAt ? Number(st.nextAt) - Date.now() : null;
    return {
      on: !!st.on,
      mins: Number(st.mins) || 0,
      nextAt: st.nextAt || null,
      remainMs: remain,
      remainText: st.on ? fmtRemain(remain) : "выкл",
      mode: st.mode || "",
      label: st.label || id
    };
  }

  function paintEl(el, id) {
    if (!el) return;
    var st = status(id);
    var prefix = el.getAttribute("data-poll-prefix");
    if (prefix == null) prefix = "Следующий запуск: ";
    if (st.on) {
      el.textContent = prefix + st.remainText + (st.mins ? " · каждые " + st.mins + " мин" : "");
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
      try { paintEl(boundEls[i].el, boundEls[i].id); } catch (e) {}
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
      boundEls = boundEls.filter(function (x) { return x.el !== el; });
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
    paintAll: paintAll
  };
})(window);
