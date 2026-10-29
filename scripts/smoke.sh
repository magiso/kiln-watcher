#!/usr/bin/env bash
# Smoke checks against a running server. See docs/TESTING.md#smoke-checks.
#
#   scripts/smoke.sh http://localhost:3000 --write   # local: also posts a valid reading
#   scripts/smoke.sh https://part-time-kiln-watcher.vercel.app   # production: read-only
#
# Needs DEVICE_KEY in the environment (or in .env.local). Never use --write against
# production: a valid reading changes what visitors see.
set -euo pipefail

BASE="${1:?usage: scripts/smoke.sh <base-url> [--write]}"
WRITE="${2:-}"
if [[ -z "${DEVICE_KEY:-}" && -f .env.local ]]; then
  DEVICE_KEY="$(grep -E '^DEVICE_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d '"')"
fi
: "${DEVICE_KEY:?DEVICE_KEY is not set}"

if [[ "$WRITE" == "--write" && "$BASE" != http://localhost* && "$BASE" != http://127.0.0.1* ]]; then
  echo "refusing --write against a non-local server: $BASE" >&2
  exit 2
fi

failures=0
check() { # name expected actual
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1 (expected $2, got $3)"; failures=$((failures + 1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$@"; }

READING='{"deviceId":"smoke-test","distanceMm":482,"spreadMm":6,"validSamples":14,"intervalSec":14400,"trigger":"button"}'

check "GET /api/health" 200 "$(code "$BASE/api/health")"
check "POST /api/readings without a key" 401 "$(code -X POST -H 'Content-Type: application/json' -d "$READING" "$BASE/api/readings")"
check "POST /api/readings with a wrong key" 401 "$(code -X POST -H 'Authorization: Bearer wrong' -d "$READING" "$BASE/api/readings")"
check "POST /api/readings with an invalid body" 400 "$(code -X POST -H "Authorization: Bearer $DEVICE_KEY" -d '{"distanceMm":"x"}' "$BASE/api/readings")"

if [[ "$WRITE" == "--write" ]]; then
  check "POST /api/readings with a valid reading" 204 "$(code -X POST -H "Authorization: Bearer $DEVICE_KEY" -H 'Content-Type: application/json' -d "$READING" "$BASE/api/readings")"
  status="$(curl -s --max-time 30 "$BASE/api/status")"
  check "GET /api/status reflects the reading" '"OPEN_FULL" 482' "$(echo "$status" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(JSON.stringify(j.state),j.distanceMm)})')"
else
  check "GET /api/status" 200 "$(code "$BASE/api/status")"
fi

if (( failures > 0 )); then echo "$failures check(s) failed"; exit 1; fi
echo "all checks passed"
