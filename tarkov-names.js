/**
 * TarkovNames — shared item display names across tools.
 *
 * Source of truth for custom short names: localStorage key `tarkovShortNames`
 * written by tarkovtool-shortname.html as { [itemId]: shortName }.
 *
 * Philosophy: tools stay independent, but names are a shared vocabulary.
 * Resolution order: user short → API shortName → name → normalizedName → id.
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
    const map = load();
    return map[id] || '';
  }

  function display(item) {
    if (item == null) return '';
    if (typeof item === 'string') {
      return getShort(item) || item;
    }
    const id = item.id || item.itemId || '';
    const user = id ? getShort(id) : '';
    if (user) return user;
    return (
      item.shortName ||
      item.name ||
      item.localizedName ||
      item.normalizedName ||
      item.slug ||
      id ||
      ''
    );
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
      item.name,
      item.localizedName,
      item.shortName,
      getShort(id),
      item.normalizedName,
      item.slug,
      id
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  }

  try {
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) invalidate();
    });
  } catch (e) {}

  global.TarkovNames = {
    KEY: KEY,
    load: load,
    invalidate: invalidate,
    getShort: getShort,
    display: display,
    search: search,
    matches: matches
  };
})(window);
