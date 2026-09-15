#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

: "${DB_NAME:?DB_NAME is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${APP_VM_IP:?APP_VM_IP is required}"

PG_VERSION="${PG_VERSION:-17}"

PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

echo "Configuring PostgreSQL ${PG_VERSION}..."
echo "Database: $DB_NAME"
echo "User:     $DB_USER"
echo "App IP:   $APP_VM_IP"

sudo sed -i \
  "s/^#\?listen_addresses.*/listen_addresses = '*'/" \
  "$PG_CONF"

sudo -u postgres psql \
  --set=ON_ERROR_STOP=1 \
  --set=db_user="$DB_USER" \
  --set=db_password="$DB_PASSWORD" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L',
  :'db_user',
  :'db_password'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = :'db_user'
)
\gexec

SELECT format(
  'ALTER ROLE %I WITH LOGIN PASSWORD %L',
  :'db_user',
  :'db_password'
)
WHERE EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = :'db_user'
)
\gexec
SQL

sudo -u postgres psql \
  --set=ON_ERROR_STOP=1 \
  --set=db_name="$DB_NAME" \
  --set=db_user="$DB_USER" <<'SQL'
SELECT format(
  'CREATE DATABASE %I OWNER %I',
  :'db_name',
  :'db_user'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_database
  WHERE datname = :'db_name'
)
\gexec

SELECT format(
  'ALTER DATABASE %I OWNER TO %I',
  :'db_name',
  :'db_user'
)
\gexec
SQL

HBA_RULE="host    ${DB_NAME}    ${DB_USER}    ${APP_VM_IP}/32    scram-sha-256"

if ! sudo grep -Fqx "$HBA_RULE" "$PG_HBA"; then
  echo "$HBA_RULE" | sudo tee -a "$PG_HBA" >/dev/null
fi

sudo systemctl restart postgresql

echo
echo "PostgreSQL setup complete."