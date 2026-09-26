# P0 — Canonical tree (architecture on disk)

Copy into the real site root so paths match (`core/`, `hub/`, `tools/`).

## Hub script order (required)

1. `core/tarkov-storage.js`
2. `core/tarkov-state.js` (existing)
3. `core/tarkov-tool-kind.js`
4. names / api (existing)
5. `core/tarkov-poll.js`
6. `core/tarkov-live-runtime.js`
7. i18n
8. `core/tarkov-common.js`
9. `core/tarkov-export.js`
10. `core/tarkov-ui.js`
11. catalog + `hub/tarkov-hub-app.js`
12. `hub/tarkov-settings-tabs.js`
13. `hub/tarkov-hub-notif.js`

See `tarkovtool-hub.html`.

## Tools updated in this pack

| File | Change |
|------|--------|
| `tools/tarkovtool-restock.js` | TarkovPoll only (UI `setInterval` for render); keys `tarkovRestock*`; migrate from old `restock*`; `opts.tool` |
| `tools/tarkovtool-price-alarm.js` | TarkovStorage for rules; TarkovPoll + `opts.tool`; no private poll timer |

## Price-track

Already had `tool:` in `TarkovPoll.start` and TarkovStorage — keep current fixed version in prod.

## Storage keys (export-safe)

- `tarkovRestockEnabled`, `tarkovRestockHistory`, `tarkovRestockFired`, `tarkovRestockCycleMs`, `tarkovRestockSnapshot`
- `tarkovPriceAlarmRules` (and poll state via `tarkovPoll.price-alarm`)
- Export migrates legacy `restock*` → `tarkovRestock*` on dump/import

## Not in this pack (use existing site copies)

- `tarkov-state.js`, `tarkov-api.js`, `tarkov-i18n.js`, `tarkov-names.js`, icons, catalog, cats, chrome-fix, CSS


## P1 — UX stability

| Item | Where |
|------|--------|
| Poll UI strings | `poll.now/off/running/nextPrefix/everyMins/dash` in locales; `TarkovPoll` uses `TarkovI18n.t` |
| Single progress API | `TarkovUI.progress` supports `indeterminate`; barter-live uses only that API |
| Unified 1s hub loop | `TarkovLiveRuntime.tick` fires poll + `tt-tick` / `tt-ping-status`; hub-app interval removed |
| Key-based notif i18n | `Notify({ i18nTitle, i18nBody, i18nParams })` — no English regex |

Locales: `p0/locales/ru.json`, `en.json` (also patched site root copies).


## P2 — before new tools

| Item | Status |
|------|--------|
| Common/settings via TarkovStorage | `get`/`set`/`pushNotif`/`export` prefer `TarkovStorage`; settings tabs too |
| Checklist | `scripts/tool-contract-check.sh [root]` |
| Archive fixed/push | `artifacts/_archive/fixed-push/` (removed from workspace root) |
| Schema `_v` | `core/tarkov-schema.js`; alarm rules `{ _v:1, rules:[] }`; restock snapshot `{ _v:1, traders:[] }` |

Hub loads `tarkov-schema.js` right after `tarkov-storage.js`.
