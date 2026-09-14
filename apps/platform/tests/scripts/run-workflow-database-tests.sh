#!/usr/bin/env bash

set -Eeuo pipefail

test_database="${P3_WORKFLOW_TEST_DATABASE:-smefund_p33_test}"
base_database_url="${DATABASE_URL%/*}"
test_database_url="${base_database_url}/${test_database}"
vitest_data_directory="/tmp/p3-workflow-vitest-data"
vitest_module_cache="/tmp/p3-workflow-vitest-modules"

mkdir -p "${vitest_data_directory}" "${vitest_module_cache}"

cleanup() {
  node apps/platform/tests/support/manage-test-database.mjs drop "${test_database}"
}

trap cleanup EXIT
node apps/platform/tests/support/manage-test-database.mjs create "${test_database}"

echo "Applying all migrations to the isolated P3.3 test database..."
DATABASE_URL="${test_database_url}" npm run db:migrate --workspace @prosme/platform

echo "Running real PostgreSQL workflow integration tests..."
DATABASE_URL="${test_database_url}" \
  RUN_P3_WORKFLOW_DATABASE_TESTS=true \
  XDG_DATA_HOME="${vitest_data_directory}" \
  npm exec --workspace @prosme/platform -- \
    vitest run \
    --configLoader runner \
    --fsModuleCachePath "${vitest_module_cache}" \
    tests/integration/workflow-database.test.ts
