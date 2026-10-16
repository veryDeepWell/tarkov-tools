# P3 — gate + ammo / gun-budget / armor

## ammo.js
- Best trader offer: domain `bestBuy` или fallback + `offerMeta`
- Поля ряда: `traderKey`, `questName`
- `renderTable`: `TarkovProfile.gate` → hide / `applyLockToElement` (dim + title reason)
- `window.render` → `renderTable` при смене профиля

## gun-budget.js
- `syncLlFromProfile()` — `#ll` = max УЛ из профиля
- Вызов на build и в `window.render`

## armor.js
- Тот же gate/hide/applyLock на строках с traderLL/quest

## Зависимости
P0 (`offerGate`/`offerMeta`/`gate`) желателен; ammo использует `gate` напрямую.
