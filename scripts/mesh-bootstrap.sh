#!/usr/bin/env bash
# mesh-bootstrap.sh — idempotent, self-testing bootstrap for Valkyrie / Resonate-Earth.
# Usage: NODE_NAME=valkyrie ED25519_SEED=<hex32> ./mesh-bootstrap.sh
# Requires: python3, openssl, nginx (or caddy). Runs as root or via sudo.

set -euo pipefail

NODE_NAME="${NODE_NAME:?set NODE_NAME=valkyrie|resonate-earth}"
LISTEN_PORT="${LISTEN_PORT:-8787}"
PUBLIC_HOST="${PUBLIC_HOST:-${NODE_NAME}.nexinus.net}"
INSTALL_DIR="/opt/archangel"
SERVICE="/etc/systemd/system/archangel-${NODE_NAME}.service"
KEY_FILE="${INSTALL_DIR}/ed25519.key"
SERVER_PY="${INSTALL_DIR}/signed-status-server.py"

log()  { printf '\033[36m[bootstrap]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

# 1. deps (idempotent)
log "ensuring deps"
command -v python3 >/dev/null || fail "python3 missing"
command -v openssl >/dev/null || fail "openssl missing"
python3 -c "import nacl.signing" 2>/dev/null || python3 -m pip install --quiet pynacl

# 2. install dir
mkdir -p "$INSTALL_DIR"

# 3. ed25519 key (generate once, never overwrite)
if [[ ! -f "$KEY_FILE" ]]; then
  log "minting ed25519 seed"
  if [[ -n "${ED25519_SEED:-}" ]]; then
    printf '%s' "$ED25519_SEED" > "$KEY_FILE"
  else
    openssl rand -hex 32 > "$KEY_FILE"
  fi
  chmod 600 "$KEY_FILE"
fi
PUBKEY=$(python3 -c "
import binascii, nacl.signing
s = open('$KEY_FILE').read().strip()
sk = nacl.signing.SigningKey(binascii.unhexlify(s))
print(sk.verify_key.encode().hex())
")
log "pubkey: $PUBKEY"

# 4. drop signed-status server
cat > "$SERVER_PY" <<'PYEOF'
#!/usr/bin/env python3
import json, time, binascii, sys, hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import nacl.signing

KEY = open(sys.argv[1]).read().strip()
PORT = int(sys.argv[2])
NODE = sys.argv[3]
SK = nacl.signing.SigningKey(binascii.unhexlify(KEY))
PUB = SK.verify_key.encode().hex()

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path != "/status":
            self.send_response(404); self.end_headers(); return
        payload = {"v":"ARCHANGEL/v0","node":NODE,"ts":int(time.time()),
                   "cid":"local","pub":PUB}
        raw = json.dumps(payload, separators=(",",":"), sort_keys=True).encode()
        sig = SK.sign(raw).signature.hex()
        body = json.dumps({"payload":payload,"sig":sig,"pub":PUB,"alg":"ed25519"}).encode()
        self.send_response(200)
        self.send_header("Content-Type","application/json")
        self.send_header("Cache-Control","no-store")
        self.end_headers(); self.wfile.write(body)

HTTPServer(("127.0.0.1", PORT), H).serve_forever()
PYEOF
chmod +x "$SERVER_PY"

# 5. systemd unit
cat > "$SERVICE" <<EOF
[Unit]
Description=ARCHANGEL signed-status (${NODE_NAME})
After=network.target

[Service]
ExecStart=/usr/bin/python3 ${SERVER_PY} ${KEY_FILE} ${LISTEN_PORT} ${NODE_NAME}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "archangel-${NODE_NAME}.service"

# 6. self-test
log "self-test"
sleep 1
RESP=$(curl -fsS "http://127.0.0.1:${LISTEN_PORT}/status") || fail "daemon not responding"
python3 - <<PYEOF || fail "signature self-test FAILED"
import json, binascii, sys, nacl.signing, nacl.exceptions
r = json.loads('''$RESP''')
vk = nacl.signing.VerifyKey(binascii.unhexlify(r["pub"]))
raw = json.dumps(r["payload"], separators=(",",":"), sort_keys=True).encode()
vk.verify(raw, binascii.unhexlify(r["sig"]))
print("SIG_OK", r["payload"]["node"], r["pub"][:12])
PYEOF

log "DONE — node=${NODE_NAME} pub=${PUBKEY}"
log "next: reverse-proxy https://${PUBLIC_HOST}/status -> 127.0.0.1:${LISTEN_PORT}/status"
log "paste pubkey into /ops Valkyrie activator to flip UNSIGNED -> LIVE"
