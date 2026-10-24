# Hotfix: mods.js gate ⇒ window.render =

CI:
```
FAIL: js/mods.js uses TarkovProfile.gate but has no window.render / onProfileRefresh / bindRefresh
```

Contract greps **this file** for `window.render =` (assignment), not calls.

Added:
- `window.render = function () { ... }`
- `TarkovProfile.bindRefresh(...)`
