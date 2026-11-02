/**
 * TarkovNames — shared item display names across tools.
 *
 * json.tarkov.dev often returns placeholders like:
 *   name: "5447a9cd4bdc2dbd208b4567 Name"
 *   shortName: "5447a9cd4bdc2dbd208b4567 ShortName"
 * Real human label is usually normalizedName (slug).
 *
 * Display order:
 *   1) custom short (shortname tool)
 *   2) real shortName / name (not placeholder/hash)
 *   3) humanized normalizedName / slug
 *   4) id last resort
 */
(function (global) {
  const KEY = "tt:tool:shortname:data:overrides";
  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      cache = (global.TarkovStorage && TarkovStorage.getJson(KEY, {})) || {};
    } catch (e) {
      cache = {};
    }
    return cache;
  }

  function invalidate() {
    cache = null;
  }

  function getShort(id) {
    if (!id) return "";
    return load()[id] || "";
  }

  function isHashLike(s) { return TarkovData.technical(s); }
  function isPlaceholderName(s) { return TarkovData.technical(s); }
  function humanizeSlug(slug) { return TarkovData.humanize(slug); }

  function display(item) {
    const custom = getShort(TarkovData.id(item));
    if (custom && !TarkovData.technical(custom)) return custom;
    return TarkovData.label("item", item);
  }

  function displayFull(item) {
    const short = display(item);
    const full = TarkovData.resolve("item", item, { full: true });
    if (full.resolved && full.label !== short) return short + " · " + full.label;
    return short;
  }

  function search(query, items) {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return items.slice();
    const map = load();
    const primary = [];
    const secondary = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const id = it.id || it.itemId || "";
      const label = display(it).toLowerCase();
      const full = String(it.name || it.localizedName || "").toLowerCase();
      const apiShort = String(it.shortName || "").toLowerCase();
      const custom = String(map[id] || "").toLowerCase();
      const slug = String(it.normalizedName || it.slug || "").toLowerCase();
      if (label.includes(q) || full.includes(q) || id.toLowerCase() === q) {
        primary.push(it);
      } else if (apiShort.includes(q) || custom.includes(q) || slug.includes(q)) {
        secondary.push(it);
      }
    }
    return primary.concat(secondary);
  }

  function matches(item, query) {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return true;
    const id = item.id || item.itemId || "";
    const hay = [
      display(item), item.name, item.localizedName, item.shortName, getShort(id),
      item.normalizedName, item.slug, id
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  }

  function resolveFromCatalog(row, byId) {
    if (!row) return row;
    const id = row.id || row.itemId || "";
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
    window.addEventListener("storage", function (e) {
      if (e.key === KEY) invalidate();
    });
  } catch (e) { try { console.debug && console.debug("[tt:names]", e); } catch (_tt) { /* ignore */ } }

  function itemName(item) { return display(item); }
  global.itemName = itemName;
  global.TarkovNames = {
    itemName: itemName,
    KEY: KEY,
    load: load,
    invalidate: invalidate,
    getShort: getShort,
    display: display,
    displayFull: displayFull,
    search: search,
    matches: matches,
    resolveFromCatalog: resolveFromCatalog,
    isHashLike: isHashLike,
    isPlaceholderName: isPlaceholderName,
    humanizeSlug: humanizeSlug
  };
})(window);
