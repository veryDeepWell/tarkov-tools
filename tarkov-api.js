/**
 * TarkovAPI — shared fetch layer for json.tarkov.dev
 * Tools should use TarkovAPI.items() / barters() instead of raw fetch.
 */
(function (global) {
  const BASE = 'https://json.tarkov.dev';
  const cache = new Map();
  const DEFAULT_TTL = 60 * 1000;

  function mode() {
    try {
      if (global.TarkovTools && TarkovTools.preferredMode) return TarkovTools.preferredMode();
    } catch (e) {}
    try { return localStorage.getItem('tarkovPreferredGameMode') || 'pve'; } catch (e) { return 'pve'; }
  }

  async function getJson(path, opts) {
    opts = opts || {};
    const url = path.startsWith('http') ? path : (BASE + path);
    const key = url + '|' + (opts.cacheKey || '');
    const ttl = opts.ttl != null ? opts.ttl : DEFAULT_TTL;
    if (!opts.noCache && cache.has(key)) {
      const hit = cache.get(key);
      if (Date.now() - hit.ts < ttl) return hit.data;
    }
    const res = await fetch(url, { cache: opts.httpCache || 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
    const data = await res.json();
    cache.set(key, { ts: Date.now(), data: data });
    return data;
  }

  function asArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.data)) return raw.data;
      if (raw.data && typeof raw.data === 'object') {
        for (const k of Object.keys(raw.data)) {
          if (Array.isArray(raw.data[k])) return raw.data[k];
        }
        return Object.values(raw.data);
      }
      return Object.values(raw);
    }
    return [];
  }

  async function items(gameMode) {
    const m = gameMode || mode();
    const json = await getJson('/' + m + '/items');
    return asArray(json && json.data && json.data.items != null ? json.data.items : (json && json.data) || json);
  }

  async function barters(gameMode) {
    const m = gameMode || mode();
    const json = await getJson('/' + m + '/barters');
    return asArray(json && json.data && json.data.barters != null ? json.data.barters : (json && json.data) || json);
  }

  async function traders(gameMode) {
    const m = gameMode || mode();
    const json = await getJson('/' + m + '/traders');
    return asArray(json && json.data && json.data.traders != null ? json.data.traders : (json && json.data) || json);
  }

  async function quests(gameMode) {
    const m = gameMode || mode();
    const json = await getJson('/' + m + '/quests');
    return asArray(json && json.data && json.data.quests != null ? json.data.quests : (json && json.data) || json);
  }

  async function hideout(gameMode) {
    const m = gameMode || mode();
    const json = await getJson('/' + m + '/hideout/stations');
    return asArray(json && json.data || json);
  }

  function clearCache() { cache.clear(); }

  global.TarkovAPI = {
    BASE: BASE,
    mode: mode,
    getJson: getJson,
    items: items,
    barters: barters,
    traders: traders,
    quests: quests,
    hideout: hideout,
    asArray: asArray,
    clearCache: clearCache
  };
})(window);
