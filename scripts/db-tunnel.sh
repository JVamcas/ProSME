#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/env.progress}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

: "${GCP_PROJECT:?GCP_PROJECT is required}"
: "${DB_VM_NAME:?DB_VM_NAME is required}"
: "${DB_VM_ZONE:?DB_VM_ZONE is required}"

LOCAL_DB_PORT="${LOCAL_DB_PORT:-5433}"
REMOTE_DB_PORT="${REMOTE_DB_PORT:-5432}"

echo "Opening PostgreSQL SSH tunnel..."
echo "Project:    $GCP_PROJECT"
echo "VM:         $DB_VM_NAME"
echo "Zone:       $DB_VM_ZONE"
echo "Local port: $LOCAL_DB_PORT"
echo
echo "Connect locally using:"
echo "127.0.0.1:$LOCAL_DB_PORT"
echo

exec gcloud compute ssh "$DB_VM_NAME" \
  --project="$GCP_PROJECT" \
  --zone="$DB_VM_ZONE" \
  -- \
  -N \
  -L "${LOCAL_DB_PORT}:127.0.0.1:${REMOTE_DB_PORT}"