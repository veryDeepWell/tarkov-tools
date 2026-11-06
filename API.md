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

## Общие сервисы R-3a

- `TarkovProfile.normalizeMode(value)` — режим профиля `pve`/`pvp`; `apiMode(value)` — `pve`/`regular` для внешних данных. `TarkovAPI.items(mode, { noCache: true, httpCache: "no-store" })` запрашивает свежие цены.
- `TarkovProfile.taskGate(task)` проверяет уровень и предшествующие квесты; `offerGate(offer)` учитывает выполненный `taskUnlock` по ID/имени. `hideoutProgress()` возвращает прогресс активного ЧВК и однократно переносит старый общий прогресс.
- `TarkovAlerts.read/save/add/remove` — единый документ правил для дашборда и сирены. У правил есть стабильный `ruleId`; локальное событие — `tt-alerts-changed`, в другом окне используется storage-событие соответствующего ключа.
- `TarkovNav.href(file, type, id)` создаёт адрес с ID; `current(type)` читает контекст страницы, `clear()` снимает его. Внутри хаба `tt-open-tool` обрабатывается только от известного iframe того же origin.
- `TarkovContent.load()` загружает базу доступности; `available()` вычисляет контент для текущего профиля. Это проверка требований прогресса, не инвентаря игрока.
- `TarkovKeysRating.questIndex(tasks)` используется обоими инструментами ключей. `assessment(item, questCount)` предпочитает личный override; fallback — явно подписанный показатель цены за использование, не лутовая доходность.

`TarkovProfile.bindRefresh` объединяет синхронную серию событий в один вызов в микрозадаче. Возвращаемая функция снимает подписки и отменяет ожидающий вызов.

Высокоуровневые методы `items/tasks/maps/traders/hideout` разрешают отображаемые имена через словари `/<mode>/<kind>_<lang>`. `TarkovAPI.locale(kind, mode, language)` возвращает такой словарь напрямую. ID, enum эффектов и названия слотов сохраняются для расчётов. `stimEffects` предоставляются также через совместимый `properties.stimulatorBuffs`.

Ответы больше 500 000 символов кэшируются только в памяти. Персистентный API-кэш ограничен собственным бюджетом и удаляет только `tt:api:*`; документы профилей и инструментов не вытесняются ради него. `TarkovStorage.set` возвращает признак успешной записи, `{ quiet: true }` используется только для необязательного API-кэша.

## Контракт сущностей приложения

Все высокоуровневые коллекции API проходят через `TarkovData`. Инструменты не разбирают транспортный ответ через `getJson/request` и не выбирают между `name/shortName/id` собственным алгоритмом.

- `TarkovData.scope({mode?, lang?})` — канонический контекст; захватывается до асинхронной загрузки.
- `get(type, id, context?)` — независимая копия сущности или `null`; поиск не переходит в другой режим/язык.
- `resolve(type, ref, context?)` — `{id, kind, label, resolved, source}`. Неразрешённый ID сохраняется для связи и диагностики, но не становится названием.
- `label(type, ref, context?)` — только отображаемая подпись. Для предметов используйте `TarkovNames.display`, учитывающий личное сокращение.
- `status(type, context?)` — `{state, count, warnings, error?}`; ошибка структуры отличается от корректной пустой коллекции.
- `latest().begin(context?)` — билет загрузки с `current(context?)` и `active()`. Первая проверяет также контекст, вторая только поколение.
- `TarkovNav.entityHref(type, id)` — единый маршрут для item/quest/craft/barter/station/map/trader. Старые ссылки продолжают поддерживаться.

Типы: item, quest, trader, map, station, craft, barter. Квестовые предметы разрешаются в item-ссылках из дополнительного каталога задач. Сырые имена внешнего API и машинные enum не смешиваются: нормализация подписей не меняет slot names, effect types и ID.

`TarkovAPI.prestige(mode)` получает правила переноса из `tasks.data.prestige` через ту же границу данных. `TarkovPrestige.rule/allowed/demands/plan` — чистый сервис ограничений переноса, потребности квестов и геометрической укладки. Престижинатор не использует весь каталог как список разрешённых предметов.

`TarkovItemMedia.defaultPreset` разрешает также строковые ссылки на штатную сборку через реестр предметов. `decorate` предоставляет `displayWidth/displayHeight` этой сборки; исходные ID и размеры базового предмета не переписываются.

В iframe того же origin транспорт `getJson` использует API родителя: сырой ответ и ожидающие сетевые запросы не дублируются для каждой вкладки. Нормализация, язык, режим и независимые модели потребителя остаются в инструменте. `clearCache()` инструмента сбрасывает также общий транспорт. Именованные объекты разрешаются без повторного чтения профиля; разрешение штатной сборки при декорировании получает захваченный контекст загрузки.
