# Phase 1.1 — Workflow Template Storage

## Goal and scope

Implement the reusable, versioned template storage and governance lifecycle in
section 1.1 of `SME_Fund_Implementation_Plan_Consistent.md`.

The implementation adds the `WorkflowTemplate` and `WorkflowTemplateVersion`
domain contracts, version metadata snapshots, application services, persistence
protections, migration 0023, and lifecycle tests. Admin UI, new API routes, stage
configuration, task configuration, conditions, and runtime execution are outside
this task.

## Storage and compatibility

The existing `app_workflow_definitions` and `app_workflow_definition_versions`
tables implement templates and template versions. Their physical names and UUIDs
are preserved so existing exact-version foreign keys continue to work. The
legacy `definitionId` property identifies the owning template. Each version has
its own immutable metadata snapshot after leaving Draft; later draft metadata
edits do not change earlier version content.

Affected workflow schemas and repositories now live in
`src/modules/workflows/infrastructure`; definition services live in
`application/definitions`, models in `domain/definitions`, and transport schemas
in `api`. Existing consumers import the moved implementations directly. The
shared database client and schema registry remain at their transitional `src/db`
locations; this task does not relocate unrelated infrastructure or feature UI.

Creating a template atomically creates version 1 as Draft and an audit entry.
Existing version creation serializes on the template row and retains the unique
(template, version number) constraint. Draft edits require the expected row
version. The lifecycle is:

```text
Draft -> PendingApproval -> Approved -> Published -> Retired
             |
             +-- return with reason --> Draft
```

Submission, return, and approval have separate, globally scoped permissions in
the canonical catalogue. Publication and retirement retain their existing
specific permissions. Services validate the template/version association before
mutation. State changes and audit records commit in one transaction. PostgreSQL
also rejects invalid lifecycle transitions and non-draft content mutations,
including existing stage/task/transition content. Retirement retains the version
and runtime references; the existing opportunity-binding detachment behavior is
preserved.

Migration 0023 backfills snapshots for existing versions without changing their
IDs or lifecycle status. It is registered in the migration journal. The
application database has not been migrated as part of this implementation;
verification used disposable PostgreSQL 16 storage.

## Acceptance evidence

The tests cover all twelve section 1.1 acceptance criteria:

- Creation, initial Draft state, unique numbering, and editable drafts.
- Submission, return with a required reason, approval, and separate publication.
- Published content immutability, retirement, and retrieval of retired versions.
- Lifecycle audit, including rollback when audit insertion fails.

Additional checks cover explicit permission denial, mismatched template/version
IDs, stale writes, concurrent publication/version creation, request replay, and
preservation of published metadata after later draft edits.

Verification on 2026-09-19:

| Check | Evidence |
| --- | --- |
| Workflow unit tests | 42 tests passed across 5 files. |
| PostgreSQL integration tests | 15 tests passed across 2 files. |
| Migration | Fresh migration succeeded; a second migration run succeeded without reapplying changes. |
| Architecture and form boundaries | Passed for 530 source files. |
| File-size gate | Passed for 621 handwritten files. |
| Type checking | Passed. |
| Lint | Passed with 10 existing warnings and no errors. |
| Production build | Passed. |
| Full test suite | Failed on unrelated baseline issues; see below. Workflow tests passed. |

Functional acceptance is supported by the workflow tests. The repository-wide
quality gate is not accepted while the unrelated baseline test failures remain.
These failures concern stale funding-call import/ownership expectations and
existing dashboard, document-button markup, form-dialog, and money-field tests.
They are left outside this task.

## Reproduction and manual verification

With dependencies installed and `DATABASE_URL` and the normal application test
environment exported, run:

```sh
npm exec --workspace @prosme/platform -- vitest run tests/unit/workflows
apps/platform/tests/scripts/run-workflow-database-tests.sh
```

The database script creates and removes its isolated test database. It runs both
the existing workflow compatibility tests and the template storage tests.

For a service-level manual scenario, use
`application/definitions/ServerWorkflowTemplateService.ts` with an authenticated
actor holding the explicit permissions: create a template, edit version 1,
submit, return it with a reason, resubmit, approve, publish, then attempt an edit.
The edit must fail. Retire the version and retrieve that same version ID and its
audit history. No admin-screen verification is claimed for section 1.1.
