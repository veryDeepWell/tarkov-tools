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
Storage:

Единый префикс: tt: (или tarkov:) + namespace.
Схема ключей в docs/CONTRACT.md:texttt:settings:*
tt:notif:v1
tt:mini:v1
tt:tool:<id>:meta
tt:tool:<id>:data
tt:api:<hash>
storage.js — единственный, кто трогает localStorage. Никаких fallback-ов в api/common.

Live:

Один runtime: core/live.js.
Контракт тула:JavaScriptexport const live = {
  id: 'price-track',
  intervalMin: 25,
  async tick(meta) { /* snapshot + Notify */ },
  serialize() { return meta },
};
Hub пингует только kind: live. Mini-tab = iframe жив → tick идёт; закрыли → stop.
Никаких per-tool boot-файлов.

Exit criteria: все live-тулы используют один и тот же API; ключи storage документированы и мигрируются одной функцией.

Phase 5 — Hub cleanup (2 дня)

Один app.js, один catalog.js (generated).
Settings / notif / mini-tabs — отдельные модули без циклических зависимостей.
Каталог: фильтр по cat + kind + поиск; иконки только из assets/icons/.
Убрать app.html.new.bak и любые .bak.


Phase 6 — Docs & CI hygiene (1–2 дня)
Оставить в корне docs:

ARCHITECTURE.md — слои, диаграмма, принципы.
CONTRACT.md — script order, live API, storage keys, meta schema.
CONTRIBUTING.md — как добавить тул (meta.json → build-catalog → done).

Всё остальное (Fixes.md, CONTEXT.md, ideas.md, куски roadmap) → _archive/docs/ или GitHub Wiki.
CI / lint:
Bashpython scripts/lint-architecture.py
# - каждый tools/*/ имеет meta.json + index.html + tool.js
# - нет fetch("https://json.tarkov.dev в tools/
# - catalog.js совпадает с meta.json
# - script order в index.html ∈ {static_set, live_set}

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