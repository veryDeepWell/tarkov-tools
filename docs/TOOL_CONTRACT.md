# Tarkov Tools — Tool Contract

Every tool (new or migrated) must follow this contract so the hub, live runtime, i18n, sound, and storage stay consistent.

## 1. Files

| Path | Role |
|------|------|
| `tools/tarkovtool-<id>.html` | Page shell, meta JSON, script tags |
| `tools/tarkovtool-<id>.js` | Tool logic (optional for stubs) |
| `locales/{lang}.json` | `tool.<id>.title`, `tool.<id>.desc`, `tool.<id>.help` |
| Catalog entry | `hub/catalog-data.js` / generated catalog: `file`, `kind`, `category` |

## 2. Meta (`#tarkovtool-meta`)

```json
{"title": "Human title", "description": "Short desc", "kind": "static|live"}
```

- `kind: "live"` — background timers / polls (price-track, price-alarm, restock).
- `kind: "static"` — one-shot load/calc (default).

Prefer catalog `kind` + `TarkovToolKind`; meta is fallback documentation.

## 3. Kind & registry (`core/tarkov-tool-kind.js`)

Live tools register:

- `file` — e.g. `tarkovtool-restock.html`
- `pollId` — TarkovPoll id (`restock`, `price-alarm`, `price-track`)
- `soundKind` — `restock` | `alarm` | `ok` | …
- `defaultMins` — default poll interval

Hub uses this list for MINI “running” dots and LiveRuntime.

## 4. Storage

- **Only** `TarkovStorage.getJson` / `setJson` / `get` / `set` (or `TarkovState`).
- No raw `localStorage` in tool JS.
- Keys: prefix with tool id (`restockEnabled`, `tarkovPriceAlarmRules`, …).

## 5. Notifications & sound

```js
Notify({ title, body, tool: "tarkovtool-….html", kind: "restock"|"alarm"|"ok" });
```

- Inside hub iframe: sound is played by the **hub** (parent). Tool must still call `Notify`.
- Do not invent a second beep path.
- Settings control global mute, volume, and per-kind mute/vol (`tarkovSoundKind.*`).

## 6. Live tools + TarkovPoll

```js
TarkovPoll.start(pollId, mins, onFire, { fireNow, reset, label, mode, tool });
TarkovPoll.stop(pollId);
TarkovPoll.bindCountdown(el, pollId);
TarkovPoll.reportMini(toolFile, running, label);
```

**Under the hub:** the **hub LiveRuntime owns the clock**. The tool only:

1. Registers `onFire` via `TarkovPoll.start` (callback stays in the iframe).
2. Writes schedule to storage (`tarkovPoll.<id>`).
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

Use shell/UI progress, steps of **5%**:

```js
var P = TarkovUI.progress;
P.start({ label: "…" });
P.set(10); P.set(55); P.set(100);
P.done(); // or P.fail(msg)
```

Shell ensures `#progressWrap` exists.

## 8. Help & i18n

- Titles/descriptions: locales only (`TarkovI18n.toolTitle` / `toolDesc`).
- In-tool help: `tool.<id>.help` or meta description.
- Shell injects help button; hub cards use `?` hover.

## 9. Scripts on the page (typical live tool)

```html
<script src="../core/tarkov-storage.js"></script>
<script src="../core/tarkov-api.js"></script>
<script src="../core/tarkov-poll.js"></script>
<script src="../core/tarkov-ui.js"></script>
<script src="../core/tarkov-common.js"></script>
<script src="tarkovtool-<id>.js"></script>
<script src="../core/tarkov-tool-shell.js"></script>
```

## 10. Checklist before merge

- [ ] Catalog entry + `kind`
- [ ] Locale keys title/desc/help
- [ ] Storage via TarkovStorage only
- [ ] Live: single TarkovPoll id, no duplicate timers
- [ ] Notify with correct `tool` + `kind`
- [ ] Progress 5% on long loads
- [ ] Works in hub MINI (iframe) and standalone
