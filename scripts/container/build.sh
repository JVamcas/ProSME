#!/usr/bin/env bash

set -Eeuo pipefail

export DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
export FIREBASE_PROJECT_ID="container-build"
export NEXT_TELEMETRY_DISABLED=1
export PAYLOAD_SECRET="container-build-placeholder-secret"
export PUBLIC_FIREBASE_API_KEY="container-build"
export PUBLIC_FIREBASE_APP_ID="container-build"
export PUBLIC_FIREBASE_AUTH_DOMAIN="container-build.invalid"
export PUBLIC_FIREBASE_PROJECT_ID="container-build"
export PUBLIC_SITE_URL="http://localhost:3008"

npm run build --workspace @prosme/platform
