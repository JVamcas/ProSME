# Cascading workflow and funding-call publication

Date: 2026-10-15

## Implemented scope

Publishing a workflow version publishes its exact attached task and COI form
versions. Both workflow publication entry points use the same preparation
service. Publishing a funding call also publishes its exact application form
version, its workflow template version, and that workflow's attached forms.
Already published versions are not rewritten; shared form references are
published once. No latest-version substitution or draft cloning occurs.

Funding-call governance and eligibility-ruleset publication requirements remain
in force. This change covers application forms, workflow templates and workflow
forms; it does not automatically approve or publish eligibility rulesets.
Existing narrow form/workflow publication permissions are required only when
those draft resources need publication. Missing, inactive, retired, invalid or
unauthorized dependencies abort the transaction.

## Transaction and performance behavior

The funding-call transaction holds the call lock and reserves its idempotency
record before publishing dependencies. Workflow publication holds its version
lock; form versions are deduplicated and locked in stable ID order. Form fields,
options and sections are loaded in bounded batches, validated with the existing
publication rules, and published with set-based metadata and version updates.
Workflow reference and condition validation uses the same transaction. Workflow
document requirements and audit records retain their existing publication path.

A PostgreSQL test publishes 12 draft forms plus a duplicate reference set and an
already published form in six database statements, excluding BEGIN/COMMIT.
The statement count does not grow per form. Failure of later parent publication
or workflow audit rolls back child publication. Funding-call snapshots, history,
workflow audit, and dependency writes share the funding-call transaction.
Publication hooks invalidate dependent form/workflow caches.

## Local verification and acceptance

- Final focused unit run: 11 files, 67 tests passed, covering readiness, both
  workflow publication entry points, exact bindings, COI, batching, missing and
  inactive forms, permissions, and validation failure.
- PostgreSQL: 2 files, 7 tests passed against a disposable PostgreSQL 17 container.
  Tests cover batched SQL, metadata promotion, published-version reuse, invalid
  siblings, workflow audit rollback, funding-call rollback, and idempotent replay.
  Temporary tables are derived from Drizzle columns; these are transaction and
  repository tests, not full migrated-database or deployed acceptance. Document
  projection refresh and notification/integration side effects are mocked at
  their boundaries. A failing final side-effect callback verifies rollback.
- Broader forms/workflows/funding-calls run: 1,558 passed, 9 skipped, 6 failed.
  Four failures introduced during implementation were corrected and passed in
  the focused rerun. Two failures remain in unchanged public-card markup tests:
  disabled-card copy and the expected aspect-ratio CSS class.
- Type checking and architecture, form architecture, and component-reuse checks
  passed. Repository lint passed with existing warnings.
- The file-size gate still reports five untouched baseline violations:
  `FormRepository.ts`, `FormDraftSyncPostgres.test.ts`,
  `WorkflowTemplateDeletionPostgres.test.ts`,
  `ServerApplicationDocumentService.test.ts`, and `ServerFormsService.test.ts`.
  Changed implementation functions remain within 200 lines and changed files
  within their applicable limits.

Technical acceptance is limited to the local evidence above. The repository-wide
suite and file-size gate are not claimed clean. Browser appearance, deployed
behavior and full migrated-database acceptance remain unverified. No production
build, deployment, production data mutation, or browser installation was done.
