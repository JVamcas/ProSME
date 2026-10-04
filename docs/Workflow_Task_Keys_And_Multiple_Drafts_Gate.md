# Workflow task keys and multiple drafts — verification

Date: 1 October 2026

## Accepted behavior

- Task creation generates a normalized, collision-safe stable key from the name.
- The task form no longer requests a stable key. Renaming preserves existing keys.
- A template can have multiple drafts, including concurrent clones with distinct
  version numbers. Migration 0147 removes the single-draft database index.
- Graph edits, metadata edits, validation, and publication target the selected
  version. Draft selection without a version selects the newest draft.
- Server operations retain permission checks, template/version membership checks,
  draft-only editing, optimistic concurrency, and transactional audit writes.

## Evidence

- Architecture and form boundary checks passed.
- File-size checks passed.
- Lint passed with 17 existing warnings and no errors.
- Type checking and the production build passed.
- Full default test run: 428 files passed, 26 skipped; 1,571 tests passed,
  73 skipped. PostgreSQL suites require explicit enablement.
- Focused PostgreSQL test `WorkflowMultipleDrafts.test.ts` passed on an isolated
  database with all migrations applied. It verifies concurrent draft allocation,
  latest-draft selection, and independent editing of an older draft.
- Migration 0147 applied successfully to the configured local Docker database.
- Existing working-tree changes were preserved.

## Acceptance limits

Scoped implementation and automated verification are accepted. The broader
PostgreSQL workflow suite is not accepted as green: its run reported 10 failed,
11 passed, and 1 skipped tests, including scoring records missing task references
and publication fixtures that fail current graph validation. These failures
occur outside the changed multiple-draft behavior; the focused database test
passes independently. No production deployment or browser acceptance is claimed.
The running local application image must be rebuilt to serve the source changes.
