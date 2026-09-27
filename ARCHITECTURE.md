# Architecture — Tarkov Tools Platform

This document describes the architecture, responsibilities, and contracts of **Tarkov Tools**. It serves as the "source of truth" for how tools, hub, and core modules interact.

---

## 🎯 Goals

| Goal | Description |
|------|-------------|
| **Single Responsibility** | Each tool does one thing well |
| **Shared Domain** | Game facts (prices, compat) in `core/` only |
| **Thin Presentation** | Tools handle UI; core handles data/rules |
| **Decoupled** | Tools don't depend on each other |

---

## 🏗️ Architecture Layers

### Core (`core/`)

**Responsibility:** Shared infrastructure, API boundary, normalized data.

| Module | Role | Public API |
|--------|------|------------|
| `tarkov-names.js` | Localization of game items | `display(id)`, `search()` |
| `tarkov-api.js` | Network + cache boundary | `getJson()`, `items()`, `traders()` |
| `tarkov-items.js` | Normalized item index | `byId()`, `byType()` (planned) |
| `tarkov-state.js` | Notifications, mini-tabs | `notify()`, `addMiniTab()` |
| `tarkov-i18n.js` | Locale packs, DOM apply | `t()`, `tt()`, `ready` |
| `tarkov-common.js` | Utilities: Notify, beep() | `Notify()`, `beep(type)` |

**Rule:** If a fact is true about the game (prices, compatibility, item type) and could be needed by more than one tool → belongs in **core**.

---

### Hub (`hub/`)

**Responsibility:** Shell, catalog, settings panel.

| File | Role |
|------|------|
| `tarkovtool-hub.html` | Unified portal with all tools |
| `catalog-data.js` | Manifest of tools (file, title, kind, cat) |
| `mini-tabs.html` | Panel for active mini-tabs |

---

### Tools (`tools/`)

**Responsibility:** Presentation only — layout, local UX.

| File | Role |
|------|------|
| `tarkovtool-{name}.html` | Tool presentation |
| `tarkovtool-{name}.js` | Tool logic (UI + API calls) |

**Must not:**

- Call `fetch("https://json.tarkov.dev/...")` directly
- Reimplement notification storage or sound
---

## 📦 Module Contracts

### TarkovAPI (`core/tarkov-api.js`)

**Role:** Single network + cache boundary to tarkov.dev.

| API | Description |
|-----|-------------|
| `getJson(path, opts?)` | Cached GET; prefer for new paths |
| `request(path, opts?)` | Response-based GET (legacy) |
| `items(mode?)` | Normalized item list |
| `traders(mode?)` | Traders info |
| `barters(mode?)` | Barters data |
| `quests(mode?)` | Quests |
| `hideout(mode?)` | Hideout stations |
| `asArray(raw)` | Normalize API shapes |
| `clearCache()` | Drop mem/LS cache |

**Rule:** Tools **must not** bypass this with raw `json.tarkov.dev` URLs.

---

### TarkovState (`core/tarkov-state.js`)

**Role:** Shared client state (notifications, mini-tabs).

| API | Description |
|-----|-------------|
| `notify(payload)` / `notifications()` | Notification list |
| `markRead` / `markToolRead` | Read state |
| `getMiniTabs` / `addMiniTab` / `removeMiniTab` | Mini tabs |
| `on(event, fn)` | Events: `notification`, `mini`, … |
| `unreadForTool(file)` | Badge counts |

**Payload:** `{ title, body, tool, kind?, … }`

---

### TarkovI18n (`core/tarkov-i18n.js`)

**Role:** Locale packs under `locales/*.json`, DOM apply.

| API | Description |
|-----|-------------|
| `t(key, params?)` | Lookup; missing → EN |
| `setLang(code)` / current lang | Persist + reload pack |
| `applyDom(root?)` | `[data-i18n]`, placeholders |
| `ready` | Promise when packs loaded |

---

### TarkovCommon (`core/tarkov-common.js`)

**Role:** Shared utilities: notifications, sound, formatters.

| API | Description |
|-----|-------------|
| `Notify(payload)` | Create notification; hub renders in panel |
| `beep(type)` | Play sound motif via WebAudio |
| `fmtRub(value)` | Format rubles as "5 000 ₽" |
| `humanize(ms)` | Human-readable duration |

---

### TarkovItems (planned / Stage 2)

**Role:** Domain layer — normalized items, indexes.

Implemented API:

- `load(mode?)` returns `{ all, byId, byType }`
- `byId(id, mode?)` and `byType(type, mode?)` provide query-only access

---

## 🏃 Live vs Static Behaviour

### Live

- May use `tarkov-poll` / local timers
- Report status to hub when running
- On due time: **do the work**, not just reschedule
- Emit `Notify` on meaningful events

### Static

- No hub background ping
- Mini tab = loaded, not "timer running"

---

## 🧩 Events & Notifications

### Notify

```javascript
Notify({
  title: "Цена упала",           // RU or EN
  body: "-5%",                   // RU or EN
  tool: "tarkovtool-price-track.html",
  kind: "success" | "info"
});
```

**Hub behavior:**

- Renders in notification panel with `kind` color
- Persistent until user acknowledges or timeout
- Minimum interval: **1 minute** between similar events

---

## 🗂️ Storage Keys

| Key | Writer | Description |
|-----|--------|-------------|
| `tarkovShortNames` | `tarkov-names.js` | Short names cache |
| `tarkovNotifications.v1` | `TarkovState.notify` | Notification list |
| `tarkovMiniTabs.v1` | Hub / Mini | Active mini-tabs |
| `{tool}Meta` | Tool JS | Live tool config + timers |

---

## 🚧 Roadmap (Phases)

| Phase | Focus | Status |
|-------|-------|--------|
| **0** | Platform contract, kind sync | ✅ Done |
| **1** | Live tools unified (API + Notify) | ✅ Done |
| **2** | Domain (`TarkovItems`) | 🚧 In progress |
| **3** | UI kit + density waves | 🔜 Planned |

- Invent a second background-timer protocol
- Embed domain rules that another tool will need later

# Architecture (P4 layout)

```
/
  tarkovtool-hub.html     # hub shell (stable URL)
  catalog.json            # tools list (file: tools/…)
  index.html
  core/                   # shared runtime
  hub/                    # hub-only scripts
  tools/                  # tool pages (+ extracted .js)
  locales/
  assets/icons/
```

## Path rules

- Hub at **repo root** so iframe `src="tools/tarkovtool-….html"` works.
- Tools load `../core/*`.
- `tarkov-common.js` uses `ttRoot()` / `ttUrl()` for dynamic script loads (mini, names, ui).

## Soft vs hard reset

Unchanged: mini-tabs keep iframes in `#framePool`; close destroys frame.
