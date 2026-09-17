# Changelog

## 0.2.0 — 2026-09-17

### Added

- Mini-tab system: persistent iframe pool, status chips, unread badges, expand/collapse
- `Notify` / `reportStatus` bridge between tools and hub
- Global notification panel (chronological)
- Catalog categories with collapse state (`tarkov-hub-cats.js`)
- Settings sections: general, sound, appearance, hidden tools
- Accent color selection
- Shared `tarkov-api.js` request layer
- `tarkov-names.js` display chain (game shortName → API name → custom short)
- `tarkov-icons.js` and `assets/icons/` hook for custom tool icons
- Tools: price-alarm, food, random-loadout, drip-loadout, loadout-builder, loadout-budget (stub), drip-builder (stub)
- Paperdoll layout for loadout tools
- Catalog descriptions for all registered tools

### Changed

- Hub catalog: tools grouped under category headers
- Expand host limited to viewport; tool content scrolls inside the iframe
- Price-track and restock: background run state and interval handling
- Cultist circle UI: column layout for slots
- Notification pipeline: hub mirrors iframe events; badge is not cleared on expand alone
- Minimum notification interval reduced to 1 minute

### Fixed

- Category render crash (recursive `hiddenList`)
- Double polling / interval reset on restock when collapsing
- Missing price-alarm page (404)
- Item labels shown as raw hashes in several lists
- Expand panel overflow below the fold
- Mini-tab auto-start of polls on mere open (open ≠ start)

### Removed

- Single unlabeled tool dump as the only catalog mode (categories + pins instead)

## 0.1.x — 2026-09-09 … 2026-09-16

Initial GitHub Pages hub, shared theme, early tools (barter, ammo, armor, hideout, cultist, restock, price-track).
