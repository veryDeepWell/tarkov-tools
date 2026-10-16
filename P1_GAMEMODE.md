# P1 — no dual gameMode in tool settings

## Правило
Mode только из `TarkovProfile` (`bindGameMode` / `wireToolPage`).
Tool `saveSettings` / `loadSettings` **без** ключа `gameMode`.

## Файлы
ammo, armor, containers, hideout, keys, mags, mods, shortname, streamer-flip, barter-live

## Что убрано
- `gameMode: document.getElementById('gameMode').value` из save
- восстановление select из `s.gameMode` / `preferredGameMode(s.gameMode)`
- defaults `{ gameMode: 'regular' }` где мешали
- `gameMode` из forEach persist (barter-live, shortname)

## Что осталось (ок)
- `const mode = document.getElementById('gameMode').value` для API load
- `TarkovProfile.bindGameMode("gameMode", …)`

## CI
```
gameMode: document.getElementById('gameMode'  → 0
getElementById('gameMode').value = s.gameMode → 0
```
