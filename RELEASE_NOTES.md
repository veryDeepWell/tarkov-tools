# Release notes — v0.2.0 (2026-09-17)

**Live:** https://verydeepwell.github.io/tarkov-tools/tarkovtool-hub.html

## What’s new

### Hub
- Category grid (collapsible): flea, loadout, hideout, quests, med, util
- Tool cards with real descriptions (not one-word stubs)
- Settings tabs: General / Sound / Appearance / Hidden tools
- Accent color picker

### Mini-tabs
- Background pool, badges, global notification bell
- Soft state when switching; hard reset only on close/reload
- `Notify` + `reportStatus`

### Tools
- Price Alarm, Food & water, Random/Drip/Budget/Builder loadouts
- Restock & price track background stability

### Architecture for contributors
- `tarkov-api.js`, `tarkov-names.js`, `tarkov-icons.js`
- Custom icons: put files in `assets/icons/{id}.svg` and set `TarkovIcons.useAssetFolder = true`

Full list: [CHANGELOG.md](./CHANGELOG.md)
