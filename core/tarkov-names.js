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
  const KEY = "tarkovShortNames";
  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      cache = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
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

  function isHashLike(s) {
    if (!s || typeof s !== "string") return true;
    s = s.trim();
    if (!s) return true;
    if (/^[a-f0-9]{20,}$/i.test(s)) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s)) return true;
    if (/^[a-f0-9]{24}$/i.test(s)) return true;
    if (s.length >= 16 && !/[a-z]/i.test(s)) return true;
    return false;
  }

  /** API placeholder: "<id> Name" / "<id> ShortName" */
  function isPlaceholderName(s, id) {
    if (!s || typeof s !== "string") return true;
    s = s.trim();
    if (!s) return true;
    if (isHashLike(s)) return true;
    if (/\s(Name|ShortName)$/i.test(s)) return true;
    if (id && s.indexOf(String(id)) === 0) return true;
    return false;
  }

  function humanizeSlug(slug) {
    if (!slug) return "";
    return String(slug)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }

  function display(item) {
    if (item == null) return "";
    if (typeof item === "string") {
      const custom = getShort(item);
      if (custom) return custom;
      if (isPlaceholderName(item) || isHashLike(item)) return humanizeSlug(item) || item;
      return item;
    }
    const id = item.id || item.itemId || "";
    const custom = id ? getShort(id) : "";
    if (custom) return custom;

    const gameShort = String(item.shortName || "").trim();
    const apiName = String(item.name || item.localizedName || "").trim();
    const slug = String(item.normalizedName || item.slug || "").trim();

    if (gameShort && !isPlaceholderName(gameShort, id)) return gameShort;
    if (apiName && !isPlaceholderName(apiName, id)) return apiName;
    if (slug) return humanizeSlug(slug);
    if (gameShort) return gameShort;
    if (apiName) return apiName;
    return id || "";
  }

  function displayFull(item) {
    if (!item || typeof item === "string") return display(item);
    const short = display(item);
    const full = String(item.name || item.localizedName || "").trim();
    const id = item.id || item.itemId || "";
    if (full && full !== short && !isPlaceholderName(full, id)) return short + " · " + full;
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
  } catch (e) {}

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
