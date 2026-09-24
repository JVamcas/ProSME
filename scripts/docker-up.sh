#!/usr/bin/env bash

set -Eeuo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_directory}/.." && pwd)"
compose_file="${repository_root}/infrastructure/compose.yaml"
local_compose_override="${repository_root}/infrastructure/local/compose.local.override.yml"
environment_file="${repository_root}/.env"
maintenance_script="${script_directory}/docker-maintenance.sh"
application_service="app"
migration_service="migrations"

should_build=false
build_arguments=()
up_arguments=(--remove-orphans)

print_usage() {
  cat <<'EOF'
Usage: ./scripts/docker-up.sh [options]

Options:
  --build            Build images before starting the stack.
  --fresh            Pull and rebuild without cached layers.
  --no-cache         Rebuild without cached layers.
  --pull             Pull newer base images before building.
  --force-recreate   Recreate all containers.
  -h, --help         Show this help message.

Build cache older than seven days is pruned after a successful build.

When ENVIRONMENT=local, the local Compose override is applied automatically.
All other environments use only infrastructure/compose.yaml.
EOF
}

while (($# > 0)); do
  case "$1" in
    --build)
      should_build=true
      ;;
    --fresh)
      should_build=true
      build_arguments+=(--no-cache --pull)
      up_arguments+=(--force-recreate)
      ;;
    --no-cache)
      should_build=true
      build_arguments+=(--no-cache)
      ;;
    --pull)
      should_build=true
      build_arguments+=(--pull)
      ;;
    --force-recreate)
      up_arguments+=(--force-recreate)
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac

  shift
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but was not found on PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required." >&2
  exit 1
fi

if [ ! -f "${environment_file}" ]; then
  echo "Missing ${environment_file}. Copy .env.example and configure it first." >&2
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

if [ ! -x "${maintenance_script}" ]; then
  echo "Missing executable maintenance script: ${maintenance_script}" >&2
  exit 1
fi

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

echo "Using Compose configuration for ENVIRONMENT=${environment_name}."
echo "Validating Docker Compose configuration..."
"${compose[@]}" config --quiet

if [ "${should_build}" = true ]; then
  "${maintenance_script}" diagnose
  echo "Building application and migration images..."
  "${compose[@]}" build \
    "${build_arguments[@]}" \
    "${application_service}" \
    "${migration_service}"
fi

echo "Starting the ProSME stack..."
"${compose[@]}" up -d "${up_arguments[@]}"

echo "Seeding baseline application content..."
"${compose[@]}" run \
  --rm \
  --no-deps \
  "${migration_service}" \
  npm run db:seed --workspace @prosme/platform

echo "Waiting for the application health check..."
for attempt in $(seq 1 24); do
  container_id="$("${compose[@]}" ps -q "${application_service}")"
  health_status="$(
    docker inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "${container_id}" \
      2>/dev/null || true
  )"

  if [ "${health_status}" = "healthy" ]; then
    echo "The ProSME application is healthy."

    if [ "${should_build}" = true ]; then
      "${maintenance_script}" prune
    fi

    exit 0
  fi

  if [ "${health_status}" = "unhealthy" ] || [ "${health_status}" = "exited" ]; then
    echo "The application failed its health check." >&2
    "${compose[@]}" logs \
      --tail 100 \
      "${application_service}" \
      "${migration_service}" \
      >&2
    exit 1
  fi

  echo "Application not ready (${attempt}/24); retrying in 5 seconds..."
  sleep 5
done

echo "Timed out waiting for the application health check." >&2
"${compose[@]}" logs \
  --tail 100 \
  "${application_service}" \
  "${migration_service}" \
  >&2
exit 1
