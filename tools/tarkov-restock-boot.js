/** Restock boot: status bridge only — timer owned by TarkovPoll in main tool */
(function () {
  var TOOL = "tarkovtool-restock.html";
  function report(running, label) {
    if (window.TarkovPoll && TarkovPoll.reportStatus) {
      TarkovPoll.reportStatus(TOOL, running, label);
    }
  }
  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    if (ev.data && ev.data.type === "tt-ping-status") {
      var st = window.TarkovPoll ? TarkovPoll.status("restock") : null;
      if (st && st.on) report(true, st.remainText || "watching");
      else report(false, "idle");
    }
  });
  report(false, "idle");
})();
