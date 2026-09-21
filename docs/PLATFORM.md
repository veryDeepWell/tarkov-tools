# Tarkov Tools — Platform Contract (Stage 0)

This document is the **source of truth** for how tools, hub, and core modules interact.
Game-dev style goals (single responsibility, shared domain, thin screens) apply; heavy DI containers do not.

## Architecture layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| **Core** | `core/` | Data I/O, domain queries, state, i18n, sound, shared UI primitives |
| **Hub** | `hub/`, `tarkovtool-hub.html` | Shell: catalog, mini-tabs, settings, notification panel |
| **Tools** | `tools/` | **Presentation only** — layout, local UX, calling core APIs |

**Rule:** if a fact is true about the game data (prices, compatibility, item type) and could be needed by more than one tool, it belongs in **core**, not in `tools/*`.

Tools must not:

- call `fetch("https://json.tarkov.dev/...")` directly (use `TarkovAPI`);
- reimplement notification storage or sound;
- invent a second background-timer protocol for live tools;
- embed domain rules that another tool will need later (copy-paste coupling).

---

## Tool kinds

| Kind | Meaning | Examples |
|------|---------|----------|
| **`live`** | May run timers / background work while mini-tab is open; hub may ping status | price-track, price-alarm, restock |
| **`static`** | No background poll from hub; open = loaded UI only | bosses, ammo, barter-live, … |

- Set `kind` on every entry in **`hub/catalog-data.js`** and **`catalog.json`** (must match).
- Fallback map: `core/tarkov-tool-kind.js`.
- Hub: `tt-ping-status` and “running” UI **only** for `live`.

---

## Required scripts (tool HTML)

Order (relative paths from `tools/`):

1. `../core/tarkov-names.js`
2. `../core/tarkov-api.js`
3. `../core/tarkov-state.js`
4. `../core/tarkov-i18n.js`
5. `../core/tarkov-common.js`  ← defines `Notify`, `TarkovTools.beep`
6. Optional: `../core/tarkov-poll.js` — **live only**
7. Optional: `../core/tarkov-ui.js` — when using shared UI kit
8. Tool script(s)

Hub loads the same core modules plus catalog / hub apps (see `tarkovtool-hub.html`).

---

## Module contracts

### `TarkovAPI` (`core/tarkov-api.js`)

**Role:** single network + cache boundary to tarkov.dev.

| API | Notes |
|-----|--------|
| `getJson(path, opts?)` | Cached GET; prefer this for custom paths |
| `request(path, opts?)` | Response-based GET for legacy consumers; URL still resolves through the API boundary |
| `items(mode?)` | Normalized item list |
| `barters(mode?)` | Barters |
| `traders(mode?)` | Traders |
| `quests(mode?)` | Quests |
| `hideout(mode?)` | Hideout stations |
| `asArray(raw)` | Normalize API shapes |
| `clearCache()` | Drop mem/LS cache |
| `mode()` | Preferred PvE/PvP from settings |

Tools **must not** bypass this with raw `json.tarkov.dev` URLs.

Response-based consumers must call `TarkovAPI.request(path)`; new code should prefer `getJson()` or `TarkovItems` so caching and normalization are shared.

---

### `TarkovState` (`core/tarkov-state.js`)

**Role:** shared client state (notifications, mini-tabs, cross-tab broadcast).

| API | Notes |
|-----|--------|
| `notify(payload)` / `notifications()` | Notification list |
| `markRead` / `markToolRead` / `clearNotifications` | Read state |
| `getMiniTabs` / `setMiniTabs` / `addMiniTab` / `removeMiniTab` | Mini tabs |
| `on(event, fn)` | `notification`, `mini`, … |
| `unreadForTool(file)` | Badge counts |

Payload for notify: `{ title, body, tool, kind?, … }` — `tool` should be the HTML filename.

---

### `Notify` / sound (`core/tarkov-common.js`)

**Role:** **only** public entry for “tell the user something happened”.

