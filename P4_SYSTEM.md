# P4 — system tail (S1–S7 infrastructure)

## core/
| File | Change |
|------|--------|
| `tarkov-ui.js` | `runLoad`, `processChunked`, `softAlert` / `alert` |
| `tarkov-dicts.js` | `traderKey(idOrKey)` |
| `tarkov-const.js` | copy (wire API) |
| `tarkov-api.js` | TTL from `TarkovConst` |

## js/ (priority)
- progress start/done/fail: mods, containers, keys, mags, ammo, crafts, compare
- i18n loading strings (Гружу… → common.loading)
- bestBuy → domain wrapper where local fn existed
- softAlert instead of alert: gun-budget, cultist, desk, skills, hideout, my-tarkov, raid-checklist, bosses
- TRADER_RU → Dicts.traderName (containers/mods/mags)

## locales
common.pickWeapon, noBasePrice, budgetTooLow, slotsFull, maxTabs, saved, loadingData, loadError

## HTML note
Подключи `tarkov-const.js` **до** `tarkov-api.js` (hub + tools), иначе fallback литералы.

## Not in this zip
- processChunked not yet wired into every heavy loop (API is ready)
- hub/ empty catches
- full S3 mongo-id purge on all files
