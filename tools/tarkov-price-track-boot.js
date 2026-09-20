/**
 * Price-track mini helper + stuck-state recovery
 */
(function () {
  var syncTimer = null;
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

  function fmtClock(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return ""; }
  }

  function fmtRemain(ms) {
    if (ms == null || isNaN(ms)) return "—";
    if (ms <= 0) return "сейчас";
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    if (m >= 60) {
      var h = Math.floor(m / 60);
      m = m % 60;
      return h + "ч " + m + "м";
    }
    return m + "м " + String(sec).padStart(2, "0") + "с";
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
      window.__ttLastStatus = { running: !!running, label: label || "", tool: tool };
      if (window.TarkovMini && TarkovMini.reportStatus) {
        TarkovMini.reportStatus({ running: !!running, label: label || "", tool: tool });
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, location.origin);
      }
    } catch (e) {}
  }

  function sync() {
    var run = readRun();
    var meta = readMeta();
    var last = fmtClock(meta.lastSnap);
    if (run.on) {
      var remain = run.nextSnapAt ? Number(run.nextSnapAt) - Date.now() : null;
      var label = "через " + fmtRemain(remain);
      if (last) label += " · был " + last;
      reportMini(true, label);
    } else {
      var label2 = "ожидание";
      if (last) label2 += " · был " + last;
      reportMini(false, label2);
    }
  }

  function fixStuck() {
    var run = readRun();
    if (!run.on) return;
    var mins = Math.max(1, Number(run.mins) || 30);
    var next = Number(run.nextSnapAt) || 0;
    if (!next || next <= Date.now()) {
      scheduleNext(mins);
    }
    var st = document.getElementById("status");
    if (st && /Fetching/i.test(st.textContent || "")) {
      if (!window.__ttFetchStarted) window.__ttFetchStarted = Date.now();
      if (Date.now() - window.__ttFetchStarted > 50000) {
        st.className = "status err";
        st.textContent = "Snap timeout — Стоп/Старт или «Снять сейчас»";
        scheduleNext(mins);
        window.__ttFetchStarted = 0;
      }
    } else {
      window.__ttFetchStarted = 0;
    }
  }

  function armButtons() {
    ["snapBtn", "startBtn"].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b || b.__ttHot) return;
      b.__ttHot = true;
      b.addEventListener("click", function () {
        window.__ttFetchStarted = Date.now();
        var run = readRun();
        var mins = Math.max(1, Number(run.mins) || Number((document.getElementById("interval") || {}).value) || 30);
        scheduleNext(mins);
      }, true);
    });
  }

  setTimeout(sync, 300);
  syncTimer = setInterval(function () { sync(); fixStuck(); }, 1000);
  armButtons();
  setTimeout(armButtons, 800);

  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    if (ev.data && ev.data.type === "tt-ping-status") sync();
  });
})();
