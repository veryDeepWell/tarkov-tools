/** Auto-boot for restock mini-tabs */
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
  function tryLoad() {
    if (typeof doLoad === 'function') {
      var p = doLoad();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          reportMini(true, 'таймер');
          if (window.__ttStatusPulse) clearInterval(window.__ttStatusPulse);
          window.__ttStatusPulse = setInterval(function () { reportMini(true, 'таймер'); }, 8000);
        }).catch(function () {});
      } else {
        setTimeout(function () {
          reportMini(true, 'таймер');
          if (window.__ttStatusPulse) clearInterval(window.__ttStatusPulse);
          window.__ttStatusPulse = setInterval(function () { reportMini(true, 'таймер'); }, 8000);
        }, 2000);
      }
      return;
    }
    setTimeout(tryLoad, 100);
  }
  setTimeout(tryLoad, 150);
  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'tt-ping-status' && window.__ttLastStatus) {
      reportMini(window.__ttLastStatus.running, window.__ttLastStatus.label);
    }
  });
})();
