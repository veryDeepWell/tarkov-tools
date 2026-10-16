# S2 — Unified bestBuy / itemPrice (domain)

## Проблема
10+ копий `bestBuy` / `getPrice` / `itemPrice` в тулах с разным набором полей.

## Решение (ядро)

`core/tarkov-item-domain.js` `__v: 2`:

| API | Назначение |
|-----|------------|
| `bestBuy(item, opts?)` | самый дешёвый оффер торговца |
| `bestTraderOffer(item)` | legacy shape |
| `fleaPrice(item)` | lastLow / avg24h |
| `itemPrice(item, opts?)` | min(flea, trader) |
| `effectivePrice` | → itemPrice |

### opts
- `maxLL` — потолок УЛ
- `allowQuest` — default `true`
- `sources` — `buyFromTrader` | `buyFor` | `both`
- `traderOnly` / `fleaOnly` — для `itemPrice`

Поля `bestBuy`: `price`, `trader`, `traderKey`, `traderName`, `ll`/`minLL`/`traderLevel`, `quest`, `questName`, `raw`.

Интеграция с `TarkovProfile.offerMeta` (если загружен).

## Мигрированы тулы

containers, mods, mags, compare, hideout, gun-budget (`getPrice`), gun-builder (`itemPrice`).

Локальная `function bestBuy` → тонкий адаптер к domain (совместимость `name`/`ll`).

## Ещё не мигрированы (очередь S2b)

ammo (inline), headphones (inline), cultist, trader-flip, btc-farm, shopping-list, barter-*, hideout-mgmt.

## Проверка

```bash
node --check core/tarkov-item-domain.js
# тул с ценой торговца: Load → колонка trader без регрессии
```
