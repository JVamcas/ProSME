#!/usr/bin/env bash

set -Eeuo pipefail

test_database="${P3_WORKFLOW_SCREEN_TEST_DATABASE:-smefund_p33_screen_test}"
base_database_url="${DATABASE_URL%/*}"
test_database_url="${base_database_url}/${test_database}"

cleanup() {
  node apps/platform/tests/support/manage-test-database.mjs drop "${test_database}"
}

trap cleanup EXIT
node apps/platform/tests/support/manage-test-database.mjs create "${test_database}"

echo "Applying all migrations to the isolated P3.3 screen-test database..."
DATABASE_URL="${test_database_url}" npm run db:migrate --workspace @prosme/platform

echo "Running the real workflow routes at desktop, tablet, and mobile sizes..."
DATABASE_URL="${test_database_url}" \
  RUN_P3_WORKFLOW_SCREEN_TESTS=true \
  npm exec --workspace @prosme/platform -- \
    playwright test tests/e2e/workflow-responsive.spec.ts
