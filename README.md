# Tarkov Tools

Static toolkit for Escape from Tarkov. Vanilla HTML/CSS/JS, no build step. Market and item data from [json.tarkov.dev](https://json.tarkov.dev).

**Live:** https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html

## Architecture

| File | Responsibility |
|------|----------------|
| `tarkovtool-hub.html` | Hub shell: search, catalog host, mini-tab bar, expand panel, notification UI |
| `tarkov-hub-app.js` | Catalog data, iframe pool, expand/collapse, pins, mini-tab chrome |
| `tarkov-hub-cats.js` | Category assignment, collapse persistence, hidden-tool filter |
| `tarkov-state.js` | localStorage, notification store, mini-tab list, BroadcastChannel |
| `tarkov-mini.js` | Per-tool MINI control, `Notify()`, `reportStatus()` |
| `tarkov-api.js` | Shared request helpers and response cache for json.tarkov.dev |
| `tarkov-names.js` | Name resolution: game shortName → API name → user short name |
| `tarkov-icons.js` | Icon resolution for cards and chips (emoji / optional image assets) |
| `tarkov-common.js`, `tarkov-common.css` | Theme, accent color, audio, settings panel |
| `tarkovtool-*.html` | Standalone tools |

A tool can open as a normal page or as a hub mini-tab. Mini-tabs keep a real-size iframe in an off-screen pool so timers and polls keep running. Switching tabs does not tear down the iframe. Closing the mini-tab or reloading the hub does.

## Local development

```bash
git clone https://github.com/veryDeepWell/tarkov-tools.git
cd tarkov-tools
python -m http.server 8080
```

Open `http://localhost:8080/tarkovtool-hub.html`.

## Adding a tool

1. Add `tarkovtool-<id>.html` with `tarkov-common.css` and `tarkov-common.js`.
2. Publish meta:  
   `<script type="application/json" id="tarkovtool-meta">{"title":"…","description":"…"}</script>`
3. Register the file in `CATALOG` inside `tarkov-hub-app.js` (`file`, `title`, `description`, optional `icon`).
4. Map the file to a category in `tarkov-hub-cats.js` (`CAT_MAP`).
5. Optional background integration:
   - `Notify(toolFile, title, body, kind)`
   - `reportStatus({ running: true, label: "…" })`
6. Prefer `TarkovAPI` and `TarkovNames.display(item)` instead of raw ids or duplicated fetches.
7. Use a dedicated localStorage key prefix.

## Icons

Each catalog entry may set `icon` (id) and/or `iconUrl`.

- Default UI uses emoji via `tarkov-icons.js`.
- To use files: place `assets/icons/<id>.svg` (or `.png` / `.webp`), then either set `iconUrl` or call `TarkovIcons.register(id, url)`.
- Optional: `TarkovIcons.useAssetFolder = true` to resolve `assets/icons/<id>.svg` automatically.

## Hub features (summary)

- Catalog search, pins, collapsible categories
- Mini-tabs with unread badges and hover detail
- Global notification list
- Settings: general, sound, appearance, per-tool/category hide
- Expand overlay constrained to the work area (scroll inside the tool iframe)

## Docs

- [CHANGELOG.md](CHANGELOG.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

Not affiliated with Battlestate Games.
