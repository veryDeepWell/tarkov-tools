# Architecture

Tarkov Tools — статичный сайт в браузере. Страницы инструментов открываются отдельно или в iframe хаба. Общие скрипты подключаются явно в HTML.

## Слои

| Слой | Ответственность |
|------|-----------------|
| `core/` | API и кэш, storage, schema, i18n, poll, live runtime, item/weapon domain, общая UI-обвязка |
| `hub/` | Каталог, настройки, уведомления, оболочка и lifetime iframe |
| `tools/` | `tarkovtool-*.html` + meta JSON |
| `js/` | Логика конкретного инструмента |
| `locales/` | Переводы |
| `assets/icons/` | Иконки каталога |

Плоская раскладка `tools/*.html` — текущая норма. Перенос в `tools/<id>/index.html` — отдельная миграция, не требование lint.

## Поток данных

```text
tool page → TarkovAPI → json.tarkov.dev
                ↓
         кэш (память / tt:api:*)
                ↓
     TarkovItems / domain → UI инструмента

TarkovStorage (tt:*) ← настройки, tool data, poll meta
TarkovPoll / LiveRuntime ← live-расписание
hub ← catalog.js (codegen из meta) + iframe tools
```

## Правила владения

- Сеть и кэш API — только `tarkov-api.js`
- `localStorage` — только `tarkov-storage.js`
- Формулы предметов/оружия — domain-модули, не копии в `js/`
- Расписание poll id — `TarkovPoll`; под хабом огоньки/тики — LiveRuntime
- `hub/catalog.js` не правится руками: `python scripts/build-catalog.py`
- Meta инструмента — JSON в `#tarkovtool-meta` на странице

## Контракты

См. [CONTRACT.md](./CONTRACT.md), [API.md](./API.md). Проверки: `lint-architecture.py`, `tool-contract-check.sh`, `domain-contract-check.sh`.
