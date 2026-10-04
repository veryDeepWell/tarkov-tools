# Tarkov Tools — Tool Contract

Every tool (new or migrated) must follow this contract so the hub, live runtime, i18n, sound, and storage stay consistent.

## 1. Files

| Path | Role |
|------|------|
| `tools/tarkovtool-<id>.html` | Page shell, meta JSON, script tags |
| `js/<id>.js` | Tool logic (optional for stubs) |
| `locales/{lang}.json` | `tool.<id>.title`, `tool.<id>.desc`, `tool.<id>.help` |
| `hub/catalog.js` | Generated catalog: `file`, `kind`, `cat`, `icon` |

## 2. Meta (`#tarkovtool-meta`)

```json
{"id": "tarkovtool-example.html", "title": "Human title", "description": "Short desc", "kind": "static", "cat": "util", "icon": "util"}
```

- `kind: "live"` — background timers / polls (price-track, price-alarm, restock).
- `kind: "static"` — one-shot load/calc (default).
- `cat` is one of `flea`, `loadout`, `hideout`, `quests`, `med`, `util`, or `other`.
- `icon` names a local SVG in `assets/icons/`; the catalog generator falls back
  to the category icon if the requested icon is unavailable.

The checked-in flat `tools/tarkovtool-*.html` structure is intentional; tool JS
lives in `js/`. Catalog metadata is generated from each page's JSON block:
`python scripts/build-catalog.py`. Do not edit `hub/catalog.js` by hand.

## 3. Kind & registry (`core/tarkov-tool-kind.js`)

Live tools register:

- `file` — e.g. `tarkovtool-restock.html`
- `pollId` — TarkovPoll id (`restock`, `price-alarm`, `price-track`)
- `soundKind` — `restock` | `alarm` | `ok` | …
- `defaultMins` — default poll interval

Hub uses this list for MINI “running” dots and LiveRuntime.

## 4. Storage

Versioned tool documents use `{ "_v": 1, ... }` via `TarkovSchema.readJson` / `writeJson`.
Legacy bare arrays/objects are migrated on first read.

## 4b. Storage (API)

- **Only** `TarkovStorage.getJson` / `setJson` / `get` / `set` (or `TarkovState`).
- No raw `localStorage` in tool JS.
- Physical keys use `tt:` namespaces: `tt:settings:*`, `tt:notif:v1`,
  `tt:mini:v1`, `tt:state:v1`, `tt:tool:<id>:meta`,
  `tt:tool:<id>:data:*`, and `tt:api:<hash>`.
- Existing logical keys (`tarkovTheme`, `tarkovPriceAlarmRules`,
  `tarkovPoll.<id>`, etc.) remain accepted by `TarkovStorage`; one centralized
  migration moves existing values to canonical keys on load. Canonical values
  win on conflicts; the legacy duplicate is then removed.
- Prefer `TarkovStorage.migrateKey(old, new)` when renaming.

## 5. Notifications & sound

```js
Notify({ title, body, tool: "tarkovtool-….html", kind: "restock"|"alarm"|"ok",
  i18nTitle: "restock.notifTitle", i18nBody: "restock.notifBody", i18nParams: { name } });
```

- Inside hub iframe: sound is played by the **hub** (parent). Tool must still call `Notify`.
- Do not invent a second beep path.
- Settings control:
  - global mute / volume (`tarkovSound`, `tarkovSoundVol`)
  - per-kind mute/vol (`tarkovSoundKind.*`, `tarkovSoundKindVol.*`)
  - **per-tool mute** (`tarkovSoundTool.<basename>` = `"0"` silences that tool)
- `beep(kind, toolFile)` and `Notify` both respect per-tool mute via `toolSoundEnabled`.

## 6. Live tools + TarkovPoll

```js
TarkovPoll.start(pollId, mins, onFire, { fireNow, reset, label, mode, tool });
TarkovPoll.stop(pollId);
TarkovPoll.bindCountdown(el, pollId);
TarkovPoll.reportMini(toolFile, running, label);
```

**Under the hub:** the **hub LiveRuntime owns the clock**. The tool only:

1. Registers `onFire` via `TarkovPoll.start` (callback stays in the iframe).
2. Writes schedule to `tt:tool:<pollId>:meta` (legacy `tarkovPoll.<id>` keys
   are read/migrated by TarkovStorage).
3. Runs work when it receives `tt-poll-fire` (handled inside TarkovPoll).

**Standalone** (tool opened outside hub): TarkovPoll arms local timers as before.

Do **not** add private `setInterval` for the same schedule. UI ticks (1s render) are OK for countdown display only.

Messages:

