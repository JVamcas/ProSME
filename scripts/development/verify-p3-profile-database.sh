#!/usr/bin/env bash

set -Eeuo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_directory}/../.." && pwd)"
compose_file="${repository_root}/infrastructure/local/compose.yaml"
environment_file="${repository_root}/.env"

if [ ! -f "${environment_file}" ]; then
  echo "Missing ${environment_file}." >&2
  exit 1
fi

compose=(
  docker compose
  --env-file "${environment_file}"
  -f "${compose_file}"
)

cd "${repository_root}"

echo "Building the cached migration test image..."
"${compose[@]}" build migrations

echo "Starting the isolated PostgreSQL dependency..."
"${compose[@]}" up -d db

"${compose[@]}" run \
  --rm \
  migrations \
  apps/platform/tests/scripts/run-profile-database-tests.sh
