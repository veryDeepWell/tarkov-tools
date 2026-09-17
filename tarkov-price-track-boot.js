/**
 * Price-track mini helper — status only.
 * Interval label always prefers saved mins / __ttPollMins over HTML default 30.
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

  function readRun() {
    try { return JSON.parse(localStorage.getItem('tarkovPriceTrackRunning') || '{}'); } catch (e) { return {}; }
  }

  function resolvedMins(run) {
    run = run || readRun();
    if (window.__ttPollMins && window.__ttPollMins > 0) return window.__ttPollMins;
    var saved = Number(run.mins);
    if (saved > 0) return saved;
    var el = document.getElementById('interval');
    var fromInput = el ? Number(el.value) : 0;
    if (fromInput > 0) return fromInput;
    return 30;
  }

  function sync() {
    try {
      var run = readRun();
      var mins = resolvedMins(run);
      if ((typeof timer !== 'undefined' && timer) || run.on) {
        reportMini(true, 'каждые ' + mins + 'м');
      } else {
        reportMini(false, 'ожидание');
      }
    } catch (e) {
      reportMini(false, 'ожидание');
    }
  }

  setTimeout(sync, 400);
  setInterval(sync, 5000);

  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'tt-ping-status') sync();
  });
})();
