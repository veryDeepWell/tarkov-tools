/** Mini-tabs addon: МИНИ button + unified Notify() */
(function (global) {
  if (global.__ttMiniLoaded) return;
  global.__ttMiniLoaded = true;

  function currentFile() {
    try {
      const path = (location.pathname || '').split('/').pop() || '';
      return path || 'index.html';
    } catch (e) { return 'unknown'; }
  }

  function currentTitle() {
    try {
      const meta = document.getElementById('tarkovtool-meta');
      if (meta) {
        const j = JSON.parse(meta.textContent || '{}');
        if (j.title) return j.title;
      }
    } catch (e) {}
    return document.title || currentFile();
  }

  function isInMiniFrame() {
    try {
      return window.parent && window.parent !== window && window.parent.TarkovHubMini === true;
    } catch (e) { return false; }
  }

  function isHubPage() {
    return !!global.TarkovHubMini;
  }

  function Notify(titleOrOpts, body) {
    let title, msg, tool, kind, silent;
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

    if (!silent) {
      try {
        if (global.TarkovTools && typeof TarkovTools.beep === 'function') {
          TarkovTools.beep(kind === 'warn' || kind === 'error' ? 'warn' : 'ok');
        }
      } catch (e) {}
    }

    try {
      if (global.TarkovState && typeof TarkovState.notify === 'function') {
        TarkovState.notify({ title: title, body: msg, tool: tool });
      }
    } catch (e) {}

    try {
      if (isInMiniFrame()) {
        window.parent.postMessage({ type: 'tt-notify', tool: tool, title: title, body: msg }, '*');
      }
    } catch (e) {}
  }

  function addToMiniAndGoHub() {
    const file = currentFile();
    const title = currentTitle();
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
    const bar = document.getElementById('tt-global-bar');
    if (!bar) return;
    if (document.getElementById('tt-bar-mini')) return;

    const hub = document.getElementById('tt-bar-hub');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'tt-bar-mini';
    btn.className = 'btn-ghost';
    btn.textContent = 'МИНИ';
    btn.title = 'Добавить в мини-табы хаба и остаться загруженным';
    btn.onclick = function (e) {
      e.preventDefault();
      addToMiniAndGoHub();
    };

    if (hub && hub.parentNode) {
      hub.parentNode.insertBefore(btn, hub);
    } else {
      bar.appendChild(btn);
    }
  }

  function boot() {
    if (!document.getElementById('tt-global-bar')) {
      setTimeout(boot, 50);
      return;
    }
    injectMiniButton();
  }

  global.Notify = Notify;
  global.TarkovMini = {
    Notify: Notify,
    addToMiniAndGoHub: addToMiniAndGoHub,
    currentFile: currentFile,
    isInMiniFrame: isInMiniFrame
  };

  if (!global.TarkovState) {
    var s = document.createElement('script');
    s.src = 'tarkov-state.js';
    s.onload = boot;
    document.head.appendChild(s);
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }
})(window);