```js
Notify({
  title: "…",
  body: "…",
  tool: "tarkovtool-….html",  // file name for mini badge
  kind: "ok" | "price" | "restock" | "alarm" | "error" | "warn",
  silent: false                 // true = no beep
});
```

**Sound ownership (Stage 0 decision):**

- **`Notify` / `TarkovTools.beep` own all notification sounds.**
- Hub **must not** call `beep` on `tt-notify` (prevents double audio).
- Hub may still persist UI state / update bell on `tt-notify`.
- Direct `TarkovTools.beep(kind)` is allowed for **settings test** or explicit UI feedback without a notification row; prefer `Notify` when a history item is desired.

Kinds map to short WebAudio motifs inside `beep`.

---

### `TarkovI18n` (`core/tarkov-i18n.js`)

**Role:** locale packs under `locales/*.json`, DOM apply, fallback to English.

| API | Notes |
|-----|--------|
| `t(key, params?)` | Lookup; missing → EN → key |
| `setLang(code)` / current lang | Persist + reload pack |
| `applyDom(root?)` | `[data-i18n]`, placeholders, titles |
| `toolTitle` / `toolDescription` / `catTitle` | Catalog strings |
| `listLocales()` | Completion % vs EN |
| `ready` | Promise when packs loaded |

Tools should ship visible strings via `data-i18n` / `t()` and listen to `tt-lang-changed` when they inject dynamic text.

---

### `TarkovItems` (planned, Stage 2)

**Role:** domain layer — normalized items, indexes, **shared queries** (no DOM).

Implemented API:

- `load(mode?)` returns `{ all, byId, byType }`.
- `byId(id, mode?)` and `byType(type, mode?)` provide query-only access.
- `clear()` drops the in-memory item index.

Rules:

- load once via `TarkovAPI`
- indexes by id / type / slots
- query helpers usable by multiple tools (e.g. compatibility), so two tools never fork the same rule

---

### `TarkovUI` (planned / partial, Stage 3)

**Role:** shared presentation primitives (Barter Live density as reference).

Intended direction:

- progress **0–100%** (`start` / `set` / `done` / `fail`) with segmented loads
- help **`?`** modal driven by `tool.<id>.help` in locales
- cards, chips, status, formatters (`fmtRub`, …)

Until the kit lands, new UI should still **prefer** patterns from `tarkovtool-barter-live` over one-off layouts.

---

### `TarkovToolKind` (`core/tarkov-tool-kind.js`)

| API | Notes |
|-----|--------|
| `kindOf(file)` | `"live"` \| `"static"` |
| `isLive` / `isStatic` | Helpers |

Prefer catalog `kind`; fallback hard-map for the three live tools.

---

## Live vs static behaviour

**Live**

- May use `tarkov-poll` / local timers
- Report status to hub (`tt-status` / agreed payload) when running
- On due time: **do the work**, do not only push `nextAt` forward
- Emit `Notify` on meaningful events (success, threshold, restock, hard failure)

**Static**

- No hub background ping
- Mini tip = loaded / open, not “timer running”

---

## Acceptance checklist (one tool)

See also `docs/TOOL_CHECKLIST.md`.

```text
[ ] Scripts: names, api, state, i18n, common (+ poll if live)
[ ] No raw json.tarkov.dev fetch
[ ] Uses TarkovAPI for network data
[ ] kind set in catalog-data.js AND catalog.json
[ ] Domain rules not duplicated for “the other tool”
[ ] Events use Notify({ title, body, tool, kind })
[ ] No second beep path
[ ] User-visible strings ready for i18n (or already keyed)
[ ] live: status/timer correct; static: no fake timer
[ ] Survives reload / mini restore where applicable
```

---

## Stage map (context)

| Stage | Focus |
|-------|--------|
| **0** | This contract, kind sync, single sound owner |
| **1** | Live tools unified (API + Notify + status) |
| **2** | Domain (`TarkovItems`) + migrate raw fetch |
| **3** | UI kit + density waves |
| **4** | i18n everywhere |
| **5** | Broader Notify events |
| **6** | Hardening / CI checklist |

---

*Stage 0 — platform contract. Update this file when public APIs change.*
