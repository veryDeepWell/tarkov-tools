# Tarkov Tools — Browser utilities for Escape from Tarkov

![GitHub Workflow](https://github.com/user/repo/workflows/Test/badge.svg)  
![Version](https://img.shields.io/badge/version-0.3.0-blue)  

## 🎯 About the Project

**Tarkov Tools** — browser utilities that help you:
- **Compare item prices** (flea market, traders)
- **Generate loadouts** with compatibility and budget support
- **Plan skill progression** (stats, fatigue, metabolism)
- **Optimize hideout** for efficient crafting
- **Track item prices** in real-time

# FIX_BUNDLE — price-track only

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| **No game modifications** | Works via iframe, no injections required |
| **Unified core** | All tools use TarkovAPI, TarkovStorage, TarkovI18n |
| **Localization** | Full RU/EN support with total i18n planned |
| **Zero Hardcode** | Data and rules in `core/`, not hardcoded in tools |
| **Progress Tracking** | Background updates for live tools (trackers, alarms) |

---

## 🛠️ Available Tools

### 🔥 Live utilities (with background updates)

| Tool | Description | Category |
|------|-------------|----------|
| **[Price Track](tools/tarkovtool-price-track.html)** | Price tracking with countdown timer | Prices |
| **[Price Alarm](tools/tarkovtool-price-alarm.html)** | Notifications at price threshold | Prices |
| **[Restock Alert](tools/tarkovtool-restock.html)** | Restock notification at traders | Restock |

### 📊 Static utilities (no background)

| Tool | Description | Category |
|------|-------------|----------|
| **[Barter Live](tools/tarkovtool-barter-live.html)** | Active barter offers from traders | Trading |
| **[Bosses DB](tools/tarkovtool-bosses.html)** | Bosses database with stats and location | Lore |
| **[Ammo Catalog](tools/tarkovtool-ammo.html)** | Ammunition catalog with weapon compatibility | Items |

> [View all tools →](hub/catalog.json) — see the full manifest

## Фиксы
1. **lastSnap / nextSnapAt** пишутся в localStorage при каждом снимке (и в фоне, и вручную)
2. **Обратный отсчёт** на странице + в мини-табе («через Xm Yс · был ДД.ММ ЧЧ:ММ»)
3. **График** — тёмный фон canvas, яркие линии, Resize, 1 точка рисуется
4. Resume фона учитывает `nextSnapAt` (не сбрасывает таймер при открытии)
```
hub/                          # Core hub and tool catalog
│   ├── catalog-data.js       # Manifest of all tools (file, kind, cat)
│   └── tarkovtool-hub.html   # Unified portal with all tools
├── tools/                    # Individual HTML + JS
│   ├── tarkovtool-price-track.html
│   ├── tarkovtool-barter-live.html
│   └── ...
├── core/                     # Shared modules (unified core)
│   ├── tarkov-names.js       # Localization of names (RU, EN)
│   ├── tarkov-api.js         # Unified network boundary
│   ├── tarkov-items.js       # Normalized items
│   ├── tarkov-state.js       # Notifications + mini-tabs API
│   ├── tarkov-i18n.js        # Localization (t(), tt())
│   └── ...
├── locales/                  # Translation files (.json)
│   ├── ru.json
│   └── en.json
├── docs/                     # Documentation
│   ├── PLATFORM.md           # Contract between tools and core
│   ├── TOOL_CHECKLIST.md     # Checklist for new tools
│   └── ...
└── CHANGELOG.md              # Changelog

```

---

## 🚀 Quick Start

### 1. Start via portal (recommended)

Open [`tarkovtool-hub.html`](hub/tarkovtool-hub.html):
- Catalog of all tools with category filtering
- Mini-tabs for running multiple utilities simultaneously
- Settings: theme, sound, language

### 2. Direct tool launch

Any tool can be opened directly:

```html
<iframe 
  src="tools/tarkovtool-price-track.html" 
  style="width:100%;height:600px;border:none">
</iframe>
```

### 3. Configure background updates (live tools)

For **live utilities**, save metadata to `localStorage`:

```javascript
// Example for price-track.js
TarkovStorage.setJson('priceTrackMeta', {
  items: ['item_id_1', 'item_id_2'],
  threshold: 0.15,          // Threshold ±15%
  interval: 30,             // Interval in seconds (not < 25)
  nextSnapAt: Date.now() + 30000
});
```

**Note:** Hub pings live tools every N seconds. When mini-tab is opened, timer starts; when closed — stops.

---

## 🧩 Architecture
---

## 📜 Platform Contract

Detailed document [`docs/PLATFORM.md`](docs/PLATFORM.md):

- **Script order** — core module loading sequence
- **Live vs static** — behavior of live vs static utilities
- **Events & sound** — unified `Notify` and `beep` instead of duplicates
- **Data rules** — where to store rules (core vs tools)
- **Acceptance checklist** — checklist for review before PR

---

## 🧪 Live Preview

Test utilities via built-in hub panel:

1. Open [`tarkovtool-hub.html`](hub/tarkovtool-hub.html)
2. Find category (e.g., **Prices**)
3. Select utility — opens in iframe

---

## 🤝 Contributing

- [**GitHub Issues**](issues) — describe bugs or feature requests
- [**PRs**](pulls) — add new tools, fixes, improvements

### How to create a new tool

1. Follow [`TOOL_CHECKLIST.md`](docs/TOOL_CHECKLIST.md)
2. Write code in `tools/tarkovtool-new.html` + `.js`
3. Add manifest entry to `hub/catalog-data.js` (include `kind`)
4. Verify checklist from [`PLATFORM.md`](docs/PLATFORM.md)

### Conventions

- **Naming:** `tarkovtool-{name}.html` and `.js`
- **Categories:** `Prices`, `Trader`, `Builder`, `Lore`
- **Catalog:** `[file, title, description, cat, kind]` in `catalog-data.js`

---

## 📚 Documentation

| File | Description |
|------|-------------|
| [`docs/PLATFORM.md`](docs/PLATFORM.md) | Platform contract (core ↔ tools) |
| [`docs/TOOL_CHECKLIST.md`](docs/TOOL_CHECKLIST.md) | Checklist for new tools |
| [`roadmap2026.md`](roadmap2026.md) | Development roadmap 2026–2027 |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |

---

## 📦 License

**MIT License** — use as you like, including in commercial projects.

```
MIT License

Copyright (c) 2025-2026 Tarkov Tools Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.
```

---

## 📞 Contacts & Community

- **GitHub:** `user/repo`
- **Issues:** [Issue list](issues)

> ⚠️ **Important:** Tools run in browser. No game modifications, injections, or config edits required. Completely safe for your account.

---

**Built with ❤️ for Tarkov**  
*Last updated: 2026-09-27*

### Core Layer (unified core)

| Module | Role | API |
|--------|------|-----|
| **TarkovAPI** | Network boundary + caching | `getJson()`, `items()`, `traders()` |
| **TarkovState** | Notifications, mini-tabs | `notify()`, `addMiniTab()` |
| **TarkovI18n** | Localization (t(), tt()) | `ready`, `setLang()`, `applyDom()` |
| **TarkovItems** | Item data | `byId()`, `byType()` |
| **TarkovCommon** | Utilities: Notify, beep() | `Notify(payload)`, `beep(type)` |

### Principle of Separation of Concerns

> **Core** stores facts about items (price, compatibility, stats).  
> **Tools** handle only presentation and local UX.

If a rule can be needed in multiple tools — it must live in `core/`.


После пуша: Ctrl+F5 → «Снять сейчас» → клик по предмету в списке.
