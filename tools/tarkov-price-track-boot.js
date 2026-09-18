/**
 * Price-track mini helper — status label with interval + last snapshot time.
 */
(function () {
  var syncTimer = null;

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
      if (window.BroadcastChannel) {
        var bc = new BroadcastChannel("tarkov-tools");
        bc.postMessage(payload);
        bc.close();
      }
    } catch (e) {}
  }

  function readRun() {
    try {
      return JSON.parse(localStorage.getItem("tarkovPriceTrackRunning") || "{}");
    } catch (e) {
      return {};
    }
  }

  function readMeta() {
    try {
      return JSON.parse(localStorage.getItem("tarkovPriceTrackMeta") || "{}");
    } catch (e) {
      return {};
    }
  }

  function resolvedMins(run) {
    run = run || readRun();
    if (window.__ttPollMins && window.__ttPollMins > 0) return Number(window.__ttPollMins);
    var saved = Number(run.mins);
    if (saved > 0) return saved;
    var el = document.getElementById("interval");
    var fromInput = el ? Number(el.value) : 0;
    if (fromInput > 0) return fromInput;
    return 30;
  }

  function fmtTime(ts) {
    if (!ts) return "";
    try {
      var d = new Date(ts);
      return d.toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }

  function sync() {
    try {
      var run = readRun();
      var mins = resolvedMins(run);
      var meta = readMeta();
      var last = fmtTime(meta.lastSnap);
      var on = (typeof timer !== "undefined" && timer) || run.on;
      if (on) {
        var label = "каждые " + mins + " мин";
        if (last) label += " · снимок " + last;
        reportMini(true, label);
      } else {
        var label2 = "ожидание";
        if (last) label2 += " · снимок " + last;
        reportMini(false, label2);
      }
    } catch (e) {
      reportMini(false, "ожидание");
    }
  }

  function startSyncLoop() {
    if (syncTimer) return;
    syncTimer = setInterval(sync, 5000);
  }
  function stopSyncLoop() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  setTimeout(sync, 400);
  startSyncLoop();

  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    if (ev.data && ev.data.type === "tt-ping-status") sync();
  });

  window.addEventListener("pagehide", stopSyncLoop);
  window.addEventListener("beforeunload", stopSyncLoop);
})();
