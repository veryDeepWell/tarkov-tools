/**
 * Restock mini helper (P3: origin + interval cleanup).
 * Does NOT call doLoad() on open — user must click "Загрузить".
 */
(function () {
  var pollTimer = null;

  function reportMini(running, label) {
    try {
      var tool = "tools/tarkovtool-restock.html";
      var payload = { type: "tt-status", tool: tool, running: !!running, label: label || "" };
      window.__ttLastStatus = { running: !!running, label: label || "", tool: tool };
      if (window.TarkovMini && TarkovMini.reportStatus) {
        TarkovMini.reportStatus({ running: !!running, label: label || "" });
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

  function poll() {
    try {
      if (typeof tickTimer !== "undefined" && tickTimer) reportMini(true, "таймер");
      else if (window.__ttLastStatus) reportMini(window.__ttLastStatus.running, window.__ttLastStatus.label);
      else reportMini(false, "ожидание");
    } catch (e) {}
  }

  reportMini(false, "ожидание");
  pollTimer = setInterval(poll, 10000);

  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    if (ev.data && ev.data.type === "tt-ping-status") {
      if (window.__ttLastStatus) reportMini(window.__ttLastStatus.running, window.__ttLastStatus.label);
      else reportMini(false, "ожидание");
    }
  });

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }
  window.addEventListener("pagehide", stopPoll);
  window.addEventListener("beforeunload", stopPoll);
})();
