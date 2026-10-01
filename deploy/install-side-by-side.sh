#!/usr/bin/env bash
# =============================================================================
# OrganicSMM Pro — install NEXT TO an existing site, without touching it.
#
# Safe-by-design rules (the existing panel is never modified):
#   * never edits existing nginx sites, only ADDS /etc/nginx/sites-available/organicsmm
#   * never touches native PostgreSQL (5432), ufw, Caddy, /opt/<other apps>
#   * does not upgrade an already-installed Node.js
#   * app on port 3100 (not 3000/3001), Supabase API on 8000, Supabase DB on 5433+
#   * nginx config is tested with `nginx -t`; on failure our file is removed
#
# Usage (root):
#   DOMAIN=organicsmm.pro API_DOMAIN=api.organicsmm.pro OLD_VPS=OLD_IP \
#     bash install-side-by-side.sh
#   OLD_VPS is optional: when set, data + users + secrets are copied from the
#   old VPS over SSH (you type the OLD VPS password when asked).
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/xbhisofy/organicxsmmpro.git}"
APP_DIR=/opt/smmpanel
SUPA_DIR=/opt/supabase
ENV_FILE=/etc/smmpanel.env
APP_PORT="${APP_PORT:-3100}"
APP_USER=smmpanel
DOMAIN="${DOMAIN:-}"
API_DOMAIN="${API_DOMAIN:-}"
OLD_VPS="${OLD_VPS:-}"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mxx %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die "Run as root"
[ -n "$DOMAIN" ] && [ -n "$API_DOMAIN" ] || die "Set DOMAIN=... and API_DOMAIN=..."

port_busy() { ss -ltn | awk '{print $4}' | grep -Eq "(^|:)$1$"; }
port_busy "$APP_PORT" && die "Port $APP_PORT busy — rerun with APP_PORT=3200"
port_busy 8000 && die "Port 8000 busy — stop: something else uses it"

log "Snapshot of existing setup (for your safety check)"
mkdir -p /root/pre-organicsmm-backup
cp -a /etc/nginx /root/pre-organicsmm-backup/nginx 2>/dev/null || true
ss -tlnp > /root/pre-organicsmm-backup/ports.txt
echo "   backup saved in /root/pre-organicsmm-backup"

log "Base packages (no upgrades of existing ones)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-upgrade git curl jq openssl ca-certificates certbot python3-certbot-nginx
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
fi
command -v pnpm >/dev/null || npm install -g pnpm@9

log "Code -> $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" remote set-url origin "$REPO_URL"
  git -C "$APP_DIR" fetch origin main && git -C "$APP_DIR" reset --hard origin/main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

log "Supabase stack (Docker) — no domain, so it will NOT install Caddy"
DOMAIN= INSTALL_DIR="$SUPA_DIR" REPO_DIR="$APP_DIR" bash "$APP_DIR/deploy/supabase-selfhost.sh"

setkv() { local f="$1" k="$2" v="$3" t; t="$(mktemp)"; grep -v -E "^$k=" "$f" > "$t" || true; printf '%s=%s\n' "$k" "$v" >> "$t"; cat "$t" > "$f"; rm -f "$t"; }
setkv "$SUPA_DIR/.env" API_EXTERNAL_URL    "https://$API_DOMAIN"
setkv "$SUPA_DIR/.env" SUPABASE_PUBLIC_URL "https://$API_DOMAIN"
setkv "$SUPA_DIR/.env" SITE_URL            "https://$DOMAIN"
(cd "$SUPA_DIR" && docker compose up -d)

ANON_KEY="$(grep '^ANON_KEY=' "$SUPA_DIR/.env" | cut -d= -f2-)"
PG_PASS="$(grep '^POSTGRES_PASSWORD=' "$SUPA_DIR/.env" | cut -d= -f2-)"
PG_PORT="$(grep '^POSTGRES_PORT=' "$SUPA_DIR/.env" | cut -d= -f2-)"

log "App database inside the Supabase container (native Postgres untouched)"
(cd "$SUPA_DIR" && docker compose exec -T db psql -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='smmpanel_app'" | grep -q 1) || \
  (cd "$SUPA_DIR" && docker compose exec -T db psql -U postgres -c "CREATE DATABASE smmpanel_app;")

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://postgres:${PG_PASS}@127.0.0.1:${PG_PORT}/smmpanel_app
SESSION_SECRET=$(openssl rand -hex 32)
PORT=${APP_PORT}
PUBLIC_APP_URL=https://${DOMAIN}
VITE_SUPABASE_URL=https://${API_DOMAIN}
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
NODE_ENV=production
EOF
fi
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
chown root:"$APP_USER" "$ENV_FILE"; chmod 640 "$ENV_FILE"

if [ -n "$OLD_VPS" ]; then
  log "Copying data + users + secrets from old VPS $OLD_VPS (enter its password)"
  ssh -o StrictHostKeyChecking=accept-new "root@$OLD_VPS" \
    "cd /opt/supabase && docker compose exec -T db pg_dump -U postgres --data-only \
     --schema=public --schema=auth --exclude-table=public._applied_migrations \
     --exclude-table='auth.schema_migrations' postgres" > /root/organicsmm-data.sql
  scp "root@$OLD_VPS:/etc/smmpanel.secrets" /etc/smmpanel.secrets 2>/dev/null || warn "no secrets file on old VPS"
  echo "   dump size: $(du -h /root/organicsmm-data.sql | cut -f1)"
  { echo "SET session_replication_role = replica;"; cat /root/organicsmm-data.sql; } | \
    (cd "$SUPA_DIR" && docker compose exec -T db psql -U postgres -d postgres -q) 2>&1 | \
    grep -Ev 'duplicate key|already exists' | tail -n 20 || true
fi

log "Edge functions"
bash "$APP_DIR/deploy/deploy-edge-functions.sh"

log "systemd service smmpanel (port $APP_PORT)"
cat > /etc/systemd/system/smmpanel.service <<EOF
[Unit]
Description=OrganicSMM Pro
After=network-online.target docker.service
[Service]
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/env node ${APP_DIR}/server/src/index.js
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable smmpanel
bash "$APP_DIR/deploy/update.sh"

log "nginx: ADDING our own site file only"
NG=/etc/nginx/sites-available/organicsmm
cat > "$NG" <<EOF
server {
  listen 80;
  server_name ${DOMAIN} www.${DOMAIN};
  client_max_body_size 20m;
  location / { proxy_pass http://127.0.0.1:${APP_PORT}; proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
}
server {
  listen 80;
  server_name ${API_DOMAIN};
  client_max_body_size 50m;
  location / { proxy_pass http://127.0.0.1:8000; proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; proxy_read_timeout 300s; }
}
EOF
ln -sf "$NG" /etc/nginx/sites-enabled/organicsmm
if nginx -t; then systemctl reload nginx; else rm -f /etc/nginx/sites-enabled/organicsmm "$NG"; die "nginx test failed — our file removed, old sites untouched"; fi

log "HTTPS certificates (only for our domains)"
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --no-redirect \
  -d "$DOMAIN" -d "www.$DOMAIN" -d "$API_DOMAIN" \
  || warn "SSL failed — point DNS A records to this VPS, then rerun: certbot --nginx -d $DOMAIN -d www.$DOMAIN -d $API_DOMAIN"

log "Done"
echo "  Website : https://$DOMAIN   (app port $APP_PORT)"
echo "  API     : https://$API_DOMAIN"
echo "  Other sites check: diff <(ls /root/pre-organicsmm-backup/nginx/sites-enabled) <(ls /etc/nginx/sites-enabled)"
