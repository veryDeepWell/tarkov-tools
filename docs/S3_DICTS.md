# S3 — Traders only via TarkovDicts

## Проблема
Дубли mongo-id → имя/key/mult в тулах (`TRADER_RU`, `TRADER_ID`, `MULT`, `TNAME`) с расхождениями (например lightkeeper id).

## Решение

### `core/tarkov-dicts.js` `__v: 2`
- уже: `traders`, `trader()`, `traderName()`, `traderCultistMult()`
- **+** `traderKey(idOrKey)` — id/key → canonical key

### Тулы: вычищены локальные карты

| Файл | Было | Стало |
|------|------|-------|
| containers, mods, mags | TRADER_RU | удалено (bestBuy domain) |
| hideout | TRADER_RU | `traderName` |
| quest-items | TRADER_RU | `traderName` |
| restock | TRADER_RU object | `traderName` |
| shortname | TRADER_ID | `traderKey` |
| trader-flip | TRADER_ID_FALLBACK | `traderKey` (+ API map) |
| cultist | MULT + TNAME | `traderCultistMult` / `traderName` |

## Канон

```js
TarkovDicts.traderName(idOrKey)       // «Прапор»
TarkovDicts.traderKey(idOrKey)        // "prapor"
TarkovDicts.traderCultistMult(idOrKey)
TarkovDicts.trader(idOrKey)           // full row
```

## Файлы

```
core/tarkov-dicts.js
js/containers.js
js/mods.js
js/mags.js
js/hideout.js
js/quest-items.js
js/restock.js
js/shortname.js
js/trader-flip.js
js/cultist.js
```
