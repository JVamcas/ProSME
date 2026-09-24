#!/usr/bin/env bash

set -Eeuo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_directory}/.." && pwd)"
compose_file="${repository_root}/infrastructure/compose.yaml"
local_compose_override="${repository_root}/infrastructure/local/compose.local.override.yml"
environment_file="${repository_root}/.env"

print_usage() {
  cat <<'EOF'
Usage: ./scripts/bootstrap-admin.sh EMAIL

Assigns the system_administrator role to an existing verified Firebase user.
Uses the local Compose override only when ENVIRONMENT=local.

Example:
  ./scripts/bootstrap-admin.sh administrator@example.com
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  print_usage
  exit 0
fi

email="${1:-}"

if [ -z "${email}" ]; then
  echo "A verified Firebase email address is required." >&2
  print_usage >&2
  exit 1
fi

if (($# > 1)); then
  echo "Only the administrator email argument is accepted." >&2
  print_usage >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but was not found on PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required." >&2
  exit 1
fi

if [ ! -f "${environment_file}" ]; then
  echo "Missing ${environment_file}." >&2
  exit 1
fi

environment_name="${ENVIRONMENT:-$(
  sed -n \
    's/^[[:space:]]*ENVIRONMENT[[:space:]]*=[[:space:]]*//p' \
    "${environment_file}" \
    | tail -n 1
)}"
environment_name="${environment_name%$'\r'}"
environment_name="${environment_name#\"}"
environment_name="${environment_name%\"}"
environment_name="${environment_name#\'}"
environment_name="${environment_name%\'}"
environment_name="${environment_name:-local}"

compose=(
  docker compose
  --env-file "${environment_file}"
  -f "${compose_file}"
)

if [ "${environment_name}" = "local" ]; then
  if [ ! -f "${local_compose_override}" ]; then
    echo "Missing local Compose override: ${local_compose_override}" >&2
    exit 1
  fi

  compose+=(
    -f "${local_compose_override}"
  )
fi

"${compose[@]}" config --quiet

if [ "${environment_name}" = "local" ]; then
  database_container_id="$("${compose[@]}" ps --status running -q db)"
  if [ -z "${database_container_id}" ]; then
    echo "The local database container is not running." >&2
    echo "Start the stack with ./scripts/docker-up.sh first." >&2
    exit 1
  fi
fi

echo "Bootstrapping ${email} as system_administrator in ${environment_name}..."
"${compose[@]}" run \
  --rm \
  --no-deps \
  --workdir /workspace/apps/platform \
  --volume "${repository_root}/scripts/seed:/workspace/scripts/seed:ro" \
  --env "BOOTSTRAP_ADMIN_EMAIL=${email}" \
  migrations \
  node \
  --conditions=react-server \
  /workspace/node_modules/payload/bin.js \
  run \
  /workspace/scripts/seed/bootstrap-admin.ts
