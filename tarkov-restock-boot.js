/**
 * Restock mini helper.
 * Does NOT call doLoad() on open — user must click "Загрузить".
 * Only reports status / answers ping so the hub chip stays in sync.
 */
(function () {
  function reportMini(running, label) {
    try {
      var tool = 'tarkovtool-restock.html';
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

  reportMini(false, 'ожидание');

  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'tt-ping-status') {
      if (window.__ttLastStatus) reportMini(window.__ttLastStatus.running, window.__ttLastStatus.label);
      else reportMini(false, 'ожидание');
    }
  });

  setInterval(function () {
    try {
      if (typeof tickTimer !== 'undefined' && tickTimer) reportMini(true, 'таймер');
    } catch (e) {}
  }, 10000);
})();
