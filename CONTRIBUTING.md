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
5. PR with a short description of behaviour and storage keys.
