/*! TarkovPoll — schedule storage + fire callbacks for live tools.
 * Source of truth: TarkovStorage (tarkovPoll.<id>).
 *
 * Under hub (parent.TarkovHubMini): hub LiveRuntime owns the clock.
 *   start() writes schedule + keeps onFire locally; does NOT arm setTimeout.
 *   Hub posts tt-poll-fire → tool runs onFire → updates nextAt → tt-poll-done.
 *
 * Standalone: arms local setTimeout as before.
 * Notify is caller responsibility.
 */
(function (global) {
  "use strict";
  var PREFIX = "tarkovPoll.";
  var timers = Object.create(null);
  var inFlight = Object.create(null);
  var handlers = Object.create(null);
  var countdownIv = null;
  var boundEls = [];
  var hubWired = false;

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

  /** True when running inside hub iframe — hub owns timers. */
  function underHub() {
    try {
      return !!(
        global.parent &&
        global.parent !== global &&
        global.parent.TarkovHubMini
      );
    } catch (e) {
      return false;
    }
  }


  function pt(key, fb, params) {
    try {
      if (global.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t("poll." + key, params);
        if (v && String(v).indexOf("poll.") !== 0) return v;
      }
    } catch (e) {}
    if (params && typeof fb === "string") {
      return String(fb).replace(/\{(\w+)\}/g, function (_, k) {
        return params[k] != null ? String(params[k]) : "{" + k + "}";
      });
    }
    return fb;
  }

  function fmtRemain(ms) {
    if (ms == null || isNaN(ms)) return pt("dash", "—");
    if (ms <= 0) return pt("now", "сейчас");
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
        remainText: pt("off", "выкл"),
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
      remainText: st.on ? fmtRemain(remain) : pt("off", "выкл"),
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

  function postParent(msg) {
    try {
      if (global.parent && global.parent !== global) {
        global.parent.postMessage(msg, location.origin);
      }
    } catch (e) {}
  }

  function runFire(id) {
    if (inFlight[id]) return Promise.resolve();
    var onFire = handlers[id];
    setInFlight(id, true);
    return Promise.resolve()
      .then(function () {
        return onFire && onFire();
      })
      .catch(function () {})
      .then(function () {
        setInFlight(id, false);
        var cur = read(id);
        if (!cur || !cur.on) {
          postParent({ type: "tt-poll-done", pollId: id });
          return;
        }
        var mins = Number(cur.mins) || 5;
        cur.nextAt = Date.now() + mins * 60000;
        write(id, cur);
        paintAll();
        postParent({ type: "tt-poll-done", pollId: id, nextAt: cur.nextAt });
        if (!underHub()) armLocal(id);
      });
  }

  function armLocal(id) {
    clearTimer(id);
    var st = read(id);
    if (!st || !st.on) return;
    var wait = Math.max(0, Number(st.nextAt) - Date.now());
    timers[id] = {
      timeout: setTimeout(function () {
        if (inFlight[id]) {
          armLocal(id);
          return;
        }
        runFire(id);
      }, wait)
    };
    paintAll();
  }

  function start(id, mins, onFire, opts) {
    opts = opts || {};
    mins = Math.max(1, Number(mins) || 5);
    clearTimer(id);
    if (typeof onFire === "function") handlers[id] = onFire;

    var now = Date.now();
    var st = read(id) || {};
    var nextAt = Number(st.nextAt) || 0;
    var prevMins = Number(st.mins) || 0;
    var minsChanged = prevMins > 0 && prevMins !== mins;
    if (opts.reset || minsChanged || !nextAt || nextAt < now - mins * 60000) {
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

    var hub = underHub();
    if (hub) {
      postParent({
        type: "tt-poll-register",
        pollId: id,
        mins: mins,
        nextAt: nextAt,
        tool: st.tool,
        label: st.label
      });
      // Immediate fire if due — still via same runFire path
      if (opts.fireNow !== false && nextAt <= now && !inFlight[id]) {
        runFire(id);
      }
    } else {
      if (opts.fireNow !== false && nextAt <= now) {
        if (!inFlight[id]) runFire(id);
        else armLocal(id);
      } else {
        armLocal(id);
      }
    }

    ensureCountdownLoop();
    wireHubMessages();
    return st;
  }

  function stop(id) {
    clearTimer(id);
    setInFlight(id, false);
    delete handlers[id];
    var st = read(id) || {};
    st.on = false;
    st.nextAt = null;
    write(id, st);
    postParent({ type: "tt-poll-stop", pollId: id });
    paintAll();
  }

  function paintEl(el, id) {
    if (!el) return;
    var st = status(id);
    var prefix = el.getAttribute("data-poll-prefix");
    if (prefix == null) prefix = pt("nextPrefix", "Следующий запуск: ");
    if (st.on) {
      if (st.inFlight) {
        el.textContent = prefix + pt("running", "идёт…");
      } else {
        var every = st.mins
          ? pt("everyMins", " · каждые {mins} мин", { mins: st.mins })
          : "";
        el.textContent = prefix + st.remainText + every;
      }
      el.classList.add("on");
      el.classList.remove("off");
    } else {
      el.textContent = prefix + pt("off", "выкл");
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

  function wireHubMessages() {
    if (hubWired) return;
    hubWired = true;
    try {
      global.addEventListener("message", function (ev) {
        if (ev.origin !== location.origin) return;
        var d = ev.data;
        if (!d || typeof d !== "object") return;
        if (d.type === "tt-poll-fire" && d.pollId) {
          var id = d.pollId;
          if (!handlers[id]) return;
          var st = read(id);
          if (!st || !st.on) return;
          runFire(id);
        }
      });
    } catch (e) {}
  }

  // If page loads under hub with existing on schedule, wire listener early
  try {
    if (underHub()) wireHubMessages();
  } catch (e0) {}

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
    reportMini: reportMini,
    underHub: underHub
  };
})(window);
