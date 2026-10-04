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

printf 'P2/P4 tool/storage contract: PASS\n'
