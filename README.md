# Tarkov Tools

Браузерные утилиты для Escape from Tarkov. Статический сайт без сборки и без модификации игры.

## Возможности

- Каталог инструментов: поиск, категории, закрепления
- Живые инструменты с фоновым опросом (цены, ресток)
- Уведомления и звук (глобально и по типу/инструменту)
- Мини-табы в хабе (iframe-пул)
- Локализация RU / EN
- Данные API — [json.tarkov.dev](https://json.tarkov.dev); настройки и прогресс — только в `localStorage` браузера

## Быстрый старт

```bash
# из корня репозитория
python -m http.server 8000
# открыть http://localhost:8000/tarkovtool-hub.html
```

Или открыть деплой на GitHub Pages напрямую.

Браузеры: актуальные Chrome, Firefox, Edge, Safari.

## Структура

| Путь | Назначение |
|------|------------|
| `core/` | API, storage, i18n, poll, domain, UI-обвязка |
| `hub/` | Каталог, настройки, уведомления, оболочка хаба |
| `tools/` | Страницы `tarkovtool-*.html` |
| `js/` | Логика инструментов |
| `locales/` | `ru.json`, `en.json` |
| `assets/icons/` | SVG иконки каталога |
| `scripts/` | `build-catalog.py`, lint, contract checks |

Актуальный список инструментов — в хабе и в сгенерированном `hub/catalog.js` (источник meta — блок `#tarkovtool-meta` на каждой странице).

## Документация

| Файл | Содержание |
|------|------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Слои и поток данных |
| [CONTRACT.md](./CONTRACT.md) | Контракт инструмента (storage, poll, Notify) |
| [API.md](./API.md) | Публичные API core |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Добавление инструмента |
| [USER_GUIDE.md](./USER_GUIDE.md) | Руководство пользователя |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Типовые проблемы |
| [DESCRIPTION.md](./DESCRIPTION.md) | Обзор инструментов |
| [CHANGELOG.md](./CHANGELOG.md) | История изменений |

## Разработка

```bash
python scripts/build-catalog.py
python scripts/build-catalog.py --check
python scripts/lint-architecture.py
bash scripts/domain-contract-check.sh
bash scripts/tool-contract-check.sh
```

Новые инструменты не обращаются к `fetch` и `localStorage` напрямую: только `TarkovAPI` и `TarkovStorage` (ключи `tt:`). Подробности — в CONTRACT.md.

## Данные и приватность

- Чтение справочников и цен с json.tarkov.dev (и связанных endpoint’ов проекта)
- Запись настроек, уведомлений, состояния инструментов — локально в браузере
- Отдельного бэкенда и аналитики нет

## Лицензия

См. файл LICENSE в репозитории, если он есть.

Источник данных: [tarkov.dev](https://tarkov.dev) / json.tarkov.dev.
