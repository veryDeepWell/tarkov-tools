# New tools — Headphones + Challenge (roadmap B + E)

## Files
```
tools/tarkovtool-headphones.html
tools/tarkovtool-headphones.js
tools/tarkovtool-challenge.html
tools/tarkovtool-challenge.js
hub/catalog-entries.json   ← merge into catalog-data.js / catalog.json
locales/ru.json, en.json   ← full files with tool.headphones / tool.challenge
```

## Catalog
Add the two objects from `hub/catalog-entries.json` to `hub/catalog-data.js` (and `catalog.json` if used).

## Notes
- Headphones: filters `types: headphones` / `ItemPropertiesHeadphone`; score is a **heuristic** (distance, distortion, weight, price).
- Challenge: local schema `tarkovChallengeState` `{ _v, xp, level, history }`; optional API pool for gear names.
<!-- Archived new-tools proposal. -->
