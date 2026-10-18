# Bugfix: names, prestige, catalog, Sources header

## 1. Names (hashes)
- `core/tarkov-names.js` — never show full mongo id as name; fallback `…xxxxxx`
- `core/tarkov-dicts.js` — `humanize()` skips hash-like strings; objects → TarkovNames.display
- `core/tarkov-tool-shell.js` — injects `tarkov-names.js` if missing
- `js/ammo.js` — names via TarkovNames.display(item)

## 2. Prestige
- Auto-load API ~400ms after grid ready (less empty state)

## 3. Catalog
- Removed **Источники** as catalog tool
- Descriptions without `R-3.x:` prefixes
- Human-readable titles/descriptions for item-card, effects, packer, fact, strength

## 4. Sources = header button
- Shell adds **Источники** link in `.tt-tool-header-actions` (all tool pages)
- Page `tarkovtool-sources.html` remains for the content

## Copy
core/*, js/*, tools/*, catalog-data.js, hub/catalog-data.js
