# System audit — Tarkov Tools (post R2.10)

**Дата:** 2026-10-16  
**Цель:** не только R-2, а **системность** всего продукта: UX загрузки, хардкод, магия, дубли.

---

## Главный вывод

Контракт прогресса **уже был в ядре**, но большинство тулов его **не вызывали**:

- `TarkovUI.progress.set` — шаги **по 5%** (уже в коде)
- `progress.done` — **beep ok** (уже в коде)
- `progress.fail` — ошибка

**Проблема:** ~33 тула с `TarkovAPI` без `progress.start/done` → нет бара и звука.

**S1 (этот патч):** `TarkovUI.runLoad` + подключение progress к ~26 loaders.

---

## Этапы (лестница)

| Этап | Тема | Статус |
|------|------|--------|
| **S1** | Load UX: progress + beep + `runLoad` | **этот патч** |
| **S2** | Единый `bestBuy` / offer price в domain (убить 10+ копий) | очередь |
| **S3** | TRADER_RU / mongo-id карты → только `TarkovDicts` | очередь |
| **S4** | i18n: убрать голый русский из `js/*` status/alert | очередь |
| **S5** | `alert()` → status / modal / beep | очередь |
| **S6** | Chunked client process (после fetch) с `progress.set` 5% | очередь |
| **S7** | Magic numbers → именованные константы / settings | очередь |
| **S8** | Пустые `catch {}` — хотя бы `console` / status | очередь |

---

## S1 — детали

### Ядро
- `TarkovUI.__v = 4`
- `TarkovUI.runLoad(opts, work)` / `progress.run` — канон:
  - disable btn
  - start (indeterminate)
  - work(progress) может звать `set(0..100)` с шагом 5%
  - done → beep; fail при ошибке

### Тулы с progress после S1
ammo, bosses, compare, containers, crafts, cultist, drip, gun-budget, hideout, hideout-mgmt, item-use, keys, loot-slot, mags, medkits, mods, nvg, prestige, quest-items, quests, restock, scopes, shortname, stim-combos, stims, streamer-flip (+ уже были: armor, cases, barter-*, …)

### Ещё без / слабо
- btc-farm, challenge, drip-loadout, loadout-builder, random-loadout, trader-flip, tarkov-localizer (другая модель load / auto)

---

## Находки (не S1)

### Хардкод торговцев
Дубли `TRADER_RU` / mongo id: containers, hideout, mags, mods, quest-items, restock, shortname, trader-flip, cultist.

**Норма:** только `TarkovDicts.traders` / `traderName`.

### Дубли bestBuy / itemPrice
ammo, compare, containers, gun-budget, gun-builder, hideout, mags, mods, …

**Норма:** один helper в `TarkovItemDomain` или `offerMeta` + price.

### alert()
bosses, cultist, desk, gun-budget, hideout, map-admin, my-tarkov, raid-checklist, skills — для ошибок загрузки лучше status + `progress.fail`.

### Магические числа
- `3600` (16×) — TTL/час  
- `0.05`, `0.8` — скоринг  
- `500000` — дефолт бюджета gun-budget  
- `30000` / `15000` — таймауты/цены  

### i18n
Много `status.textContent = 'Гружу…'` без `t()`.

### API
`TarkovAPI.items()` — **один** HTTP; «5%» — про **клиентскую** обработку через `progress.set`, не про chunked network (json endpoints не режут).

---

## Как проверять S1

1. Открыть тул с Load (mods, ammo, containers…)
2. Должен появиться progress bar
3. По успеху — beep (если не выключен в настройках)
4. Ошибка сети — fail, не silent

```bash
bash scripts/tool-contract-check.sh
# опционально позже: scripts/r2-audit.sh
```

---

## Next

**S2** — domain `bestBuy` + миграция 3–5 тулов как образец.  
Потом S3–S8 по одной.
