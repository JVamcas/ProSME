#!/usr/bin/env bash

set -Eeuo pipefail

test_database="${P3_APPLICATION_TEST_DATABASE:-smefund_p32_test}"
base_database_url="${DATABASE_URL%/*}"
test_database_url="${base_database_url}/${test_database}"
vitest_data_directory="/tmp/p3-application-vitest-data"
vitest_module_cache="/tmp/p3-application-vitest-modules"

mkdir -p "${vitest_data_directory}" "${vitest_module_cache}"

cleanup() {
  node apps/platform/tests/support/manage-test-database.mjs drop "${test_database}"
}

trap cleanup EXIT
node apps/platform/tests/support/manage-test-database.mjs create "${test_database}"

echo "Applying all migrations to the isolated P3.2 test database..."
DATABASE_URL="${test_database_url}" npm run db:migrate --workspace @prosme/platform

echo "Running real PostgreSQL application integration tests..."
DATABASE_URL="${test_database_url}" \
  RUN_P3_APPLICATION_DATABASE_TESTS=true \
  XDG_DATA_HOME="${vitest_data_directory}" \
  npm exec --workspace @prosme/platform -- \
    vitest run \
    --configLoader runner \
    --fsModuleCachePath "${vitest_module_cache}" \
    tests/integration/application-database.test.ts
