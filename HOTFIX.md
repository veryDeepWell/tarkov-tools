# Hotfix: gate ⇒ window.render = (all table tools)

Same CI rule as mods:
```
window.render\s*=|onProfileRefresh|bindRefresh\(
```
must appear **in the tool file** that calls `TarkovProfile.gate`.

Patched every migrated tool JS under T2–T7 that had gate without assignment.
Primary failure: `js/crafts.js`.

Copy all files from `js/` into project `js/` and re-run:
```bash
bash scripts/tool-contract-check.sh
```
