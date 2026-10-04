#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${1:-$(dirname "$SCRIPT_DIR")}"
ROOT="$(cd -- "$ROOT" && pwd)"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_match() {
  local file="$1" pattern="$2" description="$3"
  grep -Eq -- "$pattern" "$ROOT/$file" || fail "$description"
}

assert_order() {
  local file="$1" first="$2" second="$3" first_line second_line
  first_line="$(grep -nF "$first" "$ROOT/$file" | head -n1 | cut -d: -f1 || true)"
  second_line="$(grep -nF "$second" "$ROOT/$file" | head -n1 | cut -d: -f1 || true)"
  [[ -n "$first_line" && -n "$second_line" && "$first_line" -lt "$second_line" ]] ||
    fail "$file must load '$first' before '$second'"
}

cd "$ROOT"

assert_match core/tarkov-items.js 'search: function' 'TarkovItems.search API must exist'
assert_match core/tarkov-weapon-domain.js 'compat: compat' 'weapon compatibility API must exist'
assert_match core/tarkov-weapon-domain.js 'penChart: penChart' 'shared penetration chart API must exist'
assert_match core/tarkov-weapon-domain.js 'armorClass: armorClass' 'shared armor class API must exist'
assert_match core/tarkov-weapon-domain.js 'scoreBuild: scoreBuild' 'weapon build scoring must live in domain'
assert_match core/tarkov-item-domain.js 'scoreItems: scoreItems' 'shared item score API must exist'
assert_match core/tarkov-item-domain.js 'evaluateProfit: evaluateProfit' 'shared market profit API must exist'
assert_match core/tarkov-item-view-models.js 'compatibleArmors:' 'plate/armor compatibility projection must exist'

assert_order tools/tarkovtool-armor.html '../core/tarkov-item-domain.js' '../core/tarkov-item-view-models.js'
assert_order tools/tarkovtool-armor.html '../core/tarkov-item-view-models.js' '../js/armor.js'
assert_order tools/tarkovtool-plates.html '../core/tarkov-item-domain.js' '../js/plates.js'
assert_order tools/tarkovtool-helmets.html '../core/tarkov-item-view-models.js' '../js/helmets.js'
assert_order tools/tarkovtool-food.html '../core/tarkov-item-view-models.js' '../js/food.js'
assert_order tools/tarkovtool-ammo.html '../core/tarkov-weapon-domain.js' '../js/ammo.js'
assert_order tools/tarkovtool-gun-builder.html '../core/tarkov-weapon-domain.js' '../js/gun-builder.js'

for file in js/armor.js js/plates.js js/helmets.js js/food.js; do
  assert_match "$file" 'TarkovItemDomain\.filter|TarkovItemViewModels\.' "$file must use shared domain/view models"
done
assert_match js/armor.js 'plate-show' 'armor tool must expose compatible plates from its own column'
assert_match js/plates.js 'compatibleArmors' 'plates tool must expose reverse compatibility'

if grep -RInE --include='*.js' 'Math\.log10\(bp / op\)|CLASS_THRESH|function classRating' js; then
  fail 'market tax or penetration-class formula is duplicated in tool scripts'
fi
if grep -RInE --include='*.js' --include='*.html' 'fetch[[:space:]]*\(' tools; then
  fail 'tool pages must not fetch item data directly'
fi
if LC_ALL=C grep -nE $'\xD0[\x80-\xBF]|\xD1[\x80-\xBF]|\xD2[\x80-\xBF]|\xD3[\x80-\xBF]' \
  js/armor.js js/plates.js js/helmets.js js/food.js; then
  fail 'target item tools must use locale keys instead of hard-coded Russian UI strings'
fi

printf 'P3 domain contract: PASS\n'
