/**
 * Price-track mini helper.
 * Opening a mini-tab never starts polling by itself.
 * Resume of background polling is owned by the page (run.on in localStorage).
 * This script only reports status to the hub chip.
 */
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

  function sync() {
    try {
      var run = {};
      try { run = JSON.parse(localStorage.getItem('tarkovPriceTrackRunning') || '{}'); } catch (e) {}
      if (typeof timer !== 'undefined' && timer) {
        var mins = Math.max(1, Number((document.getElementById('interval') || {}).value) || run.mins || 30);
        reportMini(true, 'каждые ' + mins + 'м');
      } else if (run.on) {
        reportMini(true, 'запуск…');
      } else {
        reportMini(false, 'ожидание');
      }
    } catch (e) {
      reportMini(false, 'ожидание');
    }
  }

  setTimeout(sync, 400);
  setInterval(sync, 8000);

  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'tt-ping-status') sync();
  });
})();
