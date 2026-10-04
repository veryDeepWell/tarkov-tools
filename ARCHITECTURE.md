# Architecture

Tarkov Tools is a browser-native static site. Tool pages may run directly or in a hub iframe; shared browser globals are loaded explicitly by each HTML page.

## Layers

| Layer | Responsibility |
|---|---|
| `core/` | Shared API/cache, names, normalized item and weapon domains, storage, schema, UI, i18n, polling, and live runtime |
| `hub/` | Generated catalog and hub app modules for catalog rendering, settings, and notifications |
| `tools/` | Flat `tarkovtool-*.html` pages with metadata and script bootstrap |
| `js/` | Tool-specific logic loaded by tool pages |
| `locales/` | English and Russian translations |
| `assets/icons/` | Local SVGs referenced by generated catalog entries |

The flat HTML layout is the active repository structure. Moving tools to
`tools/<id>/index.html` is a separate structural migration and is not required
by the current architecture lint.

## Data flow

```text
tool page → TarkovAPI → json.tarkov.dev
     ↓          ↓
TarkovItems → item/weapon domain APIs → tool view models
     ↓
TarkovStorage (canonical tt: keys) ← TarkovState / TarkovPoll

hub/catalog.js → hub app + category renderer
                         ├─ settings module
                         ├─ notifications module
                         └─ persistent tool iframes → TarkovLiveRuntime
```

## Ownership rules

- `core/tarkov-api.js` owns network access and API caching.
- `core/tarkov-storage.js` is the only module that directly accesses
  `localStorage`; all persistent values use `tt:` namespaces.
- Shared calculations and compatibility rules belong in the item/weapon domain
  modules, not page-local copies.
- `TarkovPoll` owns tool poll schedules and standalone timers.
  `TarkovLiveRuntime` owns the hub clock and sends poll events to live iframes.
- `hub/tarkov-hub-app.js` owns iframe lifetime and shell layout. Settings,
  notification, and catalog rendering behavior lives in separate modules.
- Tool metadata is authored in the `tarkovtool-meta` JSON script block and
  compiled into `hub/catalog.js`; generated catalog output is not hand-edited.

## Storage namespaces

| Key | Owner |
|---|---|
| `tt:settings:*` | Shared preferences |
| `tt:notif:v1` | Notifications |
| `tt:mini:v1` | Hub mini-tabs |
| `tt:state:v1` | Shared player/tool state |
| `tt:tool:<id>:meta` | Live poll schedule |
| `tt:tool:<id>:data:*` | Per-tool persisted data |
| `tt:api:<hash>` | API cache |

Legacy `tarkov*` and `ttApi:*` keys are migrated centrally by
`TarkovStorage.migrateLegacyKeys()`.

For the exact script, catalog, storage, and live contracts see
[`CONTRACT.md`](CONTRACT.md).
