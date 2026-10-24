# R3a.0 package

## Files
- `core/tarkov-keys-rating.js`
- `data/keys-rating.json` (empty ratings map)
- `js/keys.js`, `tools/tarkovtool-keys.html`
- `js/key-analyzer.js`, `tools/tarkovtool-key-analyzer.html`
- `docs/R-3a.md`

## After copy
```bash
python scripts/build-catalog.py
bash scripts/tool-contract-check.sh
```
Add catalog entry if build does not pick new HTML automatically.
