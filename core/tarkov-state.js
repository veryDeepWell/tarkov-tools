/**
 * TarkovState — shared local state, mini-tabs, notifications.
 * Cross-frame: BroadcastChannel('tarkov-tools') so mini-tab iframes update hub badges.
 */
(function (global) {
  const ROOT = 'tarkovState.v1';
  const NOTIF = 'tarkovNotifications.v1';
  const MINI = 'tarkovMiniTabs.v1';
  const CHANNEL = 'tarkov-tools';

  let bc = null;
  try { bc = new BroadcastChannel(CHANNEL); } catch (e) { bc = null; }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function getState() {
    return read(ROOT, {
      player: { level: 1, gameMode: 'pve' },
      hideout: { stations: {}, notes: '' },
      quests: { active: [], completed: [] },
      inventory: { items: {} },
      alerts: { prices: [] },
      settings: {}
    });
  }
  function setState(patch) {
    const cur = getState();
    const next = deepMerge(cur, patch);
    write(ROOT, next);
    emit('state', next);
    broadcast({ type: 'state' });
    return next;
  }
  function deepMerge(a, b) {
    if (b == null) return a;
    if (Array.isArray(b)) return b.slice();
    if (typeof b !== 'object') return b;
    const out = Object.assign({}, a);
    Object.keys(b).forEach(function (k) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object')
        out[k] = deepMerge(a[k], b[k]);
      else out[k] = b[k];
    });
    return out;
  }

  function getNotifications() { return read(NOTIF, []); }

  function pushNotification(n) {
    const list = getNotifications();
    const item = Object.assign({
      id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      read: false,
      tool: n.tool || '',
      title: n.title || '',
      body: n.body || ''
    }, n);
    if (item.tool && item.tool.indexOf('/') !== -1) item.tool = item.tool.split('/').pop();
    if (item.href && !item.tool) item.tool = String(item.href).split('/').pop();
    list.unshift(item);
    write(NOTIF, list.slice(0, 200));
    emit('notification', item);
    broadcast({ type: 'notification', item: item });
    return item;
  }

  function markRead(id) {
    const list = getNotifications().map(function (x) {
      return x.id === id ? Object.assign({}, x, { read: true }) : x;
    });
    write(NOTIF, list);
    emit('notification', null);
    broadcast({ type: 'notification' });
  }

  function markToolRead(tool) {
    const key = String(tool || '').split('/').pop();
    const list = getNotifications().map(function (x) {
      const t = String(x.tool || '').split('/').pop();
      return t === key ? Object.assign({}, x, { read: true }) : x;
    });
    write(NOTIF, list);
    emit('notification', null);
    broadcast({ type: 'notification' });
  }

  function clearNotifications() {
    write(NOTIF, []);
    emit('notification', null);
    broadcast({ type: 'notification' });
  }

  function unreadForTool(tool) {
    const key = String(tool || '').split('/').pop();
    return getNotifications().filter(function (x) {
      return !x.read && String(x.tool || '').split('/').pop() === key;
    }).length;
  }

  function unreadCount() {
    return getNotifications().filter(function (x) { return !x.read; }).length;
  }

  function getMiniTabs() { return read(MINI, []); }
  function setMiniTabs(tabs) {
    write(MINI, Array.isArray(tabs) ? tabs : []);
    emit('mini', tabs);
    broadcast({ type: 'mini' });
  }
  function addMiniTab(tab) {
    const tabs = getMiniTabs().filter(function (t) { return t.file !== tab.file; });
    tabs.push(tab);
    setMiniTabs(tabs);
  }
  function removeMiniTab(file) {
    setMiniTabs(getMiniTabs().filter(function (t) { return t.file !== file; }));
  }

  const listeners = Object.create(null);
  function on(ev, fn) {
    if (!listeners[ev]) listeners[ev] = [];
    listeners[ev].push(fn);
    return function () {
      listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; });
    };
  }
  function emit(ev, data) {
    (listeners[ev] || []).forEach(function (fn) {
      try { fn(data); } catch (e) {}
    });
  }
  function broadcast(msg) {
    try { if (bc) bc.postMessage(msg); } catch (e) {}
  }

  if (bc) {
    bc.onmessage = function (ev) {
      const d = ev.data;
      if (!d || !d.type) return;
      if (d.type === 'notification') emit('notification', d.item || null);
      if (d.type === 'mini') emit('mini', getMiniTabs());
      if (d.type === 'state') emit('state', getState());
    };
  }

  try {
    window.addEventListener('storage', function (e) {
      if (e.key === NOTIF) emit('notification', null);
      if (e.key === MINI) emit('mini', getMiniTabs());
      if (e.key === ROOT) emit('state', getState());
    });
  } catch (e) {}

  global.TarkovState = {
    get: getState,
    set: setState,
    notifications: getNotifications,
    notify: pushNotification,
    markRead: markRead,
    markToolRead: markToolRead,
    clearNotifications: clearNotifications,
    unreadForTool: unreadForTool,
    unreadCount: unreadCount,
    getMiniTabs: getMiniTabs,
    setMiniTabs: setMiniTabs,
    addMiniTab: addMiniTab,
    removeMiniTab: removeMiniTab,
    getOpenTabs: getMiniTabs,
    setOpenTabs: setMiniTabs,
    getMini: getMiniTabs,
    setMini: setMiniTabs,
    on: on,
    KEYS: { ROOT: ROOT, NOTIF: NOTIF, MINI: MINI }
  };
})(window);
