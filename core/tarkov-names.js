/**
 * TarkovNames — shared item display names across tools.
 *
 * Custom shorts: localStorage `tarkovShortNames` = { [itemId]: shortName }
 * from tarkovtool-shortname.html.
 *
 * Display order:
 *   1) in-game shortName (BSG short, e.g. "M4A1")
 *   2) full API name
 *   3) custom short from shortname tool
 *   4) normalizedName / slug
 *   5) id (last resort)
 */
(function (global) {
  const KEY = 'tarkovShortNames';
  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (e) {
      cache = {};
    }
    return cache;
  }

  function invalidate() {
    cache = null;
  }

  function getShort(id) {
    if (!id) return '';
    return load()[id] || '';
  }

  function isHashLike(s) {
    if (!s || typeof s !== 'string') return true;
    s = s.trim();
    if (!s) return true;
    if (/^[a-f0-9]{20,}$/i.test(s)) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s)) return true;
    if (/^[a-f0-9]{24}$/i.test(s)) return true;
    if (s.length >= 16 && !/[a-z]/i.test(s)) return true;
    return false;
  }

  function display(item) {
    if (item == null) return '';
    if (typeof item === 'string') {
      const custom = getShort(item);
      if (custom) return custom;
      return item;
    }
    const id = item.id || item.itemId || '';
    const gameShort = String(item.shortName || '').trim();
    const apiName = String(item.name || item.localizedName || '').trim();
    const custom = id ? getShort(id) : '';
    const slug = String(item.normalizedName || item.slug || '').trim();

    if (gameShort && !isHashLike(gameShort)) return gameShort;
    if (apiName && !isHashLike(apiName)) return apiName;
    if (custom) return custom;
    if (slug) return slug;
    if (gameShort) return gameShort;
    if (apiName) return apiName;
    return id || '';
  }

  function displayFull(item) {
    if (!item || typeof item === 'string') return display(item);
    const short = display(item);
    const full = String(item.name || item.localizedName || '').trim();
    if (full && full !== short && !isHashLike(full)) return short + ' · ' + full;
    return short;
  }

  function search(query, items) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return items.slice();
    const map = load();
    const primary = [];
    const secondary = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const id = it.id || it.itemId || '';
      const full = String(it.name || it.localizedName || '').toLowerCase();
      const apiShort = String(it.shortName || '').toLowerCase();
      const custom = String(map[id] || '').toLowerCase();
      const slug = String(it.normalizedName || it.slug || '').toLowerCase();
      if (full.includes(q) || id.toLowerCase() === q) {
        primary.push(it);
      } else if (apiShort.includes(q) || custom.includes(q) || slug.includes(q)) {
        secondary.push(it);
      }
    }
    return primary.concat(secondary);
  }

  function matches(item, query) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return true;
    const id = item.id || item.itemId || '';
    const hay = [
      item.name, item.localizedName, item.shortName, getShort(id),
      item.normalizedName, item.slug, id
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  function resolveFromCatalog(row, byId) {
    if (!row) return row;
    const id = row.id || row.itemId || '';
    const cat = (byId && id && byId[id]) || null;
    if (!cat) return row;
    return Object.assign({}, row, {
      shortName: cat.shortName || row.shortName,
      name: cat.name || row.name,
      localizedName: cat.localizedName || row.localizedName,
      normalizedName: cat.normalizedName || row.normalizedName || row.slug,
      iconLink: cat.iconLink || row.iconLink || row.icon
    });
  }

  try {
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) invalidate();
    });
  } catch (e) {}

  function itemName(item) { return display(item); }
  global.itemName = itemName;
  global.TarkovNames = {
    itemName: itemName,
    KEY: KEY, load: load, invalidate: invalidate, getShort: getShort,
    display: display, displayFull: displayFull, search: search,
    matches: matches, resolveFromCatalog: resolveFromCatalog, isHashLike: isHashLike
  };
})(window);
