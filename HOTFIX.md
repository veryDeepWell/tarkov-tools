# Hotfix: armor `plate-show`

CI:
```
FAIL: armor tool must expose compatible plates from its own column
```
Cause: `domain-contract-check.sh` greps `plate-show` in `js/armor.js`.
T4 used `compat-btn` → renamed to `plate-show`.

```bash
bash scripts/domain-contract-check.sh
```
