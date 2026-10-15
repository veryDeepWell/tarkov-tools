# R-2 profile wire progress

## Model
1. Load → profile field if present, else default
2. Change in tool → write profile
3. No delayed overwrites

## r2-0.0.4
- `bindLevel` / `bindPrestige` / `wireToolPage`
- shell calls `wireToolPage` (gameMode + playerLevel + prestige)
- quest-items, trader-flip: playerLevel from profile
- JS snippets call `wireToolPage` when available

## Fields
| DOM id | Profile field |
|--------|----------------|
| gameMode | gameMode |
| playerLevel | level |
| prestige | prestige.level |

## Next
- trader LL selects if/when tools expose them
- quest completed/active lists beyond My Tarkov
