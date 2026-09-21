# Tool acceptance checklist

Use before merging a tool change or adding a new tool.

## Scripts

- [ ] `tarkov-names.js`
- [ ] `tarkov-api.js`
- [ ] `tarkov-items.js` (when item data is used)
- [ ] `tarkov-state.js`
- [ ] `tarkov-i18n.js`
- [ ] `tarkov-common.js`
- [ ] `tarkov-poll.js` only if `kind: live`

## Data & domain

- [ ] No direct `json.tarkov.dev` URL or raw `fetch` for game data in tool code
- [ ] Network via `TarkovAPI` only
- [ ] No game-domain rules that another tool will need (those go to core / future `TarkovItems`)

## Catalog

- [ ] Entry in `hub/catalog-data.js` with `file`, `title`, `description`, `cat`, **`kind`**
- [ ] Same entry / `kind` in `catalog.json`

## Events & sound

- [ ] User-facing events use `Notify({ title, body, tool, kind })`
- [ ] No direct duplicate beep for the same event
- [ ] `tool` is the HTML file name (e.g. `tarkovtool-restock.html`)

## i18n / UI (as stages land)

- [ ] Visible strings via `data-i18n` or `TarkovI18n.t` / `tt()`
- [ ] `tool.<id>.help` for `?` help when UI kit is available
- [ ] Heavy loads use progress % when UI kit is available

## Live only

- [ ] Timer/due actually runs work (not only reschedules)
- [ ] Mini status updates when running
- [ ] Background stop clears timers

## Smoke

- [ ] Open from hub + as mini-tab
- [ ] F5 / restore does not lose the tool frame for pinned mini
- [ ] EN/RU switch does not break the shell (when i18n wired)
