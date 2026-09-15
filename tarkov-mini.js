/*! Mini-tabs + Notify addon — load after tarkov-common.js */
(function (global) {
  function currentToolFile() {
    try {
      var p = (location.pathname || '').split('/').pop() || '';
      return p.indexOf('tarkovtool-') === 0 ? p : (p.endsWith('.html') ? p : '');
    } catch (e) { return ''; }
  }
  function currentToolTitle() {
    var meta = document.getElementById('tarkovtool-meta');
    if (meta) {
      try {
        var j = JSON.parse(meta.textContent || '{}');
        if (j.title) return j.title;
      } catch (e) {}
    }
    return (document.title || '').split('\u2014')[0].split('-')[0].trim() || currentToolFile();
  }
  function isHubPage() {
    var f = currentToolFile();
    return !f || f === 'tarkovtool-hub.html' || f === 'index.html';
  }
  function ensureState(cb) {
    if (window.TarkovState) { if (cb) cb(); return; }
    var s = document.createElement('script');
    s.src = 'tarkov-state.js';
    s.onload = function () { if (cb) cb(); };
    s.onerror = function () { if (cb) cb(); };
    document.head.appendChild(s);
  }
  function Notify(opts) {
    var o = typeof opts === 'string' ? { title: opts } : (opts || {});
    var title = o.title || 'Событие';
    var body = o.body || '';
    var tool = o.tool || currentToolFile();
    try {
      if (global.TarkovTools && TarkovTools.beep) TarkovTools.beep(o.kind === 'err' ? 'err' : 'ok');
    } catch (e) {}
    try {
      if (global.TarkovState && TarkovState.notify) TarkovState.notify({ title: title, body: body, tool: tool });
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'tt-notify', tool: tool, title: title, body: body }, '*');
      }
    } catch (e) {}
  }
  function addToMiniAndHub() {
    var file = currentToolFile();
    if (!file || file === 'tarkovtool-hub.html') return;
    var title = currentToolTitle();
    try {
      if (global.TarkovState && TarkovState.addMiniTab) TarkovState.addMiniTab({ file: file, title: title });
      else {
        var key = 'tarkovMiniTabs.v1';
        var tabs = [];
        try { tabs = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
        tabs = tabs.filter(function (t) { return t.file !== file; });
        tabs.push({ file: file, title: title });
        localStorage.setItem(key, JSON.stringify(tabs));
      }
    } catch (e) {}
    location.href = 'tarkovtool-hub.html#mini=' + encodeURIComponent(file);
  }
  function injectMiniBtn() {
    if (isHubPage()) return;
    if (document.getElementById('tt-bar-mini')) return;
    var hub = document.getElementById('tt-bar-hub');
    if (!hub || !hub.parentNode) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-ghost';
    btn.id = 'tt-bar-mini';
    btn.title = 'Мини-таб в хабе';
    btn.textContent = (global.TarkovTools && TarkovTools.lang && TarkovTools.lang() === 'en') ? 'MINI' : 'МИНИ';
    btn.onclick = function () {
      try { if (global.TarkovTools && TarkovTools.beep) TarkovTools.beep('ok'); } catch (e) {}
      addToMiniAndHub();
    };
    hub.parentNode.insertBefore(btn, hub);
  }
  function boot() {
    ensureState(function () {});
    if (global.TarkovTools) global.TarkovTools.Notify = Notify;
    global.Notify = Notify;
    injectMiniBtn();
    setTimeout(injectMiniBtn, 50);
    setTimeout(injectMiniBtn, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
