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
  if grep -q "^${NAME}=" "$file"; then
    sed -i "s|^${NAME}=.*|${NAME}=${VALUE}|" "$file"
  else
    printf '%s=%s\n' "$NAME" "$VALUE" >> "$file"
  fi
  echo "  updated ${file}"
}

echo "Setting ${NAME}..."
set_in_file "$SECRETS_FILE"
set_in_file "$ENV_FILE"

if [[ -d /opt/supabase ]]; then
  echo "Restarting edge functions..."
  (cd /opt/supabase && docker compose up -d --force-recreate functions)
fi

echo "Done. ${NAME} is live (value hidden)."
