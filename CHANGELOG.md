# Changelog

**[Русский](#020--2026-09-17)** · **[English](#020--2026-09-17-en)**

---

## 0.2.0 — 2026-09-17

### Добавлено

- Система мини-табов: пул iframe, чипы статуса, бейджи непрочитанного, expand/collapse
- Мост `Notify` / `reportStatus` между инструментами и хабом
- Общая панель уведомлений (по времени)
- Категории каталога со свёрткой (`tarkov-hub-cats.js`)
- Разделы настроек: общее, звук, внешний вид, скрытые инструменты
- Выбор акцентного цвета
- Общий слой запросов `tarkov-api.js`
- Цепочка имён `tarkov-names.js` (shortName игры → имя API → пользовательский short)
- `tarkov-icons.js` и каталог `assets/icons/` под кастомные иконки
- Инструменты: price-alarm, food, random-loadout, drip-loadout, loadout-builder, loadout-budget (заглушка), drip-builder (заглушка)
- Paperdoll-раскладка для лоадаутов
- Описания для всех записей каталога

### Изменено

- Каталог хаба: инструменты сгруппированы по категориям
- Expand ограничен высотой viewport; прокрутка контента внутри iframe
- Price-track и restock: фоновый статус и обработка интервалов
- UI круга культистов: слоты в колонку
- Пайплайн уведомлений: хаб зеркалит события из iframe; бейдж не сбрасывается только от expand
- Минимальный интервал уведомлений — 1 минута

### Исправлено

- Падение рендера категорий (рекурсия в `hiddenList`)
- Двойной опрос / сброс интервала restock при сворачивании
- Отсутствие страницы price-alarm (404)
- Отображение имён предметов как сырых хешей
- Выход expand-панели за нижний край экрана
- Автозапуск опросов при одном лишь открытии мини-таба (открытие ≠ старт)

### Удалено

- Единственный режим каталога без категорий (вместо него категории и закрепления)

### 0.1.x — 2026-09-09 … 2026-09-16

Первый хаб на GitHub Pages, общая тема, ранние инструменты (barter, ammo, armor, hideout, cultist, restock, price-track).

---

## 0.2.0 — 2026-09-17 (EN)

### Added

- Mini-tab system: iframe pool, status chips, unread badges, expand/collapse
- `Notify` / `reportStatus` bridge between tools and hub
- Global notification panel (chronological)
- Catalog categories with collapse state (`tarkov-hub-cats.js`)
- Settings sections: general, sound, appearance, hidden tools
- Accent color selection
- Shared `tarkov-api.js` request layer
- `tarkov-names.js` display chain (game shortName → API name → custom short)
- `tarkov-icons.js` and `assets/icons/` for custom tool icons
- Tools: price-alarm, food, random-loadout, drip-loadout, loadout-builder, loadout-budget (stub), drip-builder (stub)
- Paperdoll layout for loadout tools
- Catalog descriptions for all registered tools

### Changed

- Hub catalog: tools grouped under category headers
- Expand host limited to viewport; tool content scrolls inside the iframe
- Price-track and restock: background run state and interval handling
- Cultist circle UI: column layout for slots
- Notification pipeline: hub mirrors iframe events; badge is not cleared on expand alone
- Minimum notification interval reduced to 1 minute

### Fixed

- Category render crash (recursive `hiddenList`)
- Double polling / interval reset on restock when collapsing
- Missing price-alarm page (404)
- Item labels shown as raw hashes
- Expand panel overflow below the fold
- Mini-tab auto-start of polls on mere open (open ≠ start)

### Removed

- Single unlabeled catalog mode only (categories + pins instead)

### 0.1.x — 2026-09-09 … 2026-09-16

Initial GitHub Pages hub, shared theme, early tools (barter, ammo, armor, hideout, cultist, restock, price-track).
