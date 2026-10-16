#!/usr/bin/env bash
# R2 audit matrix: tool JS × wire / refresh / gate / dual-keys
# Usage: bash scripts/r2-audit.sh [repo-root]
# Exit 0 always (report only). For CI hard fails use tool-contract-check.sh.

set -euo pipefail
ROOT="${1:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT"

printf '%-28s %5s %7s %5s %s\n' "TOOL" "wire" "refresh" "gate" "notes"
printf '%-28s %5s %7s %5s %s\n' "----" "----" "-------" "----" "-----"

wire_n=0; ref_n=0; gate_n=0; dual_n=0

for f in js/*.js; do
  [[ -f "$f" ]] || continue
  base=$(basename "$f")
  wire=0; ref=0; gate=0; notes=""
  if grep -Eq 'wireToolPage|bindGameMode\(' "$f"; then wire=1; wire_n=$((wire_n+1)); fi
  if grep -Eq 'window\.render[[:space:]]*=|bindRefresh\(|onProfileRefresh' "$f"; then ref=1; ref_n=$((ref_n+1)); fi
  if grep -Eq 'TarkovProfile\.gate|offerGate\(' "$f"; then gate=1; gate_n=$((gate_n+1)); fi
  if grep -Eq 'traderLevels[[:space:]]*:' "$f"; then notes="${notes}traderLevels "; dual_n=$((dual_n+1)); fi
  if grep -Eq 'gameMode[[:space:]]*:[[:space:]]*document\.getElementById\(['\''"]gameMode' "$f"; then
    if [[ "$base" != "my-tarkov.js" ]]; then notes="${notes}gameMode-settings "; dual_n=$((dual_n+1)); fi
  fi
  if [[ $wire -eq 1 && $ref -eq 0 ]]; then notes="${notes}WIRE_NO_REFRESH "; fi
  if [[ $gate -eq 1 && $ref -eq 0 ]]; then notes="${notes}GATE_NO_REFRESH "; fi
  printf '%-28s %5s %7s %5s %s\n' "$base" "$wire" "$ref" "$gate" "${notes:-·}"
done

printf '\nTotals: wire=%s refresh=%s gate=%s dual-flag-rows=%s\n' "$wire_n" "$ref_n" "$gate_n" "$dual_n"
printf 'Hard contract: bash scripts/tool-contract-check.sh\n'
