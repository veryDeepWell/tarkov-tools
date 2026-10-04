# Tarkov Tools

Browser-based utilities for Escape from Tarkov. Open [`tarkovtool-hub.html`](tarkovtool-hub.html) directly or serve the repository as static files. No bundler or game modification is required.

The hub provides search, category and static/live filters, pinned tools, mini-tabs, notifications, settings, and English/Russian localization.

## Architecture

- `core/` contains shared API, storage, domain, UI, i18n, and live-runtime modules.
- `tools/tarkovtool-*.html` contains tool pages; tool logic is in `js/`.
- `hub/tarkov-hub-app.js` is the canonical hub app; settings, notifications, and catalog rendering are separate hub modules.
- `hub/catalog.js` is generated from tool-page metadata by `scripts/build-catalog.py`.
- Tool icons are local SVG assets in `assets/icons/`.

## Documentation

- [Architecture](ARCHITECTURE.md) — modules and repository layout.
- [Contract](CONTRACT.md) — scripts, storage, live tools, and catalog metadata.
- [Contributing](CONTRIBUTING.md) — adding a tool and running checks.
- [API reference](API.md)
- [Changelog](CHANGELOG.md)

Historical plans and working notes are preserved in [`_archive/docs/`](_archive/docs/).

## Validate changes

From the repository root:

```sh
python scripts/lint-architecture.py
python scripts/build-catalog.py --check
bash scripts/domain-contract-check.sh
bash scripts/tool-contract-check.sh
```

The Architecture GitHub Actions workflow runs these checks for pushes and pull requests.
