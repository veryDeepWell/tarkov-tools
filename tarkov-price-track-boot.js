/** Auto-start price track when in mini iframe */
(function () {
  function reportMini(running, label) {
    try {
      var tool = 'tarkovtool-price-track.html';
      var payload = { type: 'tt-status', tool: tool, running: !!running, label: label || '' };
      window.__ttLastStatus = { running: !!running, label: label || '', tool: tool };
      if (window.TarkovMini && TarkovMini.reportStatus) TarkovMini.reportStatus({ running: !!running, label: label || '' });
      if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
      if (window.BroadcastChannel) {
        var bc = new BroadcastChannel('tarkov-tools');
        bc.postMessage(payload);
        bc.close();
      }
    } catch (e) {}
  }
  function tryStart() {
    var inMini = window.parent && window.parent !== window && window.parent.TarkovHubMini === true;
    if (typeof startBg !== 'function') { setTimeout(tryStart, 120); return; }
    try {
      var run = JSON.parse(localStorage.getItem('tarkovPriceTrackRunning') || '{}');
      if (run.on || inMini) {
        if (run.mins && document.getElementById('interval')) document.getElementById('interval').value = run.mins;
        startBg();
        var mins = Math.max(5, Number((document.getElementById('interval') || {}).value) || 30);
        reportMini(true, 'каждые ' + mins + 'м');
        if (window.__ttStatusPulse) clearInterval(window.__ttStatusPulse);
        window.__ttStatusPulse = setInterval(function () { reportMini(true, 'каждые ' + mins + 'м'); }, 8000);
      }
    } catch (e) {}
  }
  setTimeout(tryStart, 400);
  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'tt-ping-status' && window.__ttLastStatus) {
      reportMini(window.__ttLastStatus.running, window.__ttLastStatus.label);
    }
  });
})();
