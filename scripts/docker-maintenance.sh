#!/usr/bin/env bash

set -Eeuo pipefail

retention_hours="${BUILDKIT_CACHE_MAX_AGE_HOURS:-168}"

if ! [[ "${retention_hours}" =~ ^[0-9]+$ ]] || [ "${retention_hours}" -lt 1 ]; then
  echo "BUILDKIT_CACHE_MAX_AGE_HOURS must be a positive whole number." >&2
  exit 1
fi

diagnose() {
  echo "Docker disk usage:"
  docker system df

  echo "BuildKit cache usage:"
  docker builder du || true
}

prune() {
  echo "Removing dangling images..."
  docker image prune --force >/dev/null

  echo "Removing build cache unused for ${retention_hours} hours..."
  docker builder prune \
    --all \
    --force \
    --filter "until=${retention_hours}h" \
    >/dev/null
}

case "${1:-}" in
  diagnose)
    diagnose
    ;;
  prune)
    prune
    diagnose
    ;;
  *)
    echo "Usage: $0 {diagnose|prune}" >&2
    exit 1
    ;;
esac
