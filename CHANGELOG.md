# Changelog

All notable changes to **Tarkov Tools** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Repository hygiene: expanded `.gitignore` (venv, caches, IDE), removed empty tool directories and leftover `core/catalog-index.js`, normalized shell script line endings, synced `VERSION` to 0.3.0.

### Added
- Shared P3 item/weapon domain APIs, item view models, scoring, compatibility, and market calculations.
- Namespaced `tt:` storage keys with centralized migration from legacy key formats.
- A generated hub catalog, category/type filters, and local SVG category icons.
- Architecture lint and GitHub Actions checks for catalog, script, API, and tool contracts.

### Changed
- Localized the P3-affected item and utility tools in English and Russian, including dynamic UI updates on language changes.
- Storage export/import now uses canonical namespaced keys while accepting legacy backups.
- Consolidated the hub runtime and archived superseded documentation and catalog artifacts.

### Fixed
- Fixed barter calculator i18n initialization and refresh after locale loading; corrected P3 tool script-loading issues found during browser checks.
- Closing a live mini-tab now stops its poll schedule before removing the iframe.
- Corrected tool-page script URLs that pointed to nonexistent JavaScript files.

---

## [0.3.0+] — 2026-09-27 (current)

### Architectural
- **Core modules:** `tarkov-names.js`, `tarkov-api.js`, `tarkov-state.js`, `tarkov-i18n.js`, `tarkov-common.js`
- **Platform contract:** [`_archive/docs/PLATFORM.md`](_archive/docs/PLATFORM.md) — historical platform notes
- **Tool checklist:** [`_archive/docs/TOOL_CHECKLIST.md`](_archive/docs/TOOL_CHECKLIST.md) — historical acceptance criteria

### Core modules (unified core)
- **TarkovAPI:** Single network + cache boundary to tarkov.dev
- **TarkovState:** Notifications, mini-tabs, cross-tab broadcast
- **TarkovI18n:** Locale packs, DOM apply, fallback to English
- **TarkovItems:** Normalized items, indexes, shared queries (planned Stage 2)
- **TarkovUI:** Shared UI primitives (progress, help modals, cards — planned Stage 3)

### Live utilities (background updates)
- **Price Track:** `tools/tarkovtool-price-track.html` + `.js`
- **Price Alarm:** `tools/tarkovtool-price-alarm.html` + `.js`
- **Restock Alert:** `tools/tarkovtool-restock.html` + `.js`

### Static utilities
- Barter Live, Bosses DB, Ammo Catalog, Barters Live, and more (see the generated [`hub/catalog.js`](hub/catalog.js))

### Localization
- RU/EN support via `tarkov-names.js` and `tarkov-i18n.js`
- Planned total i18n with `data-i18n` attributes

### Fixes (from Wave 1)
- **Price Track:**
  - Persist `lastSnap` / `nextSnapAt` in localStorage (background + manual)
  - Countdown timer on page + mini-tab ("via Xm Ys · was DD.MM HH:MM")
  - Chart: dark canvas background, bright lines, Resize, 1 point drawn
  - Resume respects `nextSnapAt` (no reset on tab open)

### Removed
- Direct `fetch("https://json.tarkov.dev/...")` → use `TarkovAPI` only
- Duplicate notification handlers → unified `Notify` from `tarkov-common.js`
- Repeated utility functions (`esc`, `humanize`, `loadSettings`) → moved to core

---

## [0.2.x] — Previously

### Added
- Initial tools: `barter-live`, `bosses`, static utilities
- Basic notification system (per-tool)

### Fixed
- Early prototypes of price tracking, barter monitoring

---

**Created:** 2026-09-27  
**Next review:** at versions 0.4.0+
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
