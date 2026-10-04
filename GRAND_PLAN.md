Phase 1 — Единая файловая структура (2–3 дня)
Цель: убрать дубли путей и хаос имён.

Каталог — один источник
Удалить: корневой catalog-data.js, catalog.json, core/catalog.json, hub/catalog-entries.json.
Оставить генерацию → только hub/catalog.js (и при необходимости hub/catalog.json для отладки).
Meta перенести из <script id="tarkovtool-meta"> в tools/<id>/meta.json.

Tools → папкиtexttools/ammo/
  index.html
  tool.js
  meta.jsonПлоские tarkovtool-*.html + tarkovtool-*.js + подпапки tarkovtool-ammo/ — свести к одному стилю.
Hub entry
tarkovtool-hub.html → hub.html (или оставить старое имя как redirect на 1 релиз).
Корневой tarkov-hub-app.js → hub/app.js.

Core rename (опционально, но желательно)
tarkov-api.js → api.js (или оставить префикс tarkov- для глобалов — решить один раз и не менять).
Главное: не tarkov-api.js + tarkov-live-runtime.js + tarkov-poll.js с пересекающейся ответственностью.


Exit criteria: find . -name "catalog*" → только сгенерированные в hub/. Каждый тул — одна папка.

Phase 2 — Единый bootstrap tools (3–4 дня)
Самая важная фаза. Сейчас у ammo и price-track разный порядок и набор скриптов.
Target: один loader.
Вариант A (рекомендую) — shell как единственная точка входа:
HTML<!-- tools/ammo/index.html -->
<link rel="stylesheet" href="../../core/common.css">
<link rel="stylesheet" href="../../core/ui.css">
<script type="application/json" id="tt-meta" src="meta.json"></script>
<script src="../../core/shell.js" data-tool="ammo" data-kind="static"></script>
<script src="tool.js"></script>
shell.js:

Читает data-kind / meta.
Подгружает фиксированный набор core-модулей в жёстком порядке.
Для live дополнительно грузит live.js.
Эмитит tt-ready → tool.js стартует.

Вариант B — явный список в каждом HTML (как сейчас, но одинаковый для всех static / всех live).
Обязательно:

Убить tarkov-price-track-boot.js, tarkov-restock-boot.js, tarkov-barter-live-ui.js — логика в tool.js или в core/live.js.
Убрать динамический ensureUiJs() / ensureItemsJs() из shell там, где это маскирует порядок загрузки.
CSS versioning: либо build-hash, либо один ?v= из VERSION.

Exit criteria: любой tool HTML содержит ≤ 4 script-тега; порядок core идентичен для всех static и для всех live.

Phase 3 — Domain layer до конца (4–5 дней)
Цель: tools перестают знать про «сырые» item-объекты.

























МодульОтветственностьПубличный API (минимум)items.jsиндекс, типы, byId/byTypeload(), byId(), byType(), search()weapon.jsammo↔gun, armor↔plates, slotscompat(gunId, modId), penChart(), armorClass()dicts.jstraders, maps, bosses static, calibersуже есть — стабилизировать API
Правило: если два тула считают «пробитие» или «выгодный бартер» — формула только в domain.
Миграция:

Выбрать 5 самых «толстых» тулов (ammo, armor, barter-*, gun-builder, compare).
Вынести их расчёты в domain.
Остальные — по чеклисту в CI.

Exit criteria: grep по tools/ не находит fetch( и не находит сырых формул пробития/цен, которые дублируются.

Phase 4 — Storage & Live protocol (2–3 дня)
Статус: ✅ Выполнено.

Storage:

- [x] Единый префикс `tt:` с namespaces settings, notifications, mini-tabs,
  tool metadata/data и API cache.
- [x] `core/tarkov-storage.js` — единственный модуль с прямым доступом к
  localStorage; legacy keys централизованно мигрируются, legacy import/API
  остаются совместимыми.
- [x] Storage keys, migration и export/import описаны в
  `docs/TOOL_CONTRACT.md`, `ARCHITECTURE.md` и `API.md`.

Live:

- [x] Единый live protocol через `TarkovPoll` (callback и standalone timer) и
  `TarkovLiveRuntime` (hub clock); callback остаётся внутри iframe.
- [x] Hub определяет инструменты через `kind: live`; live registry задаёт
  poll id и iframe route, а инструменты передают `opts.tool`; закрытие
  mini-tab останавливает poll до удаления iframe.
- [x] Все live-инструменты используют общий poll API; отдельных расписаний
  `setInterval` нет (UI countdown/render ticks не выполняют poll work).

Exit criteria: все live-тулы используют один и тот же API; ключи storage
документированы и мигрируются одной функцией — выполнено.

Phase 5 — Hub cleanup (2 дня)

- [x] Один канонический runtime app и один generated `hub/catalog.js`.
- [x] Settings, notifications и mini-tabs вынесены в отдельные модули без
  циклических зависимостей; mini-tab модуль получает app helpers через API.
- [x] Каталог фильтруется по категории, типу и поиску; используются только
  локальные SVG из `assets/icons/`.
- [x] Удалены резервные `.bak`; архитектурный lint запрещает их появление.


Phase 6 — Docs & CI hygiene (1–2 дня)
Оставить в корне docs:

- [x] `ARCHITECTURE.md` — слои, диаграмма, принципы.
- [x] `CONTRACT.md` — script order, live API, storage keys, metadata schema.
- [x] `CONTRIBUTING.md` — добавление инструмента и регенерация каталога.

- [x] Устаревшие заметки и руководства перемещены в `_archive/docs/`.
- [x] Добавлен CI workflow с архитектурной, catalog и contract проверками.
- [x] `scripts/lint-architecture.py` проверяет текущую структуру проекта,
  скрипты страниц, прямые API fetch, каталог, локальные иконки, hub loading и
  резервные файлы.

Примечание: плановая схема `tools/<id>/{meta.json,index.html,tool.js}` не
применялась, так как проект использует плоские `tools/tarkovtool-*.html`
страницы с метаданными в `#tarkovtool-meta` и логикой в `js/`. Генератор и lint
проверяют существующий контракт без рискованной массовой миграции.

Статус P5/P6: ✅ выполнено; проверки запускаются из `.github/workflows/architecture.yml`.

Phase 7 — Polish pass (2–3 дня)

ТемаДействиеi18nвсе user-visible строки через t(); meta titles тожеCSSодин theme token set; убрать inline-дублиОшибкиединый error surface в shell (toast / empty state)PerformanceAPI cache hit-rate; не грузить domain в pure-static тулы без нуждыREADME1 страница: что это, как открыть hub, как добавить тул

Порядок внедрения (чтобы не сломать всё сразу)
text0  Inventory + archive
1  Структура файлов (без смены логики)
2  Единый bootstrap (shell) — самый рискованный, делать по 5 тулов
3  Domain extraction (параллельно с 2 на новых/толстых тулах)
4  Storage + Live unification
5  Hub
6  Docs + lint
7  Polish
Каждая фаза — отдельный PR / merge в main только после ручной проверки:

хаб открывается,
3 static + 2 live тула работают,
catalog генерируется,
lint зелёный.


Что сознательно НЕ делать

Не вводить bundler (webpack/vite) на этом этапе — проект browser-native, iframe-based. Bundler можно рассмотреть позже как Phase 8.
Не переписывать все 60 тулов с нуля. Миграция — адаптер + постепенный вынос.
Не менять public URL хаба без redirect (если уже кто-то закладки поставил).
Не смешивать рефакторинг архитектуры с новыми фичами из roadmap2026.