# Contributing / Контрибут

## RU

1. Форк → ветка `feat/…` или `fix/…`.
2. Новый тул: `tarkovtool-<slug>.html` (+ опционально `.js`).
3. Добавь карточку в `CATALOG` / `HELP` в `tarkov-hub-app.js`.
4. Не коммить секреты; только static + public API.
5. Проверь в браузере: хаб открывается, в DevTools нет ошибок загрузки/JS, работают МИНИ + Notify если нужно.

### Чеклист нового тулза

- [ ] `tarkov-common.css` + `tarkov-common.js`
- [ ] Network access through `TarkovAPI`; item queries through `TarkovItems`
- [ ] `#tarkovtool-meta` JSON
- [ ] Имена через `TarkovNames.display` / `search`
- [ ] Фоновые события → `Notify({ tool: 'tarkovtool-xxx.html', … })`
- [ ] PVE по умолчанию в select режима
- [ ] Описание в `HELP` для кнопки «?»
- [ ] Проверка через GitHub Pages или локальный static server; Node.js не требуется
- [ ] F5, восстановление mini-tab, EN/RU и IndexedDB/localStorage сценарии проверены в браузере

### Ключи localStorage

| Ключ | Кто пишет |
|------|-----------|
| `tarkovShortNames` | shortname tool |
| `tarkovNotifications.v1` | TarkovState.notify |
| `tarkovMiniTabs.v1` | хаб / МИНИ |
| `tarkovState.v1` | общий state (alerts.prices и т.д.) |
| `tarkovTheme`, `tarkovLang`, `tarkovSound`, … | common settings |

## EN

1. Fork → branch `feat/…` or `fix/…`.
2. New tool file `tarkovtool-<slug>.html`.
3. Register in `tarkov-hub-app.js` (`CATALOG` + `HELP`).
4. Use `Notify` + `TarkovNames`; keep tools decoupled.
## Adding a New Tool

### Step 1: Plan the tool

What will it do? Is there demand? Consider:

| Kind | Description | Examples |
|------|-------------|----------|
| **Live** | Runs timers, hub pings status | price-track, restock |
| **Static** | Loaded once, no background | barter-live, bosses-db |

### Step 2: Follow the contract

Read [`docs/PLATFORM.md`](docs/PLATFORM.md):

- Scripts order for tool HTML
- No direct `fetch` → use `TarkovAPI`
- Use `Notify` from `tarkov-common.js`, not duplicate beep
- Domain rules (item stats, compat) in `core/`, not tools

### Step 3: Write code

**Static tool:**

```html
<!-- tools/tarkovtool-bosses.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bosses Database</title>
</head>
<body>
  <!-- UI goes here -->
  
  <script src="../core/tarkov-names.js"></script>
  <script src="../core/tarkov-api.js"></script>
  <script src="../core/tarkov-state.js"></script>
  <script src="../core/tarkov-i18n.js"></script>
  <script src="../core/tarkov-common.js"></script>
  <!-- Optional: ../core/tarkov-items.js if using item data -->
  <script src="tarkovtool-bosses.js"></script>
</body>
</html>
```

**Live tool (add `poll`):**

```html
<!-- Add: <script src="../core/tarkov-poll.js"></script> after state -->
```

### Step 4: Register in catalog

Add to [`hub/catalog-data.js`](hub/catalog-data.js):

```javascript
{
  file: 'tools/tarkovtool-bosses.html',
  title: 'Bosses Database',
  description: 'List of bosses with stats and locations',
  cat: 'Lore',
  kind: 'static'  // or 'live' for trackers/alarms
}
```

And to [`catalog.json`](hub/catalog.json) (if maintained).

### Step 5: Acceptance checklist

Verify before PR ([`docs/TOOL_CHECKLIST.md`](docs/TOOL_CHECKLIST.md)):

- [ ] Scripts: `names`, `api`, `state`, `i18n`, `common` (+ `poll` if live)
- [ ] No raw `json.tarkov.dev` URLs
- [ ] Uses `TarkovAPI` for network
- [ ] Entry in catalog with `kind`
- [ ] Events use `Notify({ title, body, tool, kind })`
- [ ] No duplicate beep paths
- [ ] Strings ready for i18n or already keyed
- [ ] Live: timer works; Static: no fake timer
- [ ] Reload/restore doesn't break

---

## 🧪 Testing

### Manual testing

1. Open [`tarkovtool-hub.html`](hub/tarkovtool-hub.html)
2. Find your tool in catalog
3. Test as mini-tab and full-frame
4. Verify:
   - Works after F5 (reload)
   - Mini restore doesn't lose frame
   - EN/RU switch doesn't break shell

### Simulate live behavior

For **live tools**, simulate background updates:

```javascript
// In console or test code
TarkovStorage.setJson('priceTrackMeta', {
  items: ['item_id'],
  interval: 10,      // Fast for testing
  nextSnapAt: Date.now() + 10000
});
```

---

## 📝 Code Style

### Naming conventions

- **Tools:** `tarkovtool-{name}.html` and `.js`
- **Variables:** camelCase (`lastSnap`, `nextSnapAt`)
- **Constants:** UPPER_SNAKE_CASE (`RUN_KEY`, `META_KEY`)

### Comments & docs

- Comment complex logic
- JSDoc for functions with params/returns
- Keep public API small (core modules)

---

## 🎨 UI / UX

### Shared patterns

Prefer existing components from [`tarkovtool-barter-live`](tools/tarkovtool-barter-live.html):

| Component | Usage |
|-----------|--------|
| **Progress bar** | `Notify({ kind: 'progress' })` or UI kit when ready |
| **Help modal** | `?` button with tool-specific content in locales |
| **Status chips** | Reuse hub-style chips for item states |

### Localization (i18n)

- Use `data-i18n` attributes on elements
- Keys in `locales/ru.json` and `locales/en.json`
- Missing → English fallback via `TarkovI18n.t()`

---

## 📚 Documentation Updates

If you add features or change behavior:

1. **README.md** — overview, new tool description
2. **CHANGELOG.md** — version history (this file)
3. **docs/** — platform contract, checklists
4. **Code comments** — inline docs for complex logic

---

## 🔍 Code Review

Reviews focus on:

- Architecture (core vs tools separation)
- No duplicated domain rules
- i18n readiness
- Edge cases (reload, restore, lang switch)

**Guideline:** One PR = one feature or one fix. If too big → split it.

---

## 📣 Code of Conduct

Be respectful:

- Constructive feedback on issues/PRs
- Welcome newcomers with patience
- Stay on-topic in discussions

---

## 💬 Questions?

- **Issues:** [GitHub Issues](issues)
- **Discussions:** (if set up) — ask questions here
- **Discord:** (if exists) — community chat

**Thank you for contributing!** 🎉
1. Fork → branch `feat/…` or `fix/…`.

5. PR with a short description of behaviour and storage keys.
