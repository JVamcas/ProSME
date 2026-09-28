#!/usr/bin/env bash

set -Eeuo pipefail

test_database="${NOTIFICATION_TEST_DATABASE:-smefund_notification_test}"
base_database_url="${DATABASE_URL%/*}"
test_database_url="${base_database_url}/${test_database}"
vitest_data_directory="/tmp/notification-vitest-data"
vitest_module_cache="/tmp/notification-vitest-modules"

mkdir -p "${vitest_data_directory}" "${vitest_module_cache}"

cleanup() {
  node apps/platform/tests/support/manage-test-database.mjs drop "${test_database}"
}

trap cleanup EXIT
node apps/platform/tests/support/manage-test-database.mjs create "${test_database}"

echo "Applying migrations to the isolated notification test database..."
DATABASE_URL="${test_database_url}" npm run db:migrate --workspace @prosme/platform

echo "Running notification PostgreSQL integration tests..."
DATABASE_URL="${test_database_url}" \
  FIREBASE_PROJECT_ID="notification-test" \
  PAYLOAD_SECRET="notification-test-secret-000000000" \
  PUBLIC_FIREBASE_API_KEY="notification-test" \
  PUBLIC_FIREBASE_APP_ID="notification-test" \
  PUBLIC_FIREBASE_AUTH_DOMAIN="notification.test" \
  PUBLIC_FIREBASE_PROJECT_ID="notification-test" \
  RUN_NOTIFICATION_DATABASE_TESTS=true \
  XDG_DATA_HOME="${vitest_data_directory}" \
  npm exec --workspace @prosme/platform -- \
    vitest run \
    --configLoader runner \
    --fsModuleCachePath "${vitest_module_cache}" \
    tests/integration/notification-foundation-database.test.ts

DATABASE_URL="${test_database_url}" \
  FIREBASE_PROJECT_ID="notification-test" \
  PAYLOAD_SECRET="notification-test-secret-000000000" \
  PUBLIC_FIREBASE_API_KEY="notification-test" \
  PUBLIC_FIREBASE_APP_ID="notification-test" \
  PUBLIC_FIREBASE_AUTH_DOMAIN="notification.test" \
  PUBLIC_FIREBASE_PROJECT_ID="notification-test" \
  RUN_NOTIFICATION_DATABASE_TESTS=true \
  XDG_DATA_HOME="${vitest_data_directory}" \
  npm exec --workspace @prosme/platform -- \
    vitest run \
    --configLoader runner \
    --fsModuleCachePath "${vitest_module_cache}" \
    tests/integration/notification-occurrence-database.test.ts

DATABASE_URL="${test_database_url}" \
  FIREBASE_PROJECT_ID="notification-test" \
  PAYLOAD_SECRET="notification-test-secret-000000000" \
  PUBLIC_FIREBASE_API_KEY="notification-test" \
  PUBLIC_FIREBASE_APP_ID="notification-test" \
  PUBLIC_FIREBASE_AUTH_DOMAIN="notification.test" \
  PUBLIC_FIREBASE_PROJECT_ID="notification-test" \
  RUN_NOTIFICATION_DATABASE_TESTS=true \
  XDG_DATA_HOME="${vitest_data_directory}" \
  npm exec --workspace @prosme/platform -- \
    vitest run \
    --configLoader runner \
    --fsModuleCachePath "${vitest_module_cache}" \
    tests/integration/notification-dispatch-claiming-database.test.ts

DATABASE_URL="${test_database_url}" \
  FIREBASE_PROJECT_ID="notification-test" \
  PAYLOAD_SECRET="notification-test-secret-000000000" \
  PUBLIC_FIREBASE_API_KEY="notification-test" \
  PUBLIC_FIREBASE_APP_ID="notification-test" \
  PUBLIC_FIREBASE_AUTH_DOMAIN="notification.test" \
  PUBLIC_FIREBASE_PROJECT_ID="notification-test" \
  RUN_NOTIFICATION_DATABASE_TESTS=true \
  XDG_DATA_HOME="${vitest_data_directory}" \
  npm exec --workspace @prosme/platform -- \
    vitest run \
    --configLoader runner \
    --fsModuleCachePath "${vitest_module_cache}" \
    tests/integration/notification-administration-database.test.ts
