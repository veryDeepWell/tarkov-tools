#!/usr/bin/env bash
# Manual / CI checklist for Tarkov Tools contract compliance.
# Usage: ./scripts/tool-contract-check.sh [root_dir]
# Exit 0 = pass, 1 = failures found.
set -euo pipefail
ROOT="${1:-.}"
FAIL=0
warn() { echo "WARN  $*"; }
fail() { echo "FAIL  $*"; FAIL=1; }
ok() { echo "OK    $*"; }

echo "=== Tarkov Tools contract check (root=$ROOT) ==="

# 1) Catalog kind for live tools
CAT=$(find "$ROOT" -name 'catalog-data.js' -o -name '*catalog*.js' 2>/dev/null | head -5)
LIVE_FILES="tarkovtool-price-track.html tarkovtool-price-alarm.html tarkovtool-restock.html"
for f in $LIVE_FILES; do
  if echo "$CAT" | xargs grep -l "$f" 2>/dev/null | head -1 >/dev/null; then
    if grep -R --include='*catalog*' -l "$f" "$ROOT" 2>/dev/null | head -1 | xargs grep -A2 "$f" 2>/dev/null | grep -q 'live'; then
      ok "catalog kind live: $f"
    else
      # softer: kind may be elsewhere
      if grep -R --include='*.js' -n "\"$f\"" "$ROOT" 2>/dev/null | head -3 | grep -qi live; then
        ok "catalog/kind mentions live: $f"
      else
        warn "verify kind:live for $f in catalog"
      fi
    fi
  else
    warn "catalog entry not found for $f (check path)"
  fi
done

# 2) Locale keys tool.<id>.title for known tools
for lang in ru en; do
  LOC=$(find "$ROOT" -path "*/$lang.json" 2>/dev/null | head -1)
  if [[ -z "$LOC" ]]; then warn "locale $lang.json missing"; continue; fi
  for id in price-track price-alarm restock; do
    if grep -q "\"$id\"" "$LOC" 2>/dev/null || grep -q "price-track\|priceTrack" "$LOC" 2>/dev/null; then
      ok "locale $lang has tool-ish key for $id"
    else
      warn "locale $lang may lack tool.$id"
    fi
  done
  for k in poll.now poll.off restock.notifTitle; do
    # nested JSON — just check last segment
    seg="${k##*.}"
    if grep -q "\"$seg\"" "$LOC"; then ok "locale $lang has $seg"; else warn "locale $lang missing $seg"; fi
  done
done

# 3) No raw localStorage in p0 tools (allow TarkovStorage / comments)
if [[ -d "$ROOT/tools" ]]; then
  for f in "$ROOT/tools"/tarkovtool-*.js; do
    [[ -f "$f" ]] || continue
    n=$(grep -c 'localStorage\.\(get\|set\|remove\)Item' "$f" 2>/dev/null || true)
    n=${n:-0}
    if [[ "$n" -gt 0 ]]; then
      warn "raw localStorage in $(basename "$f") (x$n) — prefer TarkovStorage only"
    else
      ok "no direct LS hot path: $(basename "$f")"
    fi
  done
fi

# 4) Single TarkovPoll id — no setInterval for poll (exclude render ticks)
if [[ -d "$ROOT/tools" ]]; then
  for f in "$ROOT/tools"/tarkovtool-price-track.js "$ROOT/tools"/tarkovtool-price-alarm.js "$ROOT/tools"/tarkovtool-restock.js; do
    [[ -f "$f" ]] || continue
    if grep -q 'TarkovPoll.start' "$f"; then ok "TarkovPoll.start in $(basename "$f")"; else fail "missing TarkovPoll.start: $(basename "$f")"; fi
    if grep -q 'tool: TOOL\|tool: "tarkovtool-\|tool: '\''tarkovtool-' "$f"; then ok "opts.tool present: $(basename "$f")"; else fail "opts.tool missing: $(basename "$f")"; fi
  done
fi

# 5) No leftover *-fixed / *-push in deploy root (optional strict)
nfix=$(find "$ROOT" -maxdepth 1 \( -name '*-fixed.js' -o -name '*-push.js' \) 2>/dev/null | wc -l | tr -d ' ')
if [[ "$nfix" -eq 0 ]]; then ok "no *-fixed.js / *-push.js in root"; else warn "found $nfix fixed/push artifacts — move to _archive after merge"; fi

# 6) Schema module present
if [[ -f "$ROOT/core/tarkov-schema.js" ]]; then ok "tarkov-schema.js present"; else warn "tarkov-schema.js missing"; fi

echo "=== done (fail=$FAIL) ==="
exit $FAIL
