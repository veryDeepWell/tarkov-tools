Контекст для агента
Репо: veryDeepWell/tarkov-tools

Источник правил: ARCHITECTURE.md, API.md, TarkovAPI_CHECKLIST.md, roadmap2026.md

Источник истины каталога: hub/catalog-data.js (+ синхрон catalog.json)

Не трогать без нужды: игровую логику уже готовых новых тулов; фокус — ядро, хаб, i18n, единообразие, audit.
Критерий «готово» для каждой задачи: изменения в коде + кратко в CHANGELOG.md / Fixes.md + что проверить руками.

P0 — архитектура и контракт (сломает «на бумаге»)

Audit сети
Найти все fetch / json.tarkov.dev вне core/tarkov-api.js.
Перевести на TarkovAPI.items|barters|traders|tasks|maps|crafts|getJson.
Итог: grep по json.tarkov.dev в tools/ пустой (или только комментарии).

Audit storage
Найти сырой localStorage в tools/ и hub/.
Всё через TarkovStorage с префиксом tarkov*.
Проверить, что export хаба не теряет ключи (price-alarm, restock, shopping list, challenge XP и т.д.).

Единый порядок скриптов в HTML
Для всех tools/tarkovtool-*.html (включая новые):
dicts → names → storage → api → ui → state → common → tool.js → tool-shell
(как в ARCHITECTURE; без пропусков shell).
Catalog consistency
hub/catalog-data.js ↔ catalog.json ↔ реальные файлы в tools/.
У каждой записи: file, title, description, icon, cat, kind (static|live).
Нет битых file, нет дублей, kind совпадает с poll/live-поведением.

Poll / live-runtime
Live-тулы (price-track, price-alarm, restock) только через TarkovPoll / live-runtime.
Нет private setInterval для поллинга.
Всегда opts.tool в TarkovPoll.start.



P1 — UX / i18n / хаб

Фаза 3 i18n (roadmap)
data-i18n в HTML тулов + ключи в locales/ru.json / en.json.
Хотя бы: хаб, shell, settings, poll-строки, общие кнопки (Load / Error).
Новые тулы: минимум tool.<id> title/description в locales.

Poll strings → i18n
Ключи вроде poll.now, poll.off, poll.running — без хардкода EN/RU в JS.

Один progress API
Static-тулы: только TarkovUI.progress (start/set/done/fail).
Убрать ручные progress-bar, где возможно.

Хаб: один тик
Объединить циклы tick + tt-tick (1s), без двойной нагрузки.

i18nNotif key-based
opts.i18nTitle / opts.i18nBody вместо regex по английским строкам уведомлений.

Settings / common state → TarkovStorage
Тема, язык, gameMode, export/import — единый слой, schema _v где нужно.



P2 — гигиена и долги

Удалить артефакты
*-fixed.js, *-push.js, PLACEHOLDER-файлы, мёртвые дубли после merge.

Schema _v для stateful тулов
alarm rules, track lists, shopping list, challenge XP, mini-tabs — миграции при чтении.

Checklist (ручной или скрипт)
catalog kind ✓
locale keys для tool.* ✓
no raw LS ✓
single poll id на live-tool ✓
shell подключён ✓

Обновить roadmap2026.md
Отметить сделанные тулы (headphones, challenge, quest-cheese, cases, marathon, barter-opt, prestige, gun-rating, xp, repair, shopping-list).
Оставить открытыми: i18n phase 3, core item-score, plates↔armor full matrix, thin→rework броня/рейтинг.



P3 — rework существующих (не новые тулы)

Core-рейтинг предметов (tarkov-item-score)
Общий модуль: flea / trader / УЛ / quest-lock / weight / size → API для armor/plates/helmets/food.
Не дублировать формулы в каждом туле.

Плиты ↔ броня
Полная матрица совместимости, столбец плит, tooltip/modal (roadmap C).
Сейчас thin — довести, не писать отдельный «новый» тул с нуля.

Тонкие тулы → единый UI-паттерн
armor / plates / helmets / food: один progress, одни фильтры, один score API из п.16.

Locale drift у новых тулов
Пройтись по HTML/JS последних 15 тулов: русские строки в UI → ключи i18n где shell уже умеет.



Явно не делать в этом прогоне

Не проектировать новые feature-тулы из ideas.md (это отдельный трек).
Не ломать публичные API TarkovAPI / TarkovStorage без миграции.
Не массово переписывать рабочий JS тула «для красоты» без checklist-причины.


Порядок выполнения (рекомендация агенту)
text1 → 2 → 3 → 4 → 5     (P0, блокирует всё)
6 → 7 → 8 → 9 → 10 → 11
12 → 13 → 14 → 15
16 → 17 → 18 → 19     (по возможности после P0–P1)

Шаблон отчёта агента (в конце)
Markdown## Done
- [task id] files changed, 1-line summary

## Blocked
- …

## Verify
- grep json.tarkov.dev / localStorage results
- catalog count vs tools/*.html
- hub loads, 2–3 tools open, export keys sample