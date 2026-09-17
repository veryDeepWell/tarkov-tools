# Tarkov Tools

Static toolkit for Escape from Tarkov. Vanilla HTML/CSS/JS, no build step. Data from [json.tarkov.dev](https://json.tarkov.dev).

**Demo:** https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html

## Stack

| Layer | Role |
|-------|------|
| `tarkovtool-hub.html` | Shell: catalog, mini-tab bar, expand host, notification panel |
| `tarkov-hub-app.js` | Catalog model, iframe pool, expand/collapse, pins |
| `tarkov-hub-cats.js` | Category grouping, collapse state, hidden-tools filter |
| `tarkov-state.js` | localStorage, notifications, mini-tab list, BroadcastChannel |
| `tarkov-mini.js` | MINI button, `Notify()`, `reportStatus()` |
| `tarkov-api.js` | Shared GraphQL/REST helpers + cache |
| `tarkov-names.js` | Display names: game shortName → API name → user short |
| `tarkov-icons.js` | Card/chip icons: emoji fallback, optional `assets/icons/` |
| `tarkov-common.js` / `.css` | Theme, accent, sound, settings UI |
| `tarkovtool-*.html` | Individual tools |

Tools run as full pages or as background iframes in the hub pool. Switching mini-tabs does not destroy the iframe (soft state). Closing the tab or reloading the page does (hard reset).

## Run locally

```bash
git clone https://github.com/veryDeepWell/tarkov-tools.git
cd tarkov-tools
python -m http.server 8080
# open http://localhost:8080/tarkovtool-hub.html
```

## Tool contract

1. Include `tarkov-common.css` and `tarkov-common.js` (loads state / names / mini).
2. Meta block: `<script type="application/json" id="tarkovtool-meta">{"title":"…","description":"…"}</script>`
3. Background alerts: `Notify(toolFile, title, body, kind)`.
4. Running flag for the hub chip: `reportStatus({ running: true, label: "…" })`.
5. Item labels: `TarkovNames.display(item)`.
6. Prefer `TarkovAPI` over ad-hoc `fetch` to the same endpoints.
7. Own localStorage keys; do not overwrite foreign prefixes.

## Custom icons

Catalog entries have an `icon` id. Options:

- `