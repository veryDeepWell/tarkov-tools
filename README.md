# Fix: hub/catalog.js stale + Sources not a catalog tool

## Changes
1. **Rebuilt** `hub/catalog.js` via `scripts/build-catalog.py` (67 catalog tools)
2. **`scripts/build-catalog.py`**: skip pages with `"catalog": false` or slug in `{sources, item-use}`
3. **`scripts/lint-architecture.py`**: page/catalog set uses same rule (no false mismatch)
4. **Meta** on `tarkovtool-sources.html` and `tarkovtool-item-use.html`: `"catalog": false`
5. Cleaned R-3 prefixes in tool metas

## Apply to repo
```
cp hub/catalog.js
cp scripts/build-catalog.py
cp scripts/lint-architecture.py
cp tools/tarkovtool-sources.html tools/tarkovtool-item-use.html
# + other cleaned tool html if needed
python3 scripts/build-catalog.py
python3 scripts/lint-architecture.py
```
