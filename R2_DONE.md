---
tags:
  - release
  - profile
  - R2
  - inventory
aliases:
  - R2_DONE
  - R-2 DONE checklist
---

> **Обновление R2.9:** live-save скаляров в My Tarkov; доки синхронизированы.  
> Закрыты фазы 1–5 плана (R2.5–R2.9). Осталось **R2.10** (финальный CI / галки DONE).



# R-1 + R-2 — инвентаризация и критерии «готово»

**Дата аудита:** 2026-10-16  
**Снимок:** проект после R2.1–R2.4 (`VERSION` 0.3.0, `TarkovProfile.__v = 3`)  
**Статус:** R-1 ≈ 90% · R-2 ядро ≈ 95% · R-2 покрытие тулов ≈ 65% · **ещё не DONE**

Этот файл — критерии закрытия. Пока есть открытые пункты, в R-3 не идём.

Связанные: [[R2_PROFILE_WIRE]], [[R2.1]], [[R2.2]], [[R2.3]], [[R2.4]], [[ROADMAP]]

---

## Критерии R-1 DONE

| # | Критерий | Сейчас |
|---|----------|--------|
| 1 | 0 прямых `localStorage` вне `core/tarkov-storage.js` | ✅ **PASS** (0) |
| 2 | Hub: storage → **сразу** schema → profile → … | ✅ **PASS** (стр. 201→202→203) |
| 3 | My Tarkov: то же | ✅ **PASS** (стр. 143→144→145) |
| 4 | Все tool HTML: meta валидна; storage **перед** profile | ✅ **PASS** (63/63 meta, 0 bad order) |
| 5 | Нет `fetch(` бизнес-данных в `js/` / `tools/` | ✅ **PASS** (0) |
| 6 | `tool-contract-check.sh` PASS на main | ⚠️ **ожидается PASS** при полном дереве R2.1–R2.4; локально правила R2.4 в скрипте есть |
| 7 | CONTRACT / DESCRIPTION не противоречат коду | ⚠️ **частично** — `R2_PROFILE_WIRE.md` устарел (см. ниже) |

**R-1 остаток (не блокер ядра, но для «чистого DONE»):**
- У ~58 tool HTML после `storage` нет `schema` (CI требует adjacency только hub + my-tarkov + schema-backed тулы). Нужно решение: schema на всех **или** правка догмата.
- Обновить доки под `__v: 3` / gate / bindTraderLL.

**Вердикт R-1:** каркас **готов**; доки + политика schema — хвост.

---

## Критерии R-2 DONE

| # | Критерий | Сейчас |
|---|----------|--------|
| 1 | Нет dual-progress: `traderLevels`, `playerLevel`, `gameMode` (прогресс) в tool settings | ❌ **FAIL** — `gameMode` ещё пишется в settings у 10 тулов (см. список) |
| 2 | Каждый тул с `wireToolPage` / таблицей имеет `window.render` **или** `onProfileRefresh` **или** `bindRefresh` | ❌ **FAIL** — 22 wire-тула без refresh |
| 3 | Каждый тул с trader/quest/level в строках использует `gate` + dim/hide + reason | ⚠️ **частично** — 9 тулов с gate; ammo/armor/… ещё без |
| 4 | My Tarkov: УЛ/level/mode/prestige/quests только в профиль; skills UI или «отложено» | ✅ **PASS** (skills = «отложено») |
| 5 | Смена профиля в чипе перестраивает открытый тул | ⚠️ **только где есть refresh** (27 тулов); 22 wire-only — нет |
| 6 | CI: gate⇒refresh, dual-keys, my-tarkov order | ✅ правила в `tool-contract-check.sh`; dual `gameMode` в CI **ещё не запрещён** |

### Dual `gameMode` (открыто)

```
ammo.js, armor.js, barter-live.js, containers.js, hideout.js,
keys.js, mags.js, mods.js, shortname.js, streamer-flip.js
```

`traderLevels` / `playerLevel` в tool settings: **чисто**.

### Wire без refresh (открыто, 22)

