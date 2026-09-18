# Architecture (P4 layout)

```
/
  tarkovtool-hub.html     # hub shell (stable URL)
  catalog.json            # tools list (file: tools/…)
  index.html
  core/                   # shared runtime
  hub/                    # hub-only scripts
  tools/                  # tool pages (+ extracted .js)
  locales/
  assets/icons/
```

## Path rules

- Hub at **repo root** so iframe `src="tools/tarkovtool-….html"` works.
- Tools load `../core/*`.
- `tarkov-common.js` uses `ttRoot()` / `ttUrl()` for dynamic script loads (mini, names, ui).

## Soft vs hard reset

Unchanged: mini-tabs keep iframes in `#framePool`; close destroys frame.
