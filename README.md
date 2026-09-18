# P3 — Localizer / soft timers / origin

## Push

| File | Change |
|------|--------|
| `tarkov-price-track-boot.js` | origin check, `postMessage(..., location.origin)`, clearInterval on pagehide |
| `tarkov-restock-boot.js` | same |
| `tarkov-localizer.js` | TarkovUI.esc, TarkovAPI.getJson when available, still max 4 langs |

Already OK on main:
- Catalog title «Локализатор»
- Localizer cap 4 + selected-only packs
- price-alarm soft restore (`run.on` → start)