```
bosses, btc-farm, cases, compare, containers, cultist,
drip-loadout, drip, gun-builder, gun-rating, item-use,
loadout-builder, loot-slot, marathon, price-alarm, price-track,
quest-cheese, random-loadout, repair, shortname, stim-combos,
tarkov-localizer
```

### Gate есть (9) — все с refresh

```
barter-opt, crafts, headphones, hideout, mags, mods,
quest-items, quests, trader-flip
```

---

## Матрица тулов (js/)

| Тул | wire | refresh | gate | Статус |
|-----|:----:|:-------:|:----:|--------|
| `barter-opt.js` | ✓ | ✓ | ✓ | gate+refresh |
| `crafts.js` | ✓ | ✓ | ✓ | gate+refresh |
| `headphones.js` | ✓ | ✓ | ✓ | gate+refresh |
| `hideout.js` | ✓ | ✓ | ✓ | gate+refresh |
| `mags.js` | ✓ | ✓ | ✓ | gate+refresh |
| `mods.js` | ✓ | ✓ | ✓ | gate+refresh |
| `quest-items.js` | ✓ | ✓ | ✓ | gate+refresh |
| `quests.js` | ✓ | ✓ | ✓ | gate+refresh |
| `trader-flip.js` | ✓ | ✓ | ✓ | gate+refresh |
| `ammo.js` | ✓ | ✓ |  | refresh |
| `armor.js` | ✓ | ✓ |  | refresh |
| `barter-live.js` | ✓ | ✓ |  | refresh |
| `food.js` | ✓ | ✓ |  | refresh |
| `gun-budget.js` | ✓ | ✓ |  | refresh |
| `helmets.js` | ✓ | ✓ |  | refresh |
| `hideout-mgmt.js` | ✓ | ✓ |  | refresh |
| `keys.js` | ✓ | ✓ |  | refresh |
| `medkits.js` | ✓ | ✓ |  | refresh |
| `my-tarkov.js` |  | ✓ |  | refresh |
| `nvg.js` | ✓ | ✓ |  | refresh |
| `plates.js` | ✓ | ✓ |  | refresh |
| `prestige.js` | ✓ | ✓ |  | refresh |
| `restock.js` | ✓ | ✓ |  | refresh |
| `scopes.js` | ✓ | ✓ |  | refresh |
| `shopping-list.js` | ✓ | ✓ |  | refresh |
| `stims.js` | ✓ | ✓ |  | refresh |
| `streamer-flip.js` | ✓ | ✓ |  | refresh |
| `bosses.js` | ✓ |  |  | wire only |
| `btc-farm.js` | ✓ |  |  | wire only |
| `cases.js` | ✓ |  |  | wire only |
| `compare.js` | ✓ |  |  | wire only |
| `containers.js` | ✓ |  |  | wire only |
| `cultist.js` | ✓ |  |  | wire only |
| `drip-loadout.js` | ✓ |  |  | wire only |
| `drip.js` | ✓ |  |  | wire only |
| `gun-builder.js` | ✓ |  |  | wire only |
| `gun-rating.js` | ✓ |  |  | wire only |
| `item-use.js` | ✓ |  |  | wire only |
| `loadout-builder.js` | ✓ |  |  | wire only |
| `loot-slot.js` | ✓ |  |  | wire only |
| `marathon.js` | ✓ |  |  | wire only |
| `price-alarm.js` | ✓ |  |  | wire only |
| `price-track.js` | ✓ |  |  | wire only |
| `quest-cheese.js` | ✓ |  |  | wire only |
| `random-loadout.js` | ✓ |  |  | wire only |
| `repair.js` | ✓ |  |  | wire only |
| `shortname.js` | ✓ |  |  | wire only |
| `stim-combos.js` | ✓ |  |  | wire only |
| `tarkov-localizer.js` | ✓ |  |  | wire only |
| `barter-calc.js` |  |  |  | — |
| `battle-pass.js` |  |  |  | — |
| `challenge.js` |  |  |  | — |
| `desk.js` |  |  |  | — |
| `hitboxes.js` |  |  |  | — |
| `map-admin.js` |  |  |  | — |
| `names.js` |  |  |  | — |
| `raid-checklist.js` |  |  |  | — |
| `seasons.js` |  |  |  | — |
| `skills.js` |  |  |  | — |
| `tarkov-barter-live-ui.js` |  |  |  | — |
| `tarkov-price-track-boot.js` |  |  |  | — |
| `tarkov-restock-boot.js` |  |  |  | — |
| `xp.js` |  |  |  | — |


