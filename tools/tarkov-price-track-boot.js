/** Price-track boot: mini status + i18n + due-snap trigger */
(function () {
  var RUN_KEY = "tarkovPriceTrackRunning";
  var META_KEY = "tarkovPriceTrackMeta";

  function readRun() {
    try { return JSON.parse(localStorage.getItem(RUN_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function writeRun(o) {
    try { localStorage.setItem(RUN_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || "{}") || {}; } catch (e) { return {}; }
  }

  function tt(key, fallback, params) {
    var text = fallback || key;
    try {
      if (window.TarkovI18n && TarkovI18n.t) {
        var v = TarkovI18n.t(key);
        if (v && v !== key) text = v;
      }
    } catch (e) {}
    if (params) {
      Object.keys(params).forEach(function (k) {
        text = String(text).split("{" + k + "}").join(String(params[k]));
      });
    }
    return text;
  }

  function fmtClock(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString(undefined, {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return ""; }
  }

  function fmtRemain(ms) {
    if (ms == null || isNaN(ms)) return "—";
    var isRu = (document.documentElement.lang || "").indexOf("ru") === 0;
    if (ms <= 0) return isRu ? "сейчас" : "now";
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    if (m >= 60) {
      var h = Math.floor(m / 60);
      m = m % 60;
      return isRu ? (h + "ч " + m + "м") : (h + "h " + String(m).padStart(2, "0") + "m");
    }
    return isRu
      ? (m + "м " + String(sec).padStart(2, "0") + "с")
      : (m + "m " + String(sec).padStart(2, "0") + "s");
  }

  function scheduleNext(mins) {
    mins = Math.max(1, Number(mins) || 30);
    var run = readRun();
    writeRun(Object.assign({}, run, {
      on: run.on !== false,
      mins: mins,
      nextSnapAt: Date.now() + mins * 60 * 1000
    }));
  }

  function reportMini(running, label) {
    try {
      var tool = "tarkovtool-price-track.html";
      var payload = { type: "tt-status", tool: tool, running: !!running, label: label || "" };
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, location.origin);
      }
    } catch (e) {}
  }

  function paintStatus() {
    var run = readRun();
    var meta = readMeta();
    var el = document.getElementById("trackMeta");
    var cd = document.getElementById("countdown");
    var mins = Number(run.mins) || Number((document.getElementById("interval") || {}).value) || 30;
    var last = meta.lastSnap ? fmtClock(meta.lastSnap) : "-";
    var countStr = meta.count != null ? " (" + meta.count + ")" : "";
    if (el) {
      el.textContent = run.on
        ? tt("priceTrack.bgOn", "BG ON · every {mins} min · last {last}{count}", { mins: mins, last: last, count: countStr })
        : tt("priceTrack.bgOff", "BG off · last {last}", { last: last });
    }
    if (cd) {
      if (run.on) {
        var inFlight = false;
        try { inFlight = window.__ttSnapInFlight && window.__ttSnapInFlight(); } catch (e) {}
        if (inFlight) {
          cd.textContent = tt("priceTrack.fetching", "Fetching…");
        } else {
          var remain = run.nextSnapAt ? Number(run.nextSnapAt) - Date.now() : 0;
          cd.textContent = tt("priceTrack.next", "Next: {remain}", { remain: fmtRemain(remain) });
        }
        cd.className = "countdown on";
      } else {
        cd.textContent = tt("priceTrack.countdownOff", "Countdown off");
        cd.className = "countdown";
      }
    }
    if (run.on) {
      var rem = run.nextSnapAt ? Number(run.nextSnapAt) - Date.now() : null;
      reportMini(true, tt("priceTrack.next", "Next: {remain}", { remain: fmtRemain(rem) }));
    } else {
      reportMini(false, tt("priceTrack.idle", "idle"));
    }
  }

  function fixStuck() {
    var run = readRun();
    if (!run.on) return;
    var mins = Math.max(1, Number(run.mins) || 30);
    var next = Number(run.nextSnapAt) || 0;
    // Overdue → fire real snap, do not only push nextSnapAt (that skipped the snap forever)
    if (!next || next <= Date.now()) {
      try {
        if (typeof window.__ttTakeSnapshot === "function") {
          if (!(window.__ttSnapInFlight && window.__ttSnapInFlight())) {
            window.__ttTakeSnapshot().catch(function () {});
          }
        }
      } catch (e) {}
    }
    var st = document.getElementById("status");
    if (st && /Fetching/i.test(st.textContent || "")) {
      if (!window.__ttFetchStarted) window.__ttFetchStarted = Date.now();
      if (Date.now() - window.__ttFetchStarted > 90000) {
        st.className = "status err";
        st.textContent = tt("priceTrack.snapErr", "Snap error: {msg}", { msg: "timeout" });
        scheduleNext(mins);
        window.__ttFetchStarted = 0;
      }
    } else {
      window.__ttFetchStarted = 0;
    }
  }

  function applyI18n() {
    try {
      if (window.TarkovI18n && TarkovI18n.applyDom) TarkovI18n.applyDom(document);
    } catch (e) {}
    paintStatus();
  }

  setInterval(function () { paintStatus(); fixStuck(); }, 1000);
  function bootI18n() {
    if (window.TarkovI18n && TarkovI18n.ready) {
      (typeof TarkovI18n.ready === "function" ? TarkovI18n.ready() : Promise.resolve(TarkovI18n.ready)).then(applyI18n);
    } else {
      applyI18n();
    }
  }
  bootI18n();
  setTimeout(bootI18n, 600);
  window.addEventListener("tt-lang-changed", applyI18n);
})();
