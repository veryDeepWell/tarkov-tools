# Tarkov Tools

**[Русский](#русский)** · **[English](#english)**

Static HTML/CSS/JS toolkit for Escape from Tarkov. No build step. Data: [json.tarkov.dev](https://json.tarkov.dev).

**Live:** https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html

---

## Русский

Набор статических инструментов для Escape from Tarkov. Чистый HTML/CSS/JS, без сборки. Данные — [json.tarkov.dev](https://json.tarkov.dev).

**Демо:** https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html

### Архитектура

| Файл | Назначение |
|------|------------|
| `tarkovtool-hub.html` | Оболочка хаба: поиск, каталог, мини-табы, expand, уведомления |
| `tarkov-hub-app.js` | Каталог, пул iframe, expand/collapse, закрепления |
| `tarkov-hub-cats.js` | Категории, свёртка, скрытие инструментов |
| `tarkov-state.js` | localStorage, уведомления, список мини-табов, BroadcastChannel |
| `tarkov-mini.js` | Кнопка МИНИ, `Notify()`, `reportStatus()` |
| `tarkov-api.js` | Общие запросы к API и кэш |
| `tarkov-names.js` | Имена: shortName игры → имя API → пользовательский short |
| `tarkov-icons.js` | Иконки карточек (emoji / опционально файлы) |
| `tarkov-common.js`, `.css` | Тема, акцент, звук, настройки |
| `tarkovtool-*.html` | Отдельные инструменты |

Инструмент открывается как страница или как мини-таб в хабе. Мини-таб держит iframe в пуле; таймеры и опросы продолжают работать. Переключение табов iframe не уничтожает. Закрытие мини-таба или перезагрузка хаба — сброс состояния.

### Локальный запуск

```bash
git clone https://github.com/veryDeepWell/tarkov-tools.git
cd tarkov-tools
python -m http.server 8080
```

Открыть `http://localhost:8080/tarkovtool-hub.html`.

### Добавление инструмента

1. Файл `tarkovtool-<id>.html` с `tarkov-common.css` и `tarkov-common.js`.
2. Мета: `<script type="application/json" id="tarkovtool-meta">{"title":"…","description":"…"}</script>`
3. Запись в `CATALOG` (`tarkov-hub-app.js`): `file`, `title`, `description`, опционально `icon`.
4. Категория в `CAT_MAP` (`tarkov-hub-cats.js`).
5. Фон (по необходимости): `Notify(...)`, `reportStatus({ running, label })`.
6. Имена через `TarkovNames.display`, запросы через `TarkovAPI`.
7. Свой префикс ключей localStorage.

### Иконки

У записи каталога могут быть `icon` и/или `iconUrl`. По умолчанию — emoji. Свои файлы: `assets/icons/<id>.svg` (или `.png` / `.webp`), затем `iconUrl` / `TarkovIcons.register`, либо `TarkovIcons.useAssetFolder = true`.

### Хаб (кратко)

Поиск и закрепления, категории со свёрткой, мини-табы с бейджами, общий список уведомлений, настройки (общее / звук / вид / скрытые инструменты), expand в пределах рабочей области.

### Документация

[CHANGELOG.md](CHANGELOG.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

Не связан с Battlestate Games.

---

## English

Static toolkit for Escape from Tarkov. Vanilla HTML/CSS/JS, no build step. Market and item data from [json.tarkov.dev](https://json.tarkov.dev).

**Live:** https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html

### Architecture

| File | Responsibility |
|------|----------------|
| `tarkovtool-hub.html` | Hub shell: search, catalog host, mini-tab bar, expand panel, notifications |
| `tarkov-hub-app.js` | Catalog data, iframe pool, expand/collapse, pins |
| `tarkov-hub-cats.js` | Categories, collapse state, hidden-tool filter |
| `tarkov-state.js` | localStorage, notifications, mini-tab list, BroadcastChannel |
| `tarkov-mini.js` | MINI control, `Notify()`, `reportStatus()` |
| `tarkov-api.js` | Shared requests and cache for json.tarkov.dev |
| `tarkov-names.js` | Names: game shortName → API name → user short name |
| `tarkov-icons.js` | Card/chip icons (emoji / optional image assets) |
| `tarkov-common.js`, `.css` | Theme, accent, audio, settings |
| `tarkovtool-*.html` | Standalone tools |

A tool opens as a normal page or as a hub mini-tab. Mini-tabs keep a real-size iframe in an off-screen pool so timers and polls keep running. Switching tabs does not destroy the iframe. Closing the mini-tab or reloading the hub resets tool state.

### Local development

```bash
git clone https://github.com/veryDeepWell/tarkov-tools.git
cd tarkov-tools
python -m http.server 8080
```

Open `http://localhost:8080/tarkovtool-hub.html`.

### Adding a tool

1. Add `tarkovtool-<id>.html` with `tarkov-common.css` and `tarkov-common.js`.
2. Meta: `<script type="application/json" id="tarkovtool-meta">{"title":"…","description":"…"}</script>`
3. Register in `CATALOG` (`tarkov-hub-app.js`): `file`, `title`, `description`, optional `icon`.
4. Map category in `CAT_MAP` (`tarkov-hub-cats.js`).
5. Optional background: `Notify(...)`, `reportStatus({ running, label })`.
6. Prefer `TarkovNames.display` and `TarkovAPI`.
7. Use a dedicated localStorage key prefix.

### Icons

Catalog entries may set `icon` and/or `iconUrl`. Default UI is emoji. Custom files: `assets/icons/<id>.svg` (or `.png` / `.webp`), then `iconUrl` / `TarkovIcons.register`, or `TarkovIcons.useAssetFolder = true`.

### Hub (summary)

Search and pins, collapsible categories, mini-tabs with badges, global notification list, settings (general / sound / appearance / hidden tools), expand constrained to the work area.

### Docs

[CHANGELOG.md](CHANGELOG.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

Not affiliated with Battlestate Games.