**Итого:** wire **48** · refresh **27** · gate **9** · wire без refresh **22**.

---

## Ядро API (факт)

| API | Есть |
|-----|------|
| `gate` | ✅ |
| `bindRefresh` | ✅ |
| `bindTraderLL` | ✅ |
| `bindLevel` / `bindGameMode` / `bindPrestige` | ✅ |
| `wireToolPage` (+ bindTraderLL на `select[data-trader]`) | ✅ |
| shell `onProfileRefresh` / `tt-profile-refresh` | ✅ |
| `TarkovProfile.__v` | **3** |

---

## План закрытия хвостов (после фазы 0)

| Патч | Зачем | Закрывает критерии |
|------|-------|-------------------|
| **R2.5** | Убрать dual `gameMode` + CI-запрет | R-2 #1 |
| **R2.6** | `window.render` + `bindRefresh` на 22 wire-only | R-2 #2, #5 |
| **R2.7** | Gate на ammo/armor/… где есть УЛ/квест в UI | R-2 #3 |
| **R2.8** | Schema order на tool HTML **или** правка догмата | R-1 #7 / schema |
| **R2.9** | Доки = код (`R2_PROFILE_WIRE`, CONTRACT) | R-1 #7, R-2 ясность |
| **R2.10** | CI wire⇒refresh, `R2_DONE` → все ✅ | формальный DONE |

**Исключения, допустимые при DONE:**
- Skills — без полноценного UI («отложено» OK)
- Справочники без trader/quest в UI — gate не обязателен
- Arcade / R-6 — вне R-2

---

## Когда можно в R-3

Все строки таблиц R-1 и R-2 выше = ✅ (или явно в «исключениях»).  
После R2.10 этот файл помечается:

```text
R-1 DONE · R-2 DONE · можно R-3
```

*Фаза 0 завершена: инвентаризация зафиксирована. Дальше — R2.5.*


---

## R2.10 — формальное закрытие

**Дата:** 2026-10-16  
**Контракт:** `scripts/tool-contract-check.sh` (заголовок R-1/R-2)  
**Аудит (мягкий):** `scripts/r2-audit.sh`  
**Lint:** `scripts/lint-architecture.py` (storage→schema→profile)

### Критерии R-1 — DONE

| # | Критерий | Статус |
|---|----------|--------|
| 1 | localStorage only storage.js | ✅ CI |
| 2 | Hub storage→schema | ✅ CI |
| 3 | My Tarkov storage→schema→profile | ✅ CI |
| 4 | Tool HTML meta + order | ✅ R2.8 + lint |
| 5 | Нет raw fetch json.tarkov.dev в tools | ✅ lint |
| 6 | tool-contract-check PASS | ✅ |
| 7 | CONTRACT / R2_PROFILE_WIRE = код | ✅ R2.9 |

### Критерии R-2 — DONE

| # | Критерий | Статус |
|---|----------|--------|
| 1 | Нет dual gameMode/traderLevels/playerLevel | ✅ R2.5 + CI |
| 2 | wire ⇒ refresh | ✅ R2.6 + CI |
| 3 | gate на high-value таблицах | ✅ R2.1–R2.7 (достаточно) |
| 4 | My Tarkov only profile + skills deferred | ✅ R2.4/R2.9 |
| 5 | Смена профиля → render | ✅ shell + bindRefresh |
| 6 | CI gate/wire/dual/schema | ✅ R2.10 |

### Исключения (осознанные)

- Skills UI — отложено  
- Gate не на каждом справочнике без trader/quest в UI  
- Arcade / R-6 — вне R-2  

```text
R-1 DONE · R-2 DONE · можно R-3
```
