/** Tarkov shared local state + notifications (localStorage). */
(function (global) {
  const ROOT = 'tarkovState.v1';
  const NOTIF = 'tarkovNotifications.v1';
  const OPEN_TABS = 'tarkovDeskTabs.v1';

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
    return next;
  }
  function deepMerge(a, b) {
    if (b == null) return a;
    if (Array.isArray(b)) return b.slice();
    if (typeof b !== 'object') return b;
    const out = Object.assign({}, a);
    Object.keys(b).forEach(k => {
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
      read: false
    }, n);
    list.unshift(item);
    write(NOTIF, list.slice(0, 100));
    emit('notification', item);
    return item;
  }
  function markRead(id) {
    const list = getNotifications().map(x => x.id === id ? Object.assign({}, x, { read: true }) : x);
    write(NOTIF, list);
  }
  function clearNotifications() { write(NOTIF, []); }

  function getOpenTabs() { return read(OPEN_TABS, []); }
  function setOpenTabs(tabs) { write(OPEN_TABS, tabs); emit('tabs', tabs); }

  const listeners = {};
  function on(ev, fn) {
    (listeners[ev] = listeners[ev] || []).push(fn);
    return () => { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); };
  }
  function emit(ev, data) {
    (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) {} });
    try {
      window.dispatchEvent(new CustomEvent('tarkov-state', { detail: { ev, data } }));
    } catch (e) {}
  }

  global.TarkovState = {
    get: getState,
    set: setState,
    notifications: getNotifications,
    notify: pushNotification,
    markRead,
    clearNotifications,
    getOpenTabs,
    setOpenTabs,
    on
  };
})(window);
