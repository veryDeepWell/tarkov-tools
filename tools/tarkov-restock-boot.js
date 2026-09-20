/**
 * Restock mini status — Stage 1: tt-status only, no double sound.
 */
(function () {
  var TOOL = "tarkovtool-restock.html";
  var pollTimer = null;

  function reportMini(running, label) {
    try {
      var payload = {
        type: "tt-status",
        tool: TOOL,
        running: !!running,
        ready: true,
        label: label || ""
      };
      window.__ttLastStatus = { running: !!running, label: label || "", tool: TOOL };
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, location.origin);
      }
    } catch (e) {}
  }

  function poll() {
    try {
      if (typeof tickTimer !== "undefined" && tickTimer) reportMini(true, "watching");
      else if (window.__ttLastStatus) reportMini(window.__ttLastStatus.running, window.__ttLastStatus.label);
      else reportMini(false, "idle");
    } catch (e) {}
  }

  reportMini(false, "idle");
  pollTimer = setInterval(poll, 10000);

  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    if (ev.data && ev.data.type === "tt-ping-status") {
      if (window.__ttLastStatus) reportMini(window.__ttLastStatus.running, window.__ttLastStatus.label);
      else reportMini(false, "idle");
    }
  });

  window.addEventListener("pagehide", function () {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  });
})();
