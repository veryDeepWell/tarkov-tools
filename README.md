# Tarkov Tools

[![Pages](https://img.shields.io/badge/demo-GitHub%20Pages-2088FF?logo=github)](https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**RU** · [English](#english)

Набор **самостоятельных** веб-инструментов для *Escape from Tarkov* (по умолчанию **PVE**).  
Без сборщиков и фреймворков: чистый HTML / CSS / JS, данные с [json.tarkov.dev](https://json.tarkov.dev).

> **Философия:** каждый тулз делает одну задачу хорошо. Общие имена, уведомления и API связывают их, но не превращают проект в монолит.

**Демо:** https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html

---

## Что умеет хаб

| Возможность | Описание |
|-------------|----------|
| **Каталог** | Карточки по категориям (Барахолка, Лоадаут, Убежка…), поиск, закрепления |
| **Мини-табы** | Кнопка **МИНИ** — тулз живёт в фоне, переключение без сброса состояния |
| **Уведомления** | Бейджи на чипах + общий колокол, звук настраивается |
| **Имена** | Цепочка: короткий из игры → имя API → своё short name |
| **Настройки** | Общее / Звук / Внешний вид / Скрытые инструменты |
| **Иконки** | Emoji сейчас; кастомные файлы — `assets/icons/` (см. ниже) |

### Мини-табы (как пользоваться)

1. Открой тулз с хаба (или **МИНИ** внутри страницы).
2. Сверни — iframe остаётся в пуле, таймеры и опросы **не останавливаются сами**.
3. Уведомления копятся → число на чипе; hover — список событий.
4. Закрытие мини-таба / перезагрузка страницы = hard reset состояния тулза.

---

## Инструменты (кратко)

**Барахолка** — динамика цен, Price Alarm, бартер live/ручной, трейдер- и стример-флип, ₽/слот, контейнеры  

**Лоадаут** — билдер / рандом / дрип / бюджет, gun builder, броня, шлемы, патроны, моды, плиты, магазины, прицелы, ПНВ  

**Убежка** — трекер модулей, BTC-ферма, крафты, круг культистов  

**Квесты** — цепочки, FIR-предметы, чек-лист рейда, боссы  

**Мед / еда** — еда и вода, аптечки, стимуляторы, комбо стимов  

**Утилиты** — ресток торговцев, короткие имена, EN↔RU, сравнение, «что с предметом», скиллы, ключи, My Tarkov  

Полные подписи видны на карточках в хабе.

---

## Быстрый старт

```bash
git clone https://github.com/veryDeepWell/tarkov-tools.git
cd tarkov-tools
python -m http.server 8080
# → http://localhost:8080/tarkovtool-hub.html
```

Или просто открой GitHub Pages по ссылке выше.

---

## Архитектура (для контрибьюторов)

```
tarkovtool-hub.html     # оболочка хаба
tarkov-hub-app.js       # каталог, мини-UI, expand
tarkov-hub-cats.js      # категории + скрытие тулзов
tarkov-state.js         # localStorage, Notify, mini-tabs, BroadcastChannel
tarkov-mini.js          # кнопка МИНИ, reportStatus, Notify bridge
tarkov-api.js           # общий слой запросов к json.tarkov.dev
tarkov-names.js         # TarkovNames.display()
tarkov-icons.js         # emoji + задел под assets/icons/*
tarkov-common.js/css    # тема, звук, настройки, UI-kit
tarkovtool-*.html       # сами инструменты
assets/icons/           # сюда класть кастомные иконки
```

**Контракт тулза**

1. `tarkov-common.css` + в конце `tarkov-common.js` (подтянет state / names / mini / icons).
2. Мета: `<script type="application/json" id="tarkovtool-meta">{"title":"…","description":"…"}</script>`
3. Уведомления: `Notify(toolFile, title, body, kind)` или через `TarkovState`.
4. Статус фона: `reportStatus({ running: true, label: "…" })`.
5. Имена предметов: `TarkovNames.display(item)` — не сырой hash.
6. Запросы: по возможности `TarkovAPI.*`, не копипастить fetch.
7. localStorage — свой префикс, не затирать чужие ключи.

Подробнее: [CONTRIBUTING.md](CONTRIBUTING.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [CHANGELOG.md](CHANGELOG.md)

### Кастомные иконки

1. Возьми `icon` id из каталога (например `price-track`).
2. Положи файл: `assets/icons/price-track.svg` (или `.png` / `.webp`).
3. Обнови страницу — если файла нет, останется emoji.

Либо в каталоге: `"iconUrl": "assets/icons/my.png"`.

---

## English

Static, framework-free toolkit for *Escape from Tarkov* (default **PVE**).  
Each tool is a standalone page; the **hub** runs several in background **mini-tabs** with notification badges.

**Live:** https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html

```bash
git clone https://github.com/veryDeepWell/tarkov-tools.git
cd tarkov-tools && python -m http.server 8080
```

**Vision:** tools stay independent; shared `TarkovNames`, `Notify`, and `TarkovAPI` connect them without a monolith.

Custom icons: drop `assets/icons/{id}.svg` — see `tarkov-icons.js`.  
Contributing: [CONTRIBUTING.md](CONTRIBUTING.md).

Data by [json.tarkov.dev](https://json.tarkov.dev). Not affiliated with Battlestate Games.
