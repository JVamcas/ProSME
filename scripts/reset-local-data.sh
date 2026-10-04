#!/usr/bin/env bash

set -Eeuo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_directory}/.." && pwd)"
environment_file="${repository_root}/.env"
compose_file="${repository_root}/infrastructure/compose.yaml"
local_override="${repository_root}/infrastructure/local/compose.local.override.yml"

if [ "${1:-}" != "--confirm-reset" ]; then
  echo "Usage: ./scripts/reset-local-data.sh --confirm-reset" >&2
  exit 1
fi
if [ ! -f "${environment_file}" ]; then
  echo "Missing ${environment_file}." >&2
  exit 1
fi

compose=(
  docker compose
  --env-file "${environment_file}"
  -f "${compose_file}"
  -f "${local_override}"
)

cd "${repository_root}"
"${compose[@]}" config --quiet
"${compose[@]}" up -d db
"${compose[@]}" build migrations
"${compose[@]}" run --rm --no-deps migrations \
  npm run db:migrate --workspace @prosme/platform
"${compose[@]}" run --rm --no-deps \
  -e CONFIRM_PLATFORM_DATA_RESET=yes \
  migrations \
  npm run db:reset:data --workspace @prosme/platform
"${compose[@]}" run --rm --no-deps migrations \
  npm run db:seed:forms --workspace @prosme/platform
"${compose[@]}" run --rm --no-deps migrations \
  npm run db:seed:workflow --workspace @prosme/platform
"${compose[@]}" run --rm --no-deps migrations \
  npm run db:seed:eligibility --workspace @prosme/platform

echo "Local platform data reset and baseline reseed completed."
