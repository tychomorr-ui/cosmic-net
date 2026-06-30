#!/usr/bin/env bash
# deploy-blade.sh — thin wrapper over mesh-bootstrap.sh for the 3 real nodes.
#
# Scope (honest):
#   Monarch · Valkyrie · Resonate-Earth. That's the fleet. The purged blades
#   (Forge / Payment Nexus / Investigation) stay AWAITING by doctrine — they
#   are not nodes and this script will not pretend otherwise.
#
# What it does:
#   1. Re-invokes mesh-bootstrap.sh with NODE_NAME + optional ED25519_SEED.
#   2. Polls the local daemon's /status (loopback) until it returns an
#      ARCHANGEL/v0 envelope with a valid ed25519 signature, or times out.
#   3. Optionally polls the public reverse-proxy URL (PUBLIC_URL=…) until
#      Caddy/nginx is wired through.
#
# It does NOT:
#   - mutate terminus-ops.json
#   - emit telemetry of any kind
#   - claim a node is LIVE on its behalf — the /ops UI does that via the
#     real signed-status probe in src/lib/probe-signed.ts
#
# Usage:
#   NODE_NAME=valkyrie ED25519_SEED=<hex32> ./scripts/deploy-blade.sh
#   NODE_NAME=monarch PUBLIC_URL=https://monarch.xinus.one/health ./scripts/deploy-blade.sh
#   NODE_NAME=resonate-earth POLL_SECONDS=60 ./scripts/deploy-blade.sh

set -euo pipefail

NODE_NAME="${NODE_NAME:?set NODE_NAME=monarch|valkyrie|resonate-earth}"
LISTEN_PORT="${LISTEN_PORT:-8787}"
POLL_SECONDS="${POLL_SECONDS:-30}"
PUBLIC_URL="${PUBLIC_URL:-}"

case "$NODE_NAME" in
  monarch|valkyrie|resonate-earth) ;;
  *) echo "[FAIL] NODE_NAME must be one of: monarch, valkyrie, resonate-earth" >&2; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOTSTRAP="${SCRIPT_DIR}/mesh-bootstrap.sh"
[[ -x "$BOOTSTRAP" ]] || { echo "[FAIL] missing $BOOTSTRAP" >&2; exit 1; }

cyan() { printf '\033[36m[deploy-blade]\033[0m %s\n' "$*"; }
red()  { printf '\033[31m[FAIL]\033[0m %s\n' "$*" >&2; }
ok()   { printf '\033[32m[OK]\033[0m %s\n' "$*"; }

cyan "stage 1 · bootstrap daemon for ${NODE_NAME}"
NODE_NAME="$NODE_NAME" LISTEN_PORT="$LISTEN_PORT" \
  ED25519_SEED="${ED25519_SEED:-}" "$BOOTSTRAP"

# ---- helper: verify a signed-status URL returns a valid envelope ----
verify_url() {
  local url="$1"
  python3 - "$url" <<'PYEOF'
import sys, json, urllib.request, binascii
import nacl.signing, nacl.exceptions
url = sys.argv[1]
try:
    body = urllib.request.urlopen(url, timeout=5).read()
except Exception as e:
    print(f"unreachable: {e}"); sys.exit(2)
try:
    r = json.loads(body)
    payload = r["payload"]; sig = r["sig"]; pub = r["pub"]
    if payload.get("v") != "ARCHANGEL/v0":
        print(f"bad envelope version: {payload.get('v')!r}"); sys.exit(3)
    vk = nacl.signing.VerifyKey(binascii.unhexlify(pub))
    raw = json.dumps(payload, separators=(",",":"), sort_keys=True).encode()
    vk.verify(raw, binascii.unhexlify(sig))
    print(f"SIG_OK node={payload.get('node')} pub={pub[:12]}")
except nacl.exceptions.BadSignatureError:
    print("bad signature"); sys.exit(4)
except Exception as e:
    print(f"malformed: {e}"); sys.exit(5)
PYEOF
}

poll() {
  local url="$1" label="$2"
  cyan "polling ${label}: ${url} (timeout ${POLL_SECONDS}s)"
  local deadline=$(( $(date +%s) + POLL_SECONDS ))
  while (( $(date +%s) < deadline )); do
    if out=$(verify_url "$url" 2>&1); then
      ok "${label} verified · ${out}"
      return 0
    fi
    sleep 2
  done
  red "${label} did not verify within ${POLL_SECONDS}s"
  return 1
}

cyan "stage 2 · loopback health-check"
poll "http://127.0.0.1:${LISTEN_PORT}/status" "loopback" || exit 1

if [[ -n "$PUBLIC_URL" ]]; then
  cyan "stage 3 · public reverse-proxy health-check"
  if ! poll "$PUBLIC_URL" "public"; then
    red "public URL unreachable or unsigned — fix the reverse-proxy (Caddy/nginx → 127.0.0.1:${LISTEN_PORT}/status)"
    exit 1
  fi
fi

ok "deploy-blade complete · ${NODE_NAME}"
cyan "next: paste node pubkey into /ops Valkyrie activator; the signed-status probe in the UI will flip the tile to LIVE"
