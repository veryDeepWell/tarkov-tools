# TarkovAPI checklist (P1)

## Rule

Tools **must not** call `https://json.tarkov.dev/...` via raw `fetch` when an equivalent exists on `TarkovAPI`.

## Use

```js
const items = await TarkovAPI.items();           // /{mode}/items
const barters = await TarkovAPI.barters();
const traders = await TarkovAPI.traders();
const quests = await TarkovAPI.quests();
const stations = await TarkovAPI.hideout();
// custom path:
const raw = await TarkovAPI.getJson('/' + TarkovAPI.mode() + '/maps');
const arr = TarkovAPI.asArray(raw);
```

## Checklist for each tool

- [ ] Script order includes `tarkov-api.js` before tool logic
- [ ] No hard-coded `json.tarkov.dev` URLs (except via TarkovAPI.BASE if needed)
- [ ] Game mode from `TarkovAPI.mode()` / settings, not a local hardcode
- [ ] Errors handled (network / empty array)

## Migration status

Run locally:

```bash
grep -R "json.tarkov.dev" --include="tarkovtool-*.html" -l
grep -R "TarkovAPI" --include="tarkovtool-*.html" -l
```

Goal: first set empty (or only comments), second set = all data tools.
