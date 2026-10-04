# Contributing

## Adding or updating a tool

1. Add or edit the tool page at `tools/tarkovtool-<id>.html`.
2. Add a JSON metadata block with `id`, `title`, and `description` to the page's
   `tarkovtool-meta` script element. Set optional `kind`, `cat`, and `icon`
   values when needed; use an existing category and a local SVG icon from
   `assets/icons/`.
3. Put page behavior in `js/`; use shared modules from `core/` for API access,
   storage, domain logic, localization, and polling.
4. Load shared scripts before tool-specific scripts. Keep the script bootstrap
   consistent with neighboring tools and the rules in [`CONTRACT.md`](CONTRACT.md).
5. Regenerate the hub catalog:

   ```sh
   python scripts/build-catalog.py
   ```

   The generated `hub/catalog.js` is committed with the tool change. Do not
   edit it by hand.

## Validation

Run these from the repository root before submitting:

```sh
python scripts/lint-architecture.py
python scripts/build-catalog.py --check
bash scripts/domain-contract-check.sh
bash scripts/tool-contract-check.sh
git diff --check
```

The first two commands require Python 3.10 or newer. The shell contract checks
run in Git Bash or another Bash environment. The same checks are run by
`.github/workflows/architecture.yml`.

## Documentation and generated files

Update the relevant active documentation when changing a shared contract.
Historical design notes and superseded guides belong in [`_archive/docs/`](_archive/docs/),
not in the active docs navigation.
