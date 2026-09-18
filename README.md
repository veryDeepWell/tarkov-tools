# P2 — shared UI kit

## Push to repo root

| File | Action |
|------|--------|
| `tarkov-ui.js` | **new** |
| `tarkov-common.js` | loadShared → also loads ui |
| `tarkovtool-barter-live.html` | wrappers → TarkovUI |
| `tarkovtool-barter-calc.html` | same |
| `tarkovtool-trader-flip.html` | same |
| `tarkovtool-streamer-flip.html` | same |

## API

```js
TarkovUI.esc(s)
TarkovUI.fmtNum(n) / fmtRub(n)
TarkovUI.fleaTax(base, offer, count, { intelCenter3, hmLvl })
TarkovUI.fleaNet(...)
TarkovUI.settingsStore(namespace, defaults) // .get .set .getKey .setKey .reset
TarkovUI.bindSettingsForm(store, ['commission','intel3'], onChange)
TarkovUI.table(tableEl, filterInput) // → TarkovTools.enhanceTable
```

Legacy globals: `escapeHtml`, `formatNum`, `fleaTax`, `fleaNet` (set if missing).
