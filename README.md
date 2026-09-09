# Tarkov Tools

Набор одностраничных утилит для Escape from Tarkov (PVE по умолчанию).

## Открыть

- Локально: открыть `tarkovtool-hub.html` или поднять `python -m http.server` в этой папке
- Хаб подхватывает все `tarkovtool-*.html` рядом (листинг сервера или «Выбрать папку»)

## GitHub Pages

1. Создай репозиторий на GitHub, залей эту папку
2. Settings → Pages → Source: **Deploy from a branch** → `main` / root
3. Сайт: `https://<user>.github.io/<repo>/`

Либо: Settings → Pages → GitHub Actions (если включишь workflow).

## Структура

| Файл | Назначение |
|------|------------|
| `tarkovtool-hub.html` | Хаб всех инструментов |
| `tarkovtool-*.html` | Отдельные тулзы |
| `tarkov-common.css` | Общие стили |

Данные: [json.tarkov.dev](https://json.tarkov.dev) + локали (EN/RU) с GitHub при необходимости.
