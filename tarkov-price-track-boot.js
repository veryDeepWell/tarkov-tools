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
  var tries = 0;
  function tryStart() {
    tries++;
    var inMini = false;
    try {
      inMini = window.parent && window.parent !== window && window.parent.TarkovHubMini === true;
    } catch (e) {}
    if (typeof startBg !== 'function') {
      if (tries < 50) setTimeout(tryStart, 150);
      return;
    }
    try {
      var run = {};
      try { run = JSON.parse(localStorage.getItem('tarkovPriceTrackRunning') || '{}'); } catch (e) {}
      if (run.on || inMini) {
        if (run.mins && document.getElementById('interval')) document.getElementById('interval').value = run.mins;
        if (run.mode && document.getElementById('gameMode')) document.getElementById('gameMode').value = run.mode;
        startBg();
        var mins = Math.max(1, Number((document.getElementById('interval') || {}).value) || 30);
        reportMini(true, 'каждые ' + mins + 'м');
        if (window.__ttStatusPulse) clearInterval(window.__ttStatusPulse);
        window.__ttStatusPulse = setInterval(function () {
          reportMini(true, 'каждые ' + mins + 'м');
        }, 8000);
      }
    } catch (e) {
      console.warn('price-track-boot', e);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(tryStart, 300); });
  } else {
    setTimeout(tryStart, 300);
  }
  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'tt-ping-status' && window.__ttLastStatus) {
      reportMini(window.__ttLastStatus.running, window.__ttLastStatus.label);
    }
  });
})();
