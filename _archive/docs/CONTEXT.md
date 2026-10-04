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
Всё через TarkovStorage с физическими ключами в namespaces `tt:`; legacy
`tarkov*` ключи мигрируются централизованно при загрузке storage.
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
На момент передачи в работу оставались i18n phase 3, core item-score,
plates↔armor full matrix и thin→rework броня/рейтинг. Эти P3-пункты закрыты;
локализация дополнительно распространена на затронутые ammo, compare, crafts,
barter-calc, barter-live, gun-builder, shortname и trader-flip.



P3 — rework существующих (не новые тулы)

Статус: ✅ Выполнено для Phase 3 `GRAND_PLAN.md`.

- [x] Общий item-score для armor / plates / helmets / food: качество 50%,
  доступность 20%, эффективность цены 15%, нагрузка весом/размером 15%;
  tooltip раскрывает компоненты и исходные данные.
- [x] Единый API учитывает flea/trader цены, trader level, quest lock и listing
  count как proxy ликвидности (не как остаток товара у торговца).
- [x] Полная двунаправленная armor↔plate матрица; обе страницы показывают
  совместимые предметы с иконками и именами.
- [x] Общие view models, фильтрация и progress pattern для armor / plates /
  helmets / food; динамические строки, фильтры и статусы обновляются при смене
  языка без перезагрузки.
- [x] Повторяющиеся формулы цены/прибыли и пробития перенесены в domain API;
  изменённые tool pages используют TarkovAPI.
- [x] EN/RU строки интерфейсов этих инструментов вынесены в locales.
- [x] EN/RU интерфейсы дополнительных затронутых P3-инструментов локализованы;
  динамические пресеты и формы обновляются при смене языка без потери введённых
  значений.
- [x] `scripts/domain-contract-check.sh` и браузерная проверка на API-данных
  прошли; подробный API-контракт описан в `docs/TOOL_CONTRACT.md`.
- [x] Проверены локали, storage/tool contracts, diff whitespace и EN↔RU
  переключение barter-calc на сохранение пользовательских значений.

Проверить вручную: открыть затронутые страницы в EN и RU; переключить язык
при заполненной форме barter-calc/live; убедиться, что введённые значения и
вычисления сохранены, а динамические подписи переведены.

P4 — Storage & Live protocol

Статус: ✅ Выполнено.

- [x] Physical storage keys namespaced под `tt:`; legacy `tarkov*`, `ttApi:*`
  и restock keys централизованно нормализуются в `TarkovStorage`.
- [x] `localStorage` доступен напрямую только из `core/tarkov-storage.js`;
  экспорт пишет `tt:` ключи и импортирует как новый, так и legacy формат.
- [x] `TarkovPoll` и `TarkovLiveRuntime` остаются общим контрактом для live
  инструментов; hub владеет расписанием iframe-инструментов, `opts.tool`
  заполнен, частные poll timers не используются; закрытие mini-tab останавливает
  сохранённый poll перед удалением iframe.
- [x] Контракт задокументирован в `docs/TOOL_CONTRACT.md`, `API.md`,
  `ARCHITECTURE.md` и `CONTRIBUTING.md`.

Проверить вручную: после обновления открыть hub и live-инструменты с
существующими данными; убедиться, что legacy настройки/правила/mini-tabs
сохранены, настройки продолжают экспортироваться, а live polling запускается
в hub iframe и standalone-режиме.



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
<!-- Archived working context; see root architecture, contract, and changelog. -->