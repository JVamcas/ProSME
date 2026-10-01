# Inherited eligibility task forms — verification

Date: 2 October 2026

## Accepted behavior

- Eligibility tasks resolve their form from the application's pinned ruleset
  without requiring a template form-binding record. The assigned form must
  match the ruleset's verification form.
- Generated verification forms expose an explicit empty context-field list.
  Ordinary forms still require a template binding and retain its context fields.
- Reviewer assignment, active workflow/stage checks, and COI clearance remain
  enforced in the runtime query.
- Preview, activation, and runtime loading recognize eligibility form purpose,
  the authoritative eligibility command, and the legacy eligibility task key.
- Template previews resolve the selected version's attached funding calls and
  render their respective published verification forms. Missing attachment,
  missing form, loading, and lookup failures have distinct states.
- The preview endpoint checks canonical workflow read permission before querying
  and verifies that the selected version belongs to the requested template.
- No schema migration or application-data repair is required.

## Evidence

- Architecture and form boundary checks passed for 1,229 source files.
- File-size check passed for 1,715 handwritten files.
- Lint completed with no errors and 17 existing warnings.
- Type checking and the production build passed.
- Full default suite: 432 files passed, 28 skipped; 1,589 tests passed,
  83 skipped.
- Nine additional PostgreSQL regression cases passed against a disposable
  PostgreSQL 16 database with every existing migration applied. Fixtures run
  within a rollback transaction. Cases cover inherited forms without bindings,
  ordinary context fields, missing ordinary bindings, version mismatches,
  reviewer scope, COI clearance, inactive stages, multiple calls sharing a
  template, and missing call configuration.
- Preview UI, protected service, and transport regression tests passed in the
  full suite.
- `git diff --check` passed. The disposable PostgreSQL container was removed
  after verification.

## Acceptance limits

Scoped behavior is accepted based on the automated evidence above. Existing
working-tree edits were preserved. No browser acceptance or deployment is
claimed; other opt-in database suites remain skipped in the default run.
