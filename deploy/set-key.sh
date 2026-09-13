#!/usr/bin/env bash
# Set / update any secret in one place on the VPS.
#
# Usage:
#   bash deploy/set-key.sh ZAPUPI_ZAP_KEY 'new-key-value'
#   bash deploy/set-key.sh ZYLALABS_API_KEY '15153|xxxxx'
#
# It writes the key to /etc/smmpanel.secrets AND /opt/supabase/.env,
# then restarts the edge functions container so the new value is live.

set -euo pipefail

NAME="${1:-}"
VALUE="${2:-}"

if [[ -z "$NAME" || -z "$VALUE" ]]; then
  echo "Usage: bash deploy/set-key.sh <KEY_NAME> '<KEY_VALUE>'" >&2
  exit 1
fi

SECRETS_FILE="/etc/smmpanel.secrets"
ENV_FILE="/opt/supabase/.env"

set_in_file() {
  local file="$1"
  [[ -f "$file" ]] || touch "$file"
  # No sed: keys/values may contain | & / \ = characters
  local tmp
  tmp="$(mktemp)"
  grep -v -E "^${NAME}=" "$file" > "$tmp" || true
  printf '%s=%s\n' "$NAME" "$VALUE" >> "$tmp"
  cat "$tmp" > "$file"
  rm -f "$tmp"
  echo "  updated ${file}"
}

echo "Setting ${NAME}..."
set_in_file "$SECRETS_FILE"
set_in_file "$ENV_FILE"

if [[ -d /opt/supabase ]]; then
  # The official Supabase compose file only forwards a fixed list of env vars to
  # the edge runtime, so custom keys in .env are invisible inside the container.
  # An override file makes the whole .env available to the functions service.
  OVERRIDE="/opt/supabase/docker-compose.override.yml"
  if ! grep -q 'env_file' "$OVERRIDE" 2>/dev/null; then
    cat > "$OVERRIDE" <<'YAML'
services:
  functions:
    env_file:
      - .env
YAML
    echo "  wrote ${OVERRIDE} (forwards .env to edge functions)"
  fi

  echo "Restarting edge functions..."
  (cd /opt/supabase && docker compose up -d --force-recreate functions)

  echo "Checking key is visible inside container..."
  if (cd /opt/supabase && docker compose exec -T functions printenv "$NAME" >/dev/null 2>&1); then
    echo "  OK: ${NAME} present in edge runtime"
  else
    echo "  WARN: ${NAME} not visible inside the functions container"
  fi
fi

echo "Done. ${NAME} is live (value hidden)."

