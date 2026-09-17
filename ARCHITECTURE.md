# Architecture

## Philosophy

Independent tools that share a **common runtime** (not a SPA framework).
Each tool is a full HTML page; the hub embeds them as **live iframes**.

### Soft vs hard reset

| Action | Effect |
|--------|--------|
| Switch mini-tab / collapse to hub | **Soft** — iframe stays in `framePool`, DOM & JS state kept |
| Close mini-tab (×) | **Hard** — iframe destroyed, in-memory state gone |
| Reload page / close browser | **Hard** — unless tool wrote to `localStorage` by design |

## Layers (inclusion order)

```
tarkov-common.js   # theme, sound (beep), settings, bar, tables
tarkov-state.js     # localStorage + BroadcastChannel: mini-tabs, notifications
tarkov-mini.js      # Notify(), reportStatus(), МИНИ button
tarkov-names.js     # short names / display / search
tarkov-hub-app.js   # catalog, chips, expand panel, frame pool
```

### Contracts every tool uses

1. `Notify({ title, body, tool: 'tarkovtool-foo.html', kind })` → sound + state + hub badge
2. `TarkovMini.reportStatus({ running, label })` → chip «● запущен»
3. Never reload the iframe on tab switch — only move the same node

### Mini-tab lifecycle

1. `addMiniTab` → localStorage
2. `ensureFrame(file)` once → map `frames[file]`
3. Background: iframe in off-screen `#framePool` (timers keep running)
4. Expand: move iframe into `#expandHost`
5. Collapse: move back to pool (state preserved)
6. Close: `destroyFrame` + `removeMiniTab`
