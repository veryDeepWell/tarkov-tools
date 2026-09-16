# Tarkov Tools

**RU** | [EN](#english)

Набор независимых веб-утилит для *Escape from Tarkov* (по умолчанию **PVE**).
Каждый инструмент — отдельная HTML-страница; хаб держит несколько в **мини-табах**.

> **Философия:** инструменты самостоятельны, но не в вакууме. Общие имена (`TarkovNames`), уведомления (`Notify` / `TarkovState`) и настройки связывают их без монолита.

## Возможности

| Область | Что есть |
|--------|-----------|
| **Хаб** | Каталог, поиск, закрепления, мини-табы |
| **Мини-табы** | Кнопка **МИНИ** → iframe + бейджи уведомлений |
| **Имена** | short names для всех тулзов (`TarkovNames`) |
| **Цены** | Динамика + **Price Alarm** (≤/≥ N, офферы) |
| **Торговцы** | Таймер рестока |
| **Бартер / бой / убежище** | live barter, ammo, armor, hideout, BTC… |

### Уведомления мини-табов

1. Тул → **МИНИ**
2. В фоне `Notify({ title, body, tool: 'tarkovtool-….html' })`
3. Бейдж на чипе = число; hover — список событий

### Быстрый старт

```bash
git clone https://github.com/veryDeepWell/tarkov-tools.git
cd tarkov-tools && python -m http.server 8080
# http://localhost:8080/tarkovtool-hub.html
```

### Архитектура

- `tarkov-state.js` — state, notifications, BroadcastChannel
- `tarkov-names.js` — short names
- `tarkov-mini.js` — MINI + Notify
- `tarkov-common.js/css` — UI, settings, sound
- `tarkov-hub-app.js` — catalog + mini UI

См. [CONTRIBUTING.md](CONTRIBUTING.md). Данные: [json.tarkov.dev](https://json.tarkov.dev).

---

## English

Standalone static tools for *Escape from Tarkov* (default **PVE**).
**Vision:** each tool does one job; shared names and notifications connect them without a monolith.

Run via `python -m http.server` or GitHub Pages. Extend with `Notify` + `TarkovNames` — see CONTRIBUTING.md.
