# P2 — window.render + bindRefresh

## 22 тула
Каждый получил внутри IIFE:

```js
window.render = function () {
  try { TarkovProfile.wireToolPage(); } catch (e0) {}
  try { /* paint: render / renderTable / … */ } catch (e1) {}
};
TarkovProfile.bindRefresh(function () { window.render(); });
```

## Paint map
| tool | call |
|------|------|
| bosses, btc-farm, containers, drip, loot-slot, shortname, localizer | `render()` |
| cases | `renderGrid()` |
| compare | `renderCompare` + `renderPick` |
| cultist | `renderTable()` |
| drip-loadout, random-loadout | `renderPaperdoll()` |
| gun-builder | `renderSlots` + `renderStats` |
| item-use | `renderItem()` |
| loadout-builder | `renderSlots()` |
| price-alarm | `renderRules()` |
| price-track | `renderList()` |
| quest-cheese | `renderSources()` |
| gun-rating, marathon, repair, stim-combos | `paint` or `render` if exist |

## Note
containers/shortname взяты с **P1** (без dual gameMode).
