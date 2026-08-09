#!/usr/bin/env bash
# deploy-lightsail.sh — self-host the full SSR app on an AWS Lightsail Ubuntu box.
#
#   Target: 34.216.185.65 (us-west-2, Oregon)  •  Host: universaltruth.life
#
# Run AS A NORMAL USER WITH SUDO on the instance:
#
#   sudo apt-get update && sudo apt-get install -y git
#   git clone <your-repo-url> ~/nexinus && cd ~/nexinus
#   sudo bash scripts/deploy-lightsail.sh
#
# Idempotent: re-run after every `git pull` to rebuild and restart.
#
# What it does:
#   1. installs Node 22 + bun + caddy
#   2. builds with NITRO_PRESET=node  (Node server output, NOT the CF Worker)
#   3. runs it as systemd unit `nexinus-app` on 127.0.0.1:3000
#   4. Caddy terminates TLS for $APP_HOST and reverse-proxies to it
#
# Secrets live in /etc/nexinus/app.env (created empty on first run — fill it in,
# then `sudo systemctl restart nexinus-app`). They are NEVER read from the repo.

set -euo pipefail

APP_HOST="${APP_HOST:-universaltruth.life}"
APP_PORT="${APP_PORT:-3000}"
APP_USER="${APP_USER:-nexinus}"
APP_DIR="${APP_DIR:-/opt/nexinus}"
ENV_FILE="/etc/nexinus/app.env"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { printf '\033[36m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "run with sudo"

# ---------------------------------------------------------------- 1. packages
log "installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https unzip

if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v bun >/dev/null; then
  curl -fsSL https://bun.sh/install | SHELL=/bin/bash bash
  install -m 0755 /root/.bun/bin/bun /usr/local/bin/bun
fi

if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy
fi

# ------------------------------------------------------------------- 2. user
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
install -d -m 0750 /etc/nexinus

if [ ! -f "$ENV_FILE" ]; then
  log "creating $ENV_FILE — FILL THIS IN, then restart the service"
  cat > "$ENV_FILE" <<'ENVEOF'
# Server-side secrets. Nothing here is committed to the repo.
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXINUS_WEBHOOK_SECRET=
LOVABLE_API_KEY=
ENVEOF
  chmod 0640 "$ENV_FILE"
  chown root:"$APP_USER" "$ENV_FILE"
fi

# ------------------------------------------------------------------ 3. build
log "syncing source -> $APP_DIR"
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .output --exclude .git \
  "$SRC_DIR"/ "$APP_DIR"/
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

log "installing deps + building (NITRO_PRESET=node)"
cd "$APP_DIR"
# Build-time VITE_* values come from the same env file so the client bundle is
# wired to the same backend the server uses.
set -a; . "$ENV_FILE"; set +a
sudo -u "$APP_USER" -H env "PATH=$PATH" bun install --frozen-lockfile
sudo -u "$APP_USER" -H env "PATH=$PATH" \
  VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
  VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-}" \
  VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-}" \
  NITRO_PRESET=node bun run build

# nitro's node preset writes .output/server/index.mjs; older layouts use dist/.
if   [ -f "$APP_DIR/.output/server/index.mjs" ]; then ENTRY="$APP_DIR/.output/server/index.mjs"
elif [ -f "$APP_DIR/dist/server/index.mjs" ];    then ENTRY="$APP_DIR/dist/server/index.mjs"
else fail "no server entry found — check the build output above"
fi
log "server entry: $ENTRY"

# ---------------------------------------------------------------- 4. systemd
cat > /etc/systemd/system/nexinus-app.service <<UNIT
[Unit]
Description=Nexinus / Universal Truth — TanStack SSR app
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
Environment=PORT=${APP_PORT}
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/node ${ENTRY}
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=${APP_DIR}

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now nexinus-app
systemctl restart nexinus-app

# ------------------------------------------------------------------ 5. caddy
cat > /etc/caddy/Caddyfile <<CADDY
${APP_HOST}, www.${APP_HOST} {
    encode zstd gzip
    reverse_proxy 127.0.0.1:${APP_PORT}
}
CADDY
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

# ----------------------------------------------------------------- 6. selftest
log "self-test"
sleep 3
curl -fsS -o /dev/null -w 'local SSR: HTTP %{http_code}\n' "http://127.0.0.1:${APP_PORT}/" \
  || fail "app not responding — journalctl -u nexinus-app -n 50"

echo
echo "=========================================================="
echo " DEPLOYED"
echo "   app:   http://127.0.0.1:${APP_PORT}  (systemd: nexinus-app)"
echo "   public: https://${APP_HOST}"
echo "   env:   ${ENV_FILE}"
echo "   logs:  journalctl -u nexinus-app -f"
echo "=========================================================="
echo "Point DNS A record ${APP_HOST} -> this instance's static IP,"
echo "open ports 80/443 in the Lightsail firewall, then reload the page."
