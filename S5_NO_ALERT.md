# S5 — no window.alert

## Проблема
`alert()` блокирует UI, не i18n, нет единого тона (ok/err).

## Решение

### `TarkovUI.softAlert(message, opts)` / `TarkovUI.alert`
- пишет в `#status` / `.status`
- `Notify` + beep (если есть)
- `opts.key` + `opts.params` → i18n
- `opts.tone`: `err` | `ok` | `warn`

### Locales `common.*`
pickWeapon, noBasePrice, budgetTooLow, slotsFull, maxTabs, alreadyExists, needOneMap, saved, goonsUpdated, prereqFail

### Замены
| Файл | Было |
|------|------|
| gun-budget | 3× alert |
| cultist | slots full |
| desk | max tabs |
| hideout | prereq |
| map-admin | err.message |
| my-tarkov | import fail |
| raid-checklist | 2× |
| skills | saved |
| bosses | catch alert |

`window.alert` в этих тулах = **0**.

## Файлы
```
core/tarkov-ui.js
locales/*.json
js/*.js (9)
```
