# P1 — единый data-path

## Запушить в корень `main`

| Файл | Действие |
|------|----------|
| `catalog.json` | **новый** — source of truth для tools + categories |
| `tarkov-hub-catalog.js` | **replace** — loader из catalog.json |
| `tarkov-mini.js` | **replace** — Notify только через TarkovState |
| `tarkov-hub-app.js` | **replace** — убран tt-notify re-notify |
| `tarkov-hub-notif.js` | **replace** — UI от State.on, не postMessage |
| `tarkov-hub-cats.js` | **replace** — labels из TarkovHubCATEGORIES |
| `TarkovAPI_CHECKLIST.md` | optional docs |

## Notify path (после P1)

```
Tool Notify() → TarkovState.notify() → localStorage + BC + listeners
                                    → hub-notif / mini list refresh
```

**Нет:** parent.postMessage(tt-notify), дублирующий BC из mini.

Status (`tt-status`) по-прежнему через postMessage/BC — это не notify.

## Catalog path

```
catalog.json → tarkov-hub-catalog.js → TarkovHubCATALOG + TarkovHubCATEGORIES
            → hub-app (cards) / hub-cats (sections) / icons (icon id)
```
