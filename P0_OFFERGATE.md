# P0 — offerGate / offerMeta

## core/tarkov-profile.js (__v: 4)

- `offerMeta(offer)` → `{ traderKey, minLL, questLocked, questName }`
- `offerGate(offer)` → `gate({ trader, minLL, questLocked, questName })`
- Export: `offerMeta`, `offerGate`

Trader id→key: `TarkovDicts.traderKey` if есть, иначе поиск по `Dicts.traders[].id`.

## js (optional)

`mods.js`, `mags.js`, `headphones.js`: `ttOfferMeta` → делегирует в `TarkovProfile.offerMeta` (fallback локальный).

## Критерий

```bash
grep -n 'function offerGate' core/tarkov-profile.js
grep -n 'offerGate:' core/tarkov-profile.js
```
