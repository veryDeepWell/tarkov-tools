/** Mini-tabs: MINI + Notify + reportStatus */
(function (global) {
  if (global.__ttMiniLoaded) return;
  global.__ttMiniLoaded = true;

  function currentFile() {
    try {
      var path = (location.pathname || '').split('/').pop() || '';
      return path || 'index.html';
    } catch (e) { return 'unknown'; }
  }
  function currentTitle() {
    try {
      var meta = document.getElementById('tarkovtool-meta');
      if (meta) {
        var j = JSON.parse(meta.textContent || '{}');
        if (j.title) return j.title;
      }
    } catch (e) {}
    return document.title || currentFile();
  }
  function isInMiniFrame() {
    try {
      if (!window.parent || window.parent === window) return false;
      if (window.parent.TarkovHubMini === true) return true;
      try {
        if (window.parent.document && window.parent.document.getElementById('framePool')) return true;
      } catch (e2) {}
      return false;
    } catch (e) { return false; }
  }
  function isHubPage() { return !!global.TarkovHubMini; }

  function Notify(titleOrOpts, body) {
    var title, msg, tool, kind, silent;
    if (titleOrOpts && typeof titleOrOpts === 'object') {
      title = titleOrOpts.title || titleOrOpts.t || 'Уведомление';
      msg = titleOrOpts.body || titleOrOpts.b || titleOrOpts.message || '';
      tool = titleOrOpts.tool || currentFile();
      kind = titleOrOpts.kind || 'ok';
      silent = !!titleOrOpts.silent;
    } else {
      title = String(titleOrOpts || 'Уведомление');
      msg = body != null ? String(body) : '';
      tool = currentFile();
      kind = 'ok';
      silent = false;
    }
    if (tool && tool.indexOf('/') !== -1) tool = tool.split('/').pop();

    if (!silent) {
      try {
        if (global.TarkovTools && typeof TarkovTools.beep === 'function') {
          var k = kind === 'warn' || kind === 'error' || kind === 'alert' ? 'warn'
            : kind === 'restock' ? 'restock'
            : kind === 'price' ? 'price' : 'ok';
          TarkovTools.beep(k);
        }
      } catch (e) {}
    }

    function pushNotif() {
      try {
        if (global.TarkovState && typeof TarkovState.notify === 'function') {
          TarkovState.notify({ title: title, body: msg, tool: tool, kind: kind });
          return true;
        }
      } catch (e) {}
      return false;
    }
    if (!pushNotif()) {
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (pushNotif() || tries > 25) clearInterval(iv);
      }, 40);
    }

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'tt-notify', tool: tool, title: title, body: msg, kind: kind }, '*');
      }
    } catch (e) {}
    try {
      if (window.BroadcastChannel) {
        var bc = new BroadcastChannel('tarkov-tools');
        bc.postMessage({ type: 'notification', item: { title: title, body: msg, tool: tool, kind: kind } });
        bc.close();
      }
    } catch (e) {}
  }

  function reportStatus(opts) {
    opts = opts || {};
    var tool = opts.tool || currentFile();
    if (tool && tool.indexOf('/') !== -1) tool = tool.split('/').pop();
    var payload = {
      type: 'tt-status',
      tool: tool,
      running: !!opts.running,
      label: opts.label || opts.detail || ''
    };
    try {
      global.__ttLastStatus = { running: payload.running, label: payload.label, tool: tool };
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
    } catch (e) {}
    try {
      if (window.BroadcastChannel) {
        var bc = new BroadcastChannel('tarkov-tools');
        bc.postMessage(payload);
        bc.close();
      }
    } catch (e) {}
  }

  try {
    window.addEventListener('message', function (ev) {
      if (ev.data && ev.data.type === 'tt-ping-status' && global.__ttLastStatus) {
        reportStatus(global.__ttLastStatus);
      }
    });
  } catch (e) {}

  function addToMiniAndGoHub() {
    var file = currentFile();
    var title = currentTitle();
    try {
      if (global.TarkovState && TarkovState.addMiniTab) {
        TarkovState.addMiniTab({ file: file, title: title });
      }
    } catch (e) {}
    try {
      location.href = 'tarkovtool-hub.html#mini=' + encodeURIComponent(file);
    } catch (e) {
      location.href = 'tarkovtool-hub.html';
    }
  }

  function injectMiniButton() {
    if (isHubPage()) return;
    var bar = document.getElementById('tt-global-bar');
    if (!bar || document.getElementById('tt-bar-mini')) return;
    var hub = document.getElementById('tt-bar-hub');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'tt-bar-mini';
    btn.className = 'btn-ghost';
    btn.textContent = 'МИНИ';
    btn.title = 'Добавить в мини-табы хаба';
    btn.onclick = function (e) { e.preventDefault(); addToMiniAndGoHub(); };
    if (hub && hub.parentNode) hub.parentNode.insertBefore(btn, hub);
    else bar.appendChild(btn);
  }

  function boot() {
    if (isInMiniFrame()) {
      try {
        document.documentElement.classList.add('tt-mini-frame');
        document.body.classList.add('tt-mini-frame');
        document.documentElement.style.overflowY = 'scroll';
        document.body.style.overflowY = 'scroll';
        document.body.style.height = 'auto';
        document.body.style.maxHeight = 'none';
      } catch (e) {}
    }
    if (!document.getElementById('tt-global-bar') && !isInMiniFrame()) {
      setTimeout(boot, 50);
      return;
    }
    injectMiniButton();
  }

  global.Notify = Notify;
  global.reportStatus = reportStatus;
  global.TarkovMini = {
    Notify: Notify,
    addToMiniAndGoHub: addToMiniAndGoHub,
    currentFile: currentFile,
    isInMiniFrame: isInMiniFrame,
    reportStatus: reportStatus
  };

  function loadDeps(then) {
    var pending = 0;
    function one() { pending--; if (pending <= 0) then(); }
    if (!global.TarkovState) {
      pending++;
      var s = document.createElement('script');
      s.src = 'tarkov-state.js';
      s.onload = one; s.onerror = one;
      document.head.appendChild(s);
    }
    if (!global.TarkovNames) {
      pending++;
      var s2 = document.createElement('script');
      s2.src = 'tarkov-names.js';
      s2.onload = one; s2.onerror = one;
      document.head.appendChild(s2);
    }
    if (pending === 0) then();
  }

  loadDeps(function () {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  });
})(window);
