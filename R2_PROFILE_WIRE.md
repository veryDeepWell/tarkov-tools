# R-2 profile wire

Единый профиль ЧВК (`TarkovProfile`) — source of truth для прогресса на сайте.

**API:** `__v: 4` (R2.7+) · **чеклист:** [[R2_DONE]]

## Модель

1. **Load** → из профиля, иначе default  
2. **Change** → в профиль (не в tool-settings как прогресс)  
3. **Смена профиля / фильтра** → `window.render` / `bindRefresh` / shell `onProfileRefresh`  
4. Tool settings = только UI-prefs

## My Tarkov UX (R2.9)

| Поле | Когда пишется |
|------|----------------|
| УЛ (`select[data-trader]`) | сразу (`bindTraderLL`) |
| Имя, уровень, режим, престиж, иконка | сразу (live-save) |
| Квесты completed/active, заметки hideout | кнопка «Сохранить» |
| Skills | **отложено** (карточка в UI) |

Импорт JSON: проверка `_schema` / `_version` с confirm при неожиданных значениях.  
`exportProfile` → `_schema: tarkov-tools-pmc-profile` · `exportAll` → `…-profiles`.

## DOM → профиль

| DOM | Поле | API |
|-----|------|-----|
| `#gameMode` | `gameMode` | `bindGameMode` / wire |
| `#playerLevel` / `#level` | `level` | `bindLevel` / live |
| `#prestige` / `#prestigeLevel` | `prestige.level` | `bindPrestige` (0 не → 1) |
| `select[data-trader]` | `traders[key]` | `bindTraderLL` |

## Публичный API

| Метод | Назначение |
|-------|------------|
| `wireToolPage()` | mode + level + prestige + trader selects |
| `gate({…})` | `{ locked, reasons, reason }` |
| `offerMeta` / `offerGate` | нормализация оффера торговца → gate |
| `lockVisibility` / `applyLockToElement` | off / dim / hide |
| `bindRefresh(fn)` | профиль + фильтр |
| `bindTraderLL(root)` | все `select[data-trader]` |

События: `tt-profile-changed`, `tt-profile-filter`, `tt-profile-refresh`.

## Порядок скриптов (R2.8)

```text
storage → schema → profile → nav → … → tool.js → tool-shell
```

## Патчи

| Патч | Суть |
|------|------|
| R2.1–R2.4 | ядро gate/refresh, My Tarkov, CI |
| R2.5 | dual gameMode out |
| R2.6 | wire ⇒ refresh |
| R2.7 | gate coverage + offerGate |
| R2.8 | schema на всех tool HTML |
| R2.9 | My Tarkov live-save + доки |

## Filter modes

`off` — не гейтить · `dim` — opacity + title · `hide` — убрать из DOM/фильтра.
