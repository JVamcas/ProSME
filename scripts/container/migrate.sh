#!/usr/bin/env bash

set -Eeuo pipefail

required_variables=(
  DATABASE_URL
  PAYLOAD_SECRET
  PUBLIC_FIREBASE_API_KEY
  PUBLIC_FIREBASE_APP_ID
  PUBLIC_FIREBASE_AUTH_DOMAIN
  PUBLIC_FIREBASE_PROJECT_ID
  PUBLIC_SITE_URL
)

for variable_name in "${required_variables[@]}"; do
  if [ -z "${!variable_name:-}" ]; then
    echo "${variable_name} is required." >&2
    exit 1
  fi
done

cd /workspace

echo "Applying application database migrations..."
npm run db:migrate --workspace @prosme/platform

echo "Applying Payload database migrations..."
npm run payload --workspace @prosme/platform -- migrate

echo "Database migrations completed."
