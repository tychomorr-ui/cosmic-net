#!/usr/bin/env bash
# Valkyrie /status bootstrap — ARCHANGEL/v0 reference envelope.
#
# Run AS ROOT on valkyrie.nexinus.net (CentOS/RHEL). Produces:
#   - /opt/archangel/signed-status-server.py  (the reference server)
#   - /etc/archangel/ed25519.key              (32-byte hex seed, 0600)
#   - systemd unit archangel-status.service   (binds 127.0.0.1:8443)
#   - nginx /status location reverse-proxying to 127.0.0.1:8443
#   - prints edPubHex to paste into src/data/nodes.ts
#
# Idempotent: re-running rotates nothing unless --rotate-key is passed.
set -euo pipefail

NODE_ID="${NODE_ID:-valkyrie}"
BIND="${BIND:-127.0.0.1}"
PORT="${PORT:-8443}"
ETC="/etc/archangel"
OPT="/opt/archangel"
KEY="${ETC}/ed25519.key"
NGINX_CONF="/etc/nginx/conf.d/valkyrie-status.conf"
ROTATE=0

for a in "$@"; do
  [ "$a" = "--rotate-key" ] && ROTATE=1
done

command -v python3 >/dev/null || { echo "need python3"; exit 1; }
command -v nginx   >/dev/null || { echo "need nginx";   exit 1; }

# 1. cryptography dep (system pip; isolated venv is overkill for one file).
python3 -m pip install --quiet --no-cache-dir cryptography

# 2. lay down the reference server. Copy the canonical file from your repo
#    (public/signed-status-server.py) to this host before running, OR
#    fetch it from your published preview:
install -d -m 0755 "$OPT" "$ETC"
if [ ! -f "${OPT}/signed-status-server.py" ]; then
  echo "place public/signed-status-server.py at ${OPT}/signed-status-server.py first" >&2
  exit 1
fi
chmod 0755 "${OPT}/signed-status-server.py"

# 3. key material.
if [ ! -f "$KEY" ] || [ "$ROTATE" = "1" ]; then
  python3 "${OPT}/signed-status-server.py" --gen-key "$KEY"
fi
chmod 0600 "$KEY"
PUB_HEX="$(python3 - <<PY
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
raw=open("${KEY}","rb").read().strip()
if len(raw)==64: raw=bytes.fromhex(raw.decode())
k=Ed25519PrivateKey.from_private_bytes(raw)
print(k.public_key().public_bytes(encoding=serialization.Encoding.Raw,format=serialization.PublicFormat.Raw).hex())
PY
)"

# 4. systemd unit.
cat >/etc/systemd/system/archangel-status.service <<UNIT
[Unit]
Description=ARCHANGEL/v0 signed /status (Valkyrie)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 ${OPT}/signed-status-server.py --key ${KEY} --node ${NODE_ID} --bind ${BIND} --port ${PORT}
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadOnlyPaths=${ETC} ${OPT}

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now archangel-status.service

# 5. nginx /status location. Assumes an existing server { } for valkyrie.nexinus.net.
#    This drops a separate conf with CORS so the browser verifier can read it.
cat >"$NGINX_CONF" <<NGX
# Inject this location into your existing valkyrie.nexinus.net server block,
# OR include this file from inside it:  include conf.d/valkyrie-status.conf;
location = /status {
    add_header Access-Control-Allow-Origin  "*" always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type" always;
    if (\$request_method = OPTIONS) { return 204; }
    proxy_pass         http://${BIND}:${PORT}/status;
    proxy_http_version 1.1;
    proxy_set_header   Host \$host;
    proxy_read_timeout 5s;
}
NGX

nginx -t
systemctl reload nginx

echo
echo "=========================================================="
echo " Valkyrie signed-status is LIVE"
echo "   url:      https://valkyrie.nexinus.net/status"
echo "   edPubHex: ${PUB_HEX}"
echo "=========================================================="
echo "Paste edPubHex into src/data/nodes.ts (node id 'valkyrie')"
echo "then refresh /ops — Valkyrie should flip to LIVE."
