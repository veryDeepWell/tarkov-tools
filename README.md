# Tarkov Tools — Я здесь 🛠️

> Браузерные утилиты для Escape from Tarkov. Откройте [`tarkovtool-hub.html`](./tarkovtool-hub.html) напрямую или запускайте репозиторий как статический сайт. Требуется никакой сборки или модификации игры.

## ✨ Возможности

- 🔍 **Каталог инструментов** — поиск, категории, фильтры (статические/живые инструменты)
- 📌 **Закрепляемые инструменты** — ваши часто используемые всегда под рукой
- 💬 **Уведомления** — система оповещений с настройками звука и частоты
- 🪟 **Мини-табы** — компактные виджеты в хаб-iframe
- ⚙️ **Настройки** — звук, внешний вид, скрытие инструментов
- 🌐 **Локализация** — English / Русский (RU/EN)

## 📦 Доступные инструменты

### Живые инструменты (background monitoring)

| Инструмент | Описание |
|------------|----------|
| [Price Track](./tools/tarkovtool-price-track.html) | Отслеживание цены предмета в реальном времени с графиком |
| [Price Alarm](./tools/tarkovtool-price-alarm.html) | Уведомления о достижении целевой цены |
| [Restock Alert](./tools/tarkovtool-restock.html) | Алёровка о пополнениях у торговцев и мусорках |

### Каталоги (static reference)

| Категория | Инструменты |
|-----------|-------------|
| 🎁 **Barters** | [Barter Live](./tools/tarkovtool-barter-live.html), Barters Live, Barters Offline |
| 🔫 **Weapons** | Gunsmith, Optics Configurator, Weapon Builder (план) |
| 🛡️ **Armor** | Armor/Plates Catalog, Drip Builder, Loadout Budget |
| 🍖 **Food** | Food Catalog, Cooked Food |
| 👕 **Loadouts** | Random Loadout, Drip Loadout, Loadout Builder, Cultists (paperdoll) |
| 🚗 **Hideout** | Hideout Upgrades, Cultist Circle, Hideout Map |
| 💰 **Market** | Flea Catalog, Trader Prices, Restock Checker |
| ⚔️ **Quests** | Quest Tracker (планируется), Achievements |
| 👹 **Bosses** | Bosses Database, Bounty System |
| 🗺️ **Map** | [Interactive Maps](./tools/tarkovtool-map.html) — 12 локаций от tarkov.dev |
| 🧰 **Utils** | Ammo Catalog, Food Calculator и другие |

> 📖 **Полное описание всех инструментов:** [DECRIPTION.md](./DECRIPTION.md)

> 📝 Полный список в [`каталоге инструментов`](hub/catalog.json).

## 🌍 Локализация

Проект поддерживает два языка:
- 🇷🇺 **Русский** — `locales/ru.json`
- 🇬🇧 **English** — `locales/en.json`

Переключение языка происходит автоматически (определение из браузера).

## 🚀 Начало работы

### Запуск прямо из браузера

Просто откройте в любом современном браузере:

```bash
tarkovtool-hub.html
```

Или используйте локальный веб-сервер:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# Nginx/Apache/PHP — как статический сайт
```

Откройте `http://localhost:8000/tarkovtool-hub.html`

### Требования к браузерам

- ✅ Chrome/Edge (Chromium) 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+
- ✅ Brave, Vivaldi и другие Chromium-браузеры

## ⚙️ Настройки

Найдите раздел **Settings** в хабe для настройки:

- 🔇 **Звук** — общий громкость, настройки на каждый тип уведомлений
- 🎨 **Внешний вид** — акцентный цвет, тема
- 📦 **Категории** — скрытие группировок каталога
- 📌 **Закрепления** — ваши избранные инструменты

## 🔧 Для разработчиков

### Добавление нового инструмента

1. Создайте файл `tools/tarkovtool-<id>.html`
2. Добавьте JSON metadata блок `#tarkovtool-meta`
3. Логику в `js/<slug>.js`
4. Запустите `python scripts/build-catalog.py` для генерации каталога

📖 Подробно в [CONTRIBUTING.md](./CONTRIBUTING.md)

### Архитектура

- [`core/`](./core/) — общие API, хранилище, локализация, UI
- [`hub/`](./hub/) — хаб app и модули (каталог, настройки, уведомления)
- [`tools/`](./tools/) — страницы инструментов
- [`js/`](./js/) — логика инструментов
- [`locales/`](./locales/) — пакеты переводов
- [`assets/icons/`](./assets/icons/) — SVG иконки

📐 Полная схема в [ARCHITECTURE.md](./ARCHITECTURE.md)

### Контракт платформы

Все инструменты следуют единому контракту (storage, уведомления, live runtime):

```js
// Notification
Notify({ title, body, tool: "...", kind: "info" });

// Storage (канонические namespace tt:)
TarkovStorage.setJson('tt:tool:<id>:data:key', value);

// Live polling
TarkovPoll.start(pollId, mins, callback, { fireNow });
```

📜 Детали в [CONTRACT.md](./CONTRACT.md)

## 📖 Документация

- [**API Reference**](./API.md) — интеграция внешних систем
- [**Архитектура**](./ARCHITECTURE.md) — слои и потоки данных
- [**Контракт платформы**](./CONTRACT.md) — ??????? ??? tools/hub/core
- [**Вклад в проект**](./CONTRIBUTING.md) — как добавить инструмент
- [**Журнал изменений**](./CHANGELOG.md) — история релизов

## 🛠️ Валидация изменений

Перед commit/run:

```bash
python scripts/lint-architecture.py           # Проверка архитектуры
python scripts/build-catalog.py --check       # Каталог актуален?
bash scripts/domain-contract-check.sh         # Доменные контракты
bash scripts/tool-contract-check.sh           # Инструменты OK?
```

GitHub Actions выполняет эти чеки автоматически для PR/пушей.

## 📄 Лицензия

Tarkov Tools — open source проект. См. файл [LICENSE](./LICENSE) (если есть).

## 🤝 Вклад

Добро пожаловать! Смотрите [CONTRIBUTING.md](./CONTRIBUTING.md) для руководства.

- ⭐ Задайте звездочку репозиторию
- 🐛 Сообщайте об ошибках через issues
- 💡 Предлагайте улучшения в discussions/PRs

## 🔗 Ссылки

- [tarkov.dev](https://www.tarkov.dev) — источник данных (API source)
- [Escape from Tarkov](https://escapefromtarkov.com/) — официальная игра

---

<div align="center">
  <strong>© 2025-2026 Tarkov Tools. "Я здесь" релиз v1.0</strong>
  <br/>
  <small>Браузерные утилиты для Escape from Tarkov — без модификаций игры, без сборки. Только чистый JavaScript.</small>
</div>
