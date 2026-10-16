# S2 complete — unified bestBuy / itemPrice

## Было «S2b»?

Первый S2-патч сделал **ядро + 7 тулов**. Остальные откладывались как S2b.  
**Этот архив = S2 целиком** (ядро + все разумные миграции).

## Domain API (`__v: 2`)

| Метод | Роль |
|-------|------|
| `bestBuy(item, opts?)` | самый дешёвый buy-оффер |
| `itemPrice(item, opts?)` | min(flea, trader) |
| `fleaPrice` / `bestTraderOffer` / `effectivePrice` | вспомогательные |

## Мигрировано

| Тул | Как |
|-----|-----|
| containers, mods, mags, compare, hideout | `bestBuy` adapter |
| gun-budget | `itemPrice` + maxLL |
| gun-builder | `itemPrice` |
| ammo | inline → `bestBuy` |
| headphones | `traderBuy` → `bestBuy` |
| hideout-mgmt, gun-rating, shopping-list, btc-farm | `itemPrice` |
| barter-opt | traderBest → `bestBuy` |
| cultist | `traderBuyCost` → `bestBuy` |

## Намеренно не «best only»

| Тул | Почему |
|-----|--------|
| **trader-flip** | нужна **таблица всех** офферов, не один best |
| **item-use** | UI показывает список buy/sell |
| **shopping-list traderLine** | сведён к best (достаточно) |

Перебор всех офферов там — не баг, а UX. Цены/мета по-прежнему могут идти через `offerMeta`.

## Файлы

```
core/tarkov-item-domain.js
js/*.js  (15)
```
