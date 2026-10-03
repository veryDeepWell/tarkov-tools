# Tarkov Tools — каноническая структура (этап 1)

## Источник правды

```
artifacts/
  core/          # общие CSS/JS (storage, ui, shell, common, api, …)
  tools/         # все рабочие инструменты (html + js)
  hub/           # хаб + catalog-data.js
  catalog-data.js  # копия каталога в корне (для совместимости)
```

- **Новые тулы** — только в `tools/`.
- **Общие модули** — только в `core/`.
- **Каталог** — только реально существующие файлы из `tools/`.

## Каталог — автосборка (не править руками)

Источник правды по тулу — блок в HTML:

```html
<script type="application/json" id="tarkovtool-meta">
{"title":"Сезоны","description":"…","kind":"static","cat":"util"}
</script>
```

Сборка:

```bash
python3 scripts/build-catalog.py
```

Пишет `hub/catalog-data.js` + `catalog-data.js`, выставляет `TarkovHubCATALOG`.
`cat` / `kind` / `icon` можно не указывать — скрипт выведет из имени файла.

Новый тул: файл в `tools/` + meta → `python3 scripts/build-catalog.py` → в хабе.

## Что сделано на этапе 1

1. Собраны `core/` и `tools/` из размазанных папок агентов.
2. Каталог **генерируется** из meta тулов (**22**), без фантомов.
3. Пути `../core/` в HTML нормализованы.
4. Сломанные meta (barter-calc, streamer-flip, trader-flip) починены.

## Старые папки (не трогать / не пушить как канон)

`seasons-bp/`, `hitboxes/`, `gunbuilder/`, `new-tools/`, `new2/`, `shopping/`,
`xp-repair/`, `prestige/`, `marathon/`, `gun-rating/`, `barter-opt/`,
`CHART_FIX/`, `FIX_BUNDLE/`, `LOAD_OPT/`, `TAIL_FIX/`, `TARKOV_P0_P2/`, `p0/`,
`_live/`, `_archive/`, `push-*`, `.tmp/`

Это архив экспериментов. Рабочая копия — `tools/` + `core/`.

## Заглушки в core/

`tarkov-dicts.js`, `tarkov-names.js`, `tarkov-state.js`, `tarkov-i18n-bridge.js` —
минимальные stubs (опциональные зависимости). Подставить полные модули
из живого репо при следующем пуше, если они есть на GitHub.

## Следующие этапы (не сделано)

- Подтянуть полные core-модули из репозитория (dicts/names/api).
- Иконки + локали только для 22 живых тулов.
- Удалить или заархивировать осколочные папки (по согласованию).
- restock: есть только `.js`, HTML нет — в каталог не включён.
