# API Reference (core)

Краткий справочник по глобалям, которые подключают страницы из `core/`. Детали реализации — в соответствующих файлах.

## TarkovAPI (`core/tarkov-api.js`)

Единая точка сетевых запросов к json.tarkov.dev (и кэша).

- `getJson(path, opts?)` — GET относительного пути, опции кэша (минуты и т.п. по коду модуля)
- `request(path, opts?)` — более низкоуровневый/legacy-ответ
- `items(mode?)`, `barters(mode?)`, `traders(mode?)` — удобные обёртки, если экспортированы
- `clearCache()` — сброс кэша

Инструменты не вызывают `fetch` к API напрямую.

## TarkovStorage (`core/tarkov-storage.js`)

Единственный модуль с прямым доступом к `localStorage`.

- `get` / `set` / `remove`
- `getJson` / `setJson`
- `migrateKey(old, new)`, `keys(prefix?)`

Канонические ключи с префиксом `tt:` (settings, notif, mini, state, tool data, api cache). Легаси-ключи мигрируются централизованно.

## TarkovState (`core/tarkov-state.js`)

Уведомления и связанное состояние хаба (мини-табы и т.д. — по факту модуля).

## Уведомления

Через общий хелпер (например `Notify` из `tarkov-common.js`):

```js
Notify({
  title: "...",
  body: "...",
  tool: "tarkovtool-example.html",
  kind: "info" // или success | error | warning | restock | alarm | ...
});
```

В iframe хаба звук обычно обрабатывает родитель.

## TarkovI18n (`core/tarkov-i18n.js`)

- `t(key, params?)`
- `setLang(code)`, текущий язык
- `applyDom(root?)`
- ключи каталога: title/description инструментов

## TarkovNames (`core/tarkov-names.js`)

Отображаемые имена предметов: `display(id)`, поиск по строке — по API модуля.

## TarkovPoll (`core/tarkov-poll.js`)

Расписание live-инструментов: `start`, `stop`, `bindCountdown`, `reportMini`. Под хабом часы может вести LiveRuntime; инструмент не дублирует тот же poll своим `setInterval`.

## TarkovItems / domain

Нормализованные предметы и расчёты — `tarkov-items.js`, `tarkov-item-domain.js`, `tarkov-weapon-domain.js`, view-models. Страницы подключают только нужные модули после API.

## Storage (схема ключей)

| Префикс | Назначение |
|---------|------------|
| `tt:settings:*` | Общие настройки |
| `tt:notif:v1` | Уведомления |
| `tt:mini:v1` | Мини-табы |
| `tt:state:v1` | Общее состояние |
| `tt:tool:<id>:meta` | Расписание live |
| `tt:tool:<id>:data:*` | Данные инструмента |
| `tt:api:<hash>` | Кэш API |

Полный контракт страницы инструмента: [CONTRACT.md](./CONTRACT.md).
