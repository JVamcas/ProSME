# Workflow assignment error labels — verification

Date: 1 October 2026

## Accepted behavior

- Reviewer allocation conflicts identify the task by its display name.
- Errors identify the configured role or named reviewer, including when no
  eligible candidates exist. Missing assignee configuration is explicit.
- Required and available reviewer counts remain visible for role allocation.
- Assignment labels use a narrow, joined query inside the stage transaction,
  only after allocation fails. Reviewer eligibility rules remain unchanged.

## Evidence

- Architecture and form boundary checks passed.
- File-size checks passed.
- Lint passed with 17 existing warnings and no errors.
- Type checking and the production build passed.
- Full default test run: 430 files passed, 27 skipped; 1,579 tests passed,
  74 skipped.
- Allocation regression tests cover task names, role and named reviewer labels,
  zero eligible reviewers, missing assignment configuration, query joins and
  target scope, and existing eligibility and allocation behavior.
- `git diff --check` passed. Existing working-tree changes were preserved.

## Acceptance limits

Scoped implementation and automated verification are accepted. PostgreSQL
integration suites requiring explicit enablement were skipped in the default
test run; the new label query was checked through SQL projection assertions
and mocked results. No browser acceptance or deployment is claimed.
