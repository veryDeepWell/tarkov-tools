#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${1:-$(dirname "$SCRIPT_DIR")}"
ROOT="$(cd -- "$ROOT" && pwd)"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

line_of() {
  awk -v marker="$2" 'index($0, marker) { print NR; exit }' "$1"
}

assert_order() {
  local file="$1" before="$2" after="$3" before_line after_line
  before_line="$(line_of "$file" "$before")"
  after_line="$(line_of "$file" "$after")"
  [[ -n "$before_line" && -n "$after_line" && "$before_line" -lt "$after_line" ]] ||
    fail "$file must load '$before' before '$after'"
}

assert_match() {
  local file="$1" pattern="$2" description="$3"
  grep -Eq -- "$pattern" "$file" || fail "$description"
}

cd "$ROOT"

raw_accesses="$(
  {
    grep -RInE --include='*.js' --include='*.html' \
      'localStorage[[:space:]]*\.[[:space:]]*(getItem|setItem|removeItem|key|length)' \
      core hub js tools 2>/dev/null || true
    grep -nE \
      'localStorage[[:space:]]*\.[[:space:]]*(getItem|setItem|removeItem|key|length)' \
      ./*.js ./*.html 2>/dev/null || true
  } | grep -vE '(^|/)core/tarkov-storage\.js:' || true
)"
[[ -z "$raw_accesses" ]] || {
  printf 'FAIL: localStorage access must be confined to core/tarkov-storage.js:\n%s\n' "$raw_accesses" >&2
  exit 1
}

hub="tarkovtool-hub.html"
assert_order "$hub" 'core/tarkov-storage.js' 'core/tarkov-schema.js'
storage_line="$(line_of "$hub" 'core/tarkov-storage.js')"
schema_line="$(line_of "$hub" 'core/tarkov-schema.js')"
[[ "$schema_line" -eq $((storage_line + 1)) ]] ||
  fail "$hub must load tarkov-schema.js immediately after tarkov-storage.js"

assert_order tools/tarkovtool-price-alarm.html '../core/tarkov-schema.js' '../js/price-alarm.js'
assert_order tools/tarkovtool-restock.html '../core/tarkov-schema.js' '../js/restock.js'
assert_order tools/tarkovtool-battle-pass.html '../core/tarkov-schema.js' '../js/battle-pass.js'

assert_match js/price-alarm.js \
  'TarkovSchema\.readJson\(RULES_KEY, *1, *\{ *listKey: *"rules" *\}\)' \
  'price-alarm rules must be read through the versioned schema'
assert_match js/price-alarm.js \
  'TarkovSchema\.writeJson\(RULES_KEY, doc\)' \
  'price-alarm rules must be written through the versioned schema'
assert_match js/price-alarm.js \
  'var doc = \{ _v: 1, rules:' \
  'price-alarm rules must use the v1 document shape'
assert_match js/restock.js \
  'TarkovSchema\.readJson\("tarkovRestockSnapshot", *1, *\{ *listKey: *"traders" *\}\)' \
  'restock snapshots must be read through the versioned schema'
assert_match js/restock.js \
  'TarkovSchema\.writeJson\("tarkovRestockSnapshot", snapshot\)' \
  'restock snapshots must be written through the versioned schema'
assert_match js/restock.js 'var snapshot = \{' 'restock snapshot document must be constructed'
assert_match js/restock.js '_v: 1,' 'restock snapshots must include schema version 1'
assert_match js/restock.js 'traders: traders\.map' 'restock snapshots must include trader data'

for key in enabled history fired cycle-ms snapshot; do
  assert_match core/tarkov-storage.js \
    "tt:tool:restock:data:${key}" \
    "legacy restock state '$key' must have a canonical namespaced key"
done
assert_match core/tarkov-storage.js 'function migrateLegacyKeys\(' \
  'legacy storage keys must migrate through the centralized storage migration'
assert_match core/tarkov-storage.js 'tt:settings:' 'storage must namespace shared settings'
assert_match core/tarkov-storage.js 'tt:notif:v1' 'storage must namespace notifications'
assert_match core/tarkov-storage.js 'tt:mini:v1' 'storage must namespace mini-tabs'
assert_match core/tarkov-storage.js 'tt:api:' 'storage must namespace API cache'
assert_match core/tarkov-common.js 'TarkovStorage\.keys\("tt:"\)' \
  'export must enumerate canonical namespaced keys'
assert_match core/tarkov-common.js 'k\.indexOf\("ttApi:"\)' \
  'import must retain compatibility with legacy API cache keys'
assert_match core/tarkov-api.js 'const LS_PREFIX = "tt:api:"' \
  'API cache must use the namespaced API key prefix'
assert_match js/price-track.js 'tool:[[:space:]]*"tarkovtool-price-track\.html"' \
  'price-track poll must register its owning tool file'
assert_match js/price-alarm.js 'tool:[[:space:]]*TOOL' \
  'price-alarm poll must register its owning tool file'
assert_match js/restock.js 'tool:[[:space:]]*TOOL' \
  'restock poll must register its owning tool file'
assert_match hub/tarkov-hub-mini.js 'toolPoll\.stop\(liveEntry\.pollId\)' \
  'closing a live mini-tab must stop its poll'

if [[ -e fixed-push ]]; then
  fail 'fixed-push artifacts must not remain at the workspace root'
fi

# --- R2.4: My Tarkov load order (storage → schema → profile) ---
my_tarkov="tools/tarkovtool-my-tarkov.html"
if [[ -f "$my_tarkov" ]]; then
  assert_order "$my_tarkov" '../core/tarkov-storage.js' '../core/tarkov-schema.js'
  assert_order "$my_tarkov" '../core/tarkov-schema.js' '../core/tarkov-profile.js'
  mt_storage="$(line_of "$my_tarkov" '../core/tarkov-storage.js')"
  mt_schema="$(line_of "$my_tarkov" '../core/tarkov-schema.js')"
  [[ "$mt_schema" -eq $((mt_storage + 1)) ]] ||
    fail "$my_tarkov must load tarkov-schema.js immediately after tarkov-storage.js"
fi

# --- R2.4: profile API surface ---
assert_match core/tarkov-profile.js 'function gate\(' 'TarkovProfile.gate must exist'
assert_match core/tarkov-profile.js 'function bindRefresh\(' 'TarkovProfile.bindRefresh must exist'
assert_match core/tarkov-profile.js 'function bindTraderLL\(' 'TarkovProfile.bindTraderLL must exist'
assert_match core/tarkov-profile.js 'bindTraderLL: *bindTraderLL' 'bindTraderLL must be exported'

# --- R2.4: tools that call gate must expose refresh ---
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  if ! grep -Eq 'window\.render[[:space:]]*=|onProfileRefresh|bindRefresh\(' "$f"; then
    fail "$f uses TarkovProfile.gate but has no window.render / onProfileRefresh / bindRefresh"
  fi
done < <(grep -Rl --include='*.js' 'TarkovProfile\.gate' js 2>/dev/null || true)

# --- R2.4: no dual-progress keys in tool settings persists ---
# traderLevels in tool JS is forbidden (must live in TarkovProfile)
dual_trader="$(grep -Rn --include='*.js' -E 'traderLevels[[:space:]]*:' js 2>/dev/null | grep -v 'tarkov-profile' || true)"
[[ -z "$dual_trader" ]] || {
  printf 'FAIL: traderLevels must not be persisted in tool JS (use TarkovProfile.traders):\n%s\n' "$dual_trader" >&2
  exit 1
}

# playerLevel written into saveSettings/loadSettings blobs is forbidden
dual_level="$(grep -Rn --include='*.js' -E "saveSettings\([^)]*playerLevel|playerLevel:[[:space:]]*Number\(document\.getElementById\(['\"]playerLevel" js 2>/dev/null || true)"
[[ -z "$dual_level" ]] || {
  printf 'FAIL: playerLevel must not be persisted via tool saveSettings (use TarkovProfile):\n%s\n' "$dual_level" >&2
  exit 1
}


# --- R2.5: gameMode must not be persisted in tool settings (profile only) ---
# Allow my-tarkov.js (profile dashboard). Flag object fields written from #gameMode.
dual_mode="$(grep -Rn --include='*.js' -E 'gameMode[[:space:]]*:[[:space:]]*document\.getElementById\(['\''"]gameMode['\''"]' js 2>/dev/null | grep -v 'js/my-tarkov\.js:' || true)"
[[ -z "$dual_mode" ]] || {
  printf 'FAIL: gameMode must not be written into tool settings (use TarkovProfile.bindGameMode):\n%s\n' "$dual_mode" >&2
  exit 1
}
# Also flag loadSettings defaults that still seed progress from stored gameMode when paired with setting the select from s.gameMode
dual_mode_load="$(grep -Rn --include='*.js' -E "getElementById\(['\"]gameMode['\"]\)\.value\s*=\s*s\.gameMode" js 2>/dev/null | grep -v 'js/my-tarkov\.js:' || true)"
[[ -z "$dual_mode_load" ]] || {
  printf 'FAIL: gameMode select must not be restored from tool settings (use profile):\n%s\n' "$dual_mode_load" >&2
  exit 1
}

printf 'P2/P4 + R2 profile contract: PASS\n'
