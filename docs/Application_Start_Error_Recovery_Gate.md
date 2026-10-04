# Funding application start error recovery

Date: 2026-10-04

## Observed failure

The local app container logged PostgreSQL error `23505` on
`app_applications_business_opportunity_unique` when starting a new application.
The existing application was withdrawn with its frozen resubmission flag set
to false. The new application used a published call binding that allowed
resubmission. The repository allowed creation, while the index still included
the withdrawn historical application because of its old policy flag.

## Accepted behavior

Migration `0162_application_resubmission_uniqueness` aligns both business and
applicant uniqueness indexes with active applications. Deleted drafts and
withdrawn history do not occupy those uniqueness slots. No historical policy
values, application records, or audit records are changed.

Creation continues to check the latest published funding-call binding.
Submission continues to check the replacement application's frozen policy.
`findApplicationPolicyConflict` still rejects resubmission where that policy
disallows it. PostgreSQL still rejects duplicate active applications under
the one-per-business and one-per-applicant policies.

The shared creation mutation displays one error toast using the existing Toast
component. The selected-call screen and opportunity chooser handle rejected
promises, retain the selection for retry, and no longer render an inline
creation error. Loading failures and business field validation retain their
existing behavior.

## Verification evidence

- Architecture and form boundary checks pass for 1,387 source files.
- File-size checks pass for 2,022 handwritten files.
- Focused lint and `git diff --check` pass.
- Repository lint completes with zero errors and 16 warnings outside this change.
- Focused UI, service, and route tests: 18 passed across four files.
- All migrations, including 0162, apply to an isolated PostgreSQL database.
- Withdrawal and resubmission database suites: 16 passed. Coverage includes
  mismatched historical policies, concurrent replacement attempts, database
  uniqueness, draft response and audit creation, prohibited resubmission,
  ownership, immutable history, and closed funding calls.
- The initial database run hit a five-second timeout in an existing test while
  other checks ran. Both suites pass with one worker and a 30-second timeout.
- Production build passes, including compilation, TypeScript, page generation,
  and tracing.

- Standalone type checking passes.
- Full suite, using two workers and a 30-second timeout: 2,230 passed, 207
  skipped, one failed. The unchanged staff application-table test expects a
  human reference, while the unchanged column renders the application ID.
  This is not a full-suite pass.
- Migration 0162 applies successfully to the running local database. Both
  index definitions and the migration journal timestamp were verified.
- Repeating the formerly failing insert against the affected business and
  funding call succeeds inside a transaction that is rolled back. No test
  application is retained, and the isolated database was removed.

The local container rebuild is pending. No authenticated browser walkthrough
has been performed.

## Acceptance scope

The requested error recovery and toast behavior are accepted based on focused
tests and the architecture, file-size, lint, and production-build evidence.
Whole-repository acceptance remains qualified by the staff application-table
test failure. Running-container verification remains pending the rebuild.
