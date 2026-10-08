# Contributing

## Новый или изменённый инструмент

1. Страница `tools/tarkovtool-<id>.html` с блоком `#tarkovtool-meta` (`id`, `title`, `description`, при необходимости `kind`, `cat`, `icon`).
2. Логика в `js/`, общие вещи — только из `core/`.
3. Порядок script-тегов как у соседних тулзов; правила — [CONTRACT.md](./CONTRACT.md).
4. Каталог:
   ```bash
   python scripts/build-catalog.py
   ```
   `hub/catalog.js` коммитить с изменением, не редактировать вручную.
5. Ключи i18n: `tool.<id>.title` / `desc` / `help` в `locales/`.

## Перед PR

```bash
python scripts/lint-architecture.py
python scripts/build-catalog.py --check
bash scripts/domain-contract-check.sh
bash scripts/tool-contract-check.sh
git diff --check
```

Те же проверки — в GitHub Actions.

## Документация

Меняете контракт storage/API/poll — обновите CONTRACT/API/ARCHITECTURE. Устаревшие черновики — в `_archive/docs/`, не в активной навигации.