| type | direction | meaning |
|------|-----------|---------|
| `tt-status` | tool → hub | `{ tool, running, ready, label }` |
| `tt-notify` | tool → hub | notification + sound |
| `tt-poll-register` | tool → hub | schedule registered |
| `tt-poll-fire` | hub → tool | run `onFire` now |
| `tt-tick` | hub → tool | 1s keepalive (optional UI) |
| `tt-ping-status` | hub → tool | request status refresh |

## 7. Progress (static tools)

Use shell/UI progress, steps of **5%** (snapped in `progress.set`):

```js
var P = TarkovUI.progress;
P.start({ label: "…" });
P.set(10); P.set(55); P.set(100);
P.done(); // soft "ok" beep + hide; or P.fail(msg)
```

Shell ensures `#progressWrap` / `#tt-progress` exists.

## 7b. Export / import

- Hub settings: **Export** / **Import** JSON of all canonical `tt:` keys.
  Imports accept the namespaced format and legacy `tarkov*`, `ttApi:*`, and
  pre-prefix restock keys.
- Schema: `{ _schema: "tarkov-tools-export", _version: 1, _exportedAt, keys: { … } }`.
- Implemented in `tarkov-common.js` (`TarkovTools.exportAll` / `importAll`) and documented in `tarkov-export.js`.

## 7c. Shared item and weapon domain

Tools should consume normalized domain APIs instead of duplicating calculations over raw API data:

- `TarkovItems.load(mode)`, `byId(id, catalog)`, `byType(type, catalog)`, and
  `search(query, catalog, mode, { types })` provide cached item lookup.
- `TarkovItemDomain` owns item classification, filtering, armor/plate projections,
  bidirectional armor↔plate compatibility, flea tax/profit calculations, and
  `scoreItems(items)`. Scores are keyed by item ID and contain `score`,
  `components`, `price`, `availability`, and source `details`.
- The shared score is relative within an item category: quality 50%, accessibility
  20%, price efficiency 15%, and weight/grid burden 15%. Accessibility uses the
  best trader offer, trader level, quest unlock, flea availability, and listing
  count as a liquidity proxy. Listing count is not a measure of trader stock.
- `TarkovItemViewModels.armor/plates/helmets/food` adapts API items for those
  tools; armor and plate views must use both directions from
  `TarkovItemDomain.buildCompatibility(items)`.
- `TarkovWeaponDomain` owns `compat(gunId, modId)`, `penChart(penetration)`,
  `armorClass(penetration)`, and `scoreBuild(stats, goal, budget, forceOptic)`.

Do not add page-local copies of market-tax/profit or penetration-class formulas.
Tool pages must load data through `TarkovAPI`, not call `fetch()` directly.

## 8. Help & i18n

- Titles/descriptions: locales only (`TarkovI18n.toolTitle` / `toolDesc`).
- In-tool help: `tool.<id>.help` or meta description.
- Shell injects help button; hub cards use `?` hover.

## 9. Scripts on the page (typical live tool)

```html
<script src="../core/tarkov-dicts.js"></script>
<script src="../core/tarkov-names.js"></script>
<script src="../core/tarkov-storage.js"></script>
<script src="../core/tarkov-api.js"></script>
<script src="../core/tarkov-poll.js"></script>
<!-- Load only the domain modules this tool needs, after the API. -->
<script src="../core/tarkov-ui.js"></script>
<script src="../core/tarkov-state.js"></script>
<script src="../core/tarkov-common.js"></script>
<script src="../js/<slug>.js"></script>
<script src="../core/tarkov-tool-shell.js"></script>
```

Tool pages are currently flat files at `tools/tarkovtool-<id>.html`; their
logic is loaded from `js/<slug>.js`. The page metadata block is the source for
the generated catalog. The active hub entry point is `tarkovtool-hub.html`.
`hub/tarkov-hub-app.js` owns hub orchestration; category rendering,
notifications, and settings are implemented in separate scripts. Run
`python scripts/build-catalog.py --check` to ensure the generated catalog is
current.

## 10. Checklist before merge

- [ ] Catalog entry + `kind`
- [ ] Locale keys title/desc/help
- [ ] Storage via TarkovStorage only; physical keys are namespaced and legacy values migrate centrally
- [ ] Live: single TarkovPoll id, no duplicate timers
- [ ] `TarkovPoll.start(..., { tool: "tarkovtool-….html", … })` always set
- [ ] Notify with correct `tool` + `kind`
- [ ] Progress 5% on long loads (`done` may beep ok)
- [ ] Per-tool mute key respected when tool set
- [ ] Works in hub MINI (iframe) and standalone
- [ ] Run `bash scripts/domain-contract-check.sh` after shared domain migrations
- [ ] Run `python scripts/lint-architecture.py` and `bash scripts/tool-contract-check.sh`
