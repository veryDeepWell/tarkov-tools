# S7 — named constants (no magic numbers)

## `core/tarkov-const.js` (новый)

Подключать **до** `tarkov-api.js` (и желательно до domain):

```html
<script src="../core/tarkov-storage.js"></script>
<script src="../core/tarkov-const.js"></script>
<script src="../core/tarkov-schema.js"></script>
…
<script src="../core/tarkov-api.js"></script>
```

Без файла — везде есть fallback на прежние литералы.

### Константы

| Ключ | Значение | Было |
|------|----------|------|
| `SEC_PER_HOUR` / `SEC_PER_DAY` | 3600 / 86400 | time math |
| `MS_PER_MINUTE/HOUR/DAY` | 6e4 / … | |
| `API_MEMORY_TTL_MS` | 90s | api DEFAULT_TTL |
| `API_LS_TTL_MS` | 5 min | LS_TTL |
| `LOCALE_TTL_MS` | 1 day | quests getJson |
| `RESTOCK_DEFAULT_CYCLE_MS` | 3h | restock |
| `RESTOCK_CYCLE_MIN/MAX_MS` | 30m–12h | |
| `RAID_DEFAULT_DURATION_MS` | 20 min | raid-checklist |
| `DEFAULT_GUN_BUDGET` | 500000 | gun-budget |
| `FLEA_TAX_VOUCHER` | 0.05 | domain flea tax |
| `FLEA_OUTLIER_RATIO/REPLACE` | 0.05 / 0.35 | barter-opt |

```js
TarkovConst.DEFAULT_GUN_BUDGET
TarkovConst.API_LS_TTL_MS
```

## Что **не** трогали

- `sec / 3600` в formatDuration — очевидная арифметика времени
- веса скоринга `0.8` в gun-budget/stims — domain heuristics, отдельный баланс-патч
- beep tone timings в common

## Файлы

```
core/tarkov-const.js   (новый)
core/tarkov-api.js
core/tarkov-item-domain.js
js/gun-budget.js
js/restock.js
js/raid-checklist.js
js/quests.js
js/barter-opt.js
js/btc-farm.js
```
