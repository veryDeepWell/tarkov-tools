/** Hub notification panel + fix: don't clear badges on expand */
(function () {
  function allNotifications() {
    try {
      return JSON.parse(localStorage.getItem('tarkovNotifications.v1') || '[]');
    } catch (e) { return []; }
  }
  function totalUnread() {
    return allNotifications().filter(function (n) { return !n.read; }).length;
  }
  function updateNotifBell() {
    var el = document.getElementById('notifCount');
    var btn = document.getElementById('btnNotif');
    if (!el) return;
    var n = totalUnread();
    el.textContent = String(n);
    if (btn) {
      if (n > 0) btn.classList.add('has-unread');
      else btn.classList.remove('has-unread');
    }
  }
  function esc(s) {
    return String(s || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  }
  function renderNotifPanel() {
    var box = document.getElementById('notifList');
    if (!box) return;
    var list = allNotifications().slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    if (!list.length) { box.innerHTML = '<p class="meta">Пока пусто</p>'; return; }
    box.innerHTML = list.map(function (n) {
      var when = n.ts ? new Date(n.ts).toLocaleString('ru-RU') : '';
      var tool = (n.tool || '').replace('tarkovtool-', '').replace('.html', '');
      var cls = n.read ? '' : ' unread';
      return '<div class="n-row' + cls + '"><div class="n-title">' + esc(n.title || '—') + '</div>' +
        (n.body ? '<div class="n-body">' + esc(n.body) + '</div>' : '') +
        '<div class="n-meta">' + esc(when) + (tool ? ' · ' + esc(tool) : '') + '</div></div>';
    }).join('');
  }
  function openNotifPanel() {
    renderNotifPanel();
    var bg = document.getElementById('notifPanelBg');
    if (bg) bg.classList.add('show');
  }
  function closeNotifPanel() {
    var bg = document.getElementById('notifPanelBg');
    if (bg) bg.classList.remove('show');
  }
  function markAllRead() {
    try {
      var list = allNotifications().map(function (n) { return Object.assign({}, n, { read: true }); });
      localStorage.setItem('tarkovNotifications.v1', JSON.stringify(list));
    } catch (e) {}
    try {
      if (window.TarkovState && TarkovState.getMiniTabs) {
        (TarkovState.getMiniTabs() || []).forEach(function (t) {
          if (TarkovState.markToolRead) TarkovState.markToolRead(t.file);
        });
      }
    } catch (e) {}
    renderNotifPanel();
    updateNotifBell();
    try { if (typeof renderMiniList === 'function') renderMiniList(); } catch (e) {}
  }

  if (typeof expandTab === 'function') {
    var _expand = expandTab;
    window.expandTab = function (file) {
      var saved = null;
      if (window.TarkovState && TarkovState.markToolRead) {
        saved = TarkovState.markToolRead;
        TarkovState.markToolRead = function () {};
      }
      try { return _expand(file); }
      finally {
        if (saved) TarkovState.markToolRead = saved;
      }
    };
  }

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.type !== 'tt-notify' || !d.title) return;
    try {
      if (window.TarkovState && TarkovState.notify) {
        var tool = (d.tool || '').split('/').pop();
        TarkovState.notify({ title: d.title, body: d.body || '', tool: tool, kind: d.kind || 'ok' });
      }
    } catch (e) {}
    updateNotifBell();
    try { if (typeof renderMiniList === 'function') renderMiniList(); } catch (e) {}
  });

  function bind() {
    var btn = document.getElementById('btnNotif');
    if (btn) btn.onclick = openNotifPanel;
    var close = document.getElementById('notifClose');
    if (close) close.onclick = closeNotifPanel;
    var mark = document.getElementById('notifMarkAll');
    if (mark) mark.onclick = markAllRead;
    var bg = document.getElementById('notifPanelBg');
    if (bg) bg.addEventListener('click', function (e) { if (e.target === bg) closeNotifPanel(); });
    updateNotifBell();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  setInterval(function () {
    updateNotifBell();
    try { if (typeof renderMiniList === 'function') renderMiniList(); } catch (e) {}
  }, 2000);
})();
