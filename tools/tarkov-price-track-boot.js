/**
 * Price-track mini helper — mirrors run state + countdown into mini-tab status.
 */
(function () {
  var syncTimer = null;
  var RUN_KEY = "tarkovPriceTrackRunning";
  var META_KEY = "tarkovPriceTrackMeta";

  function readRun() {
    try { return JSON.parse(localStorage.getItem(RUN_KEY) || "{}") || {}; } catch (e) { return {}; }
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
      try {
        var bc = new BroadcastChannel("tarkov-tools");
        bc.postMessage(payload);
        bc.close();
      } catch (e) {}
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

  setTimeout(sync, 300);
  syncTimer = setInterval(sync, 1000);

  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    if (ev.data && ev.data.type === "tt-ping-status") sync();
  });
  window.addEventListener("pagehide", function () {
    if (syncTimer) clearInterval(syncTimer);
  });
})();
