# Workflow task requirements and reviewer submissions

Date: 2026-10-04

## Accepted behavior

Each task owns its checklist, scoring configuration, document requirements,
comments, and recommendation fields. Tasks in the same stage may reuse requirement
keys, names, and display orders without changing one another's configuration.

Each reviewer's checklist, scores, comments, and recommendations remain in that
reviewer's runtime task submission. Conditions address a specific task and reviewer
slot; this change introduces no reviewer voting, averaging, or consensus rule.
The existing scoring setting still combines criteria within one submission.

Reviewers of the same task definition in the same stage run share the latest upload
for each document requirement. A replacement changes the current document while
preserving previous versions and their upload attribution. Other task definitions
and later runs do not automatically inherit that document. Explicit Return Retain
and Clear choices retain their existing behavior.

## Implementation

- Store and round-trip one scoring configuration per task, with criteria bound to
  that configuration through a composite stage/task foreign key.
- Validate requirement uniqueness within its task and keep edit/delete operations
  tied to the owning task. The scoring editor switches between task configurations
  and preserves the other tasks when saving.
- Use a shared document evidence predicate across task reads and completion checks.
  Current evidence is the newest version linked within that task definition/run.
- Preserve reviewer identity in stage completion, activation, and subsequent form
  context. Exclude superseded reviewer tasks and older completed runs.
- Expose condition paths such as
  `stage.assessment.task.review.reviewer_1.scoring.viability.value`.
  Existing stage-only aliases remain available only for single-reviewer,
  unambiguous submissions. Existing conditions that relied on flattened responses
  from multiple reviewers need explicit reviewer paths; no result is selected
  automatically to preserve those ambiguous conditions.
- Move the touched stage-details component into the workflows module UI.

Migration `0163_workflow_task_submission_scope.sql` backfills each existing scoring
criterion's configured task owner without changing keys, answers, or criteria. It
changes uniqueness to task scope and adds an index for shared document lookups.

The unrelated application-list test now verifies the application's displayed UUID
and detail link. Its previous human-reference expectation contradicted the current
Application ID column. The product display is unchanged.

## Validation

- Lint: zero errors; 16 existing warnings outside the changed files.
- Standalone TypeScript checking: passed.
- Architecture and form boundaries: passed for 1,397 source files.
- File-size checks: passed for 2,045 handwritten files.
- Focused workflow suite: 814 passed, six skipped across 184 passing files.
- Application-list suite: all five tests passed, including the corrected ID/link
  expectation.
- PostgreSQL task submission and rework suites: all ten tests passed. They cover
  task-local uniqueness, scoring ownership backfill, composite ownership checks,
  shared latest uploads, preserved history, isolation, and explicit retention.
- All 164 SQL migrations applied to an isolated database. Definition and condition
  cloning round trips both passed against that migrated database.
- Production build: passed, including compilation, TypeScript, all 86 static
  pages, and build tracing.
- Full suite: passed, with 2,282 tests passing and 209 skipped across 547 passing
  files and 49 skipped files. No test or suite failed. Database suites gated by
  environment variables are covered separately by the PostgreSQL runs above.
- `git diff --check`: passed.

## Acceptance and rollout boundary

The implementation satisfies the agreed task ownership, separate reviewer
submissions, shared current documents, and explicit retention rules according to
the focused and PostgreSQL evidence above. Repository-wide code validation is
accepted as passing with the existing lint warnings and documented test skips.
This acceptance covers implementation and automated checks; it does not assert
deployment or browser acceptance.

Migration 0163 has not been applied to the running application database. The
application has not been rebuilt or redeployed in Docker. No authenticated browser
walkthrough has been performed. Apply the migration together with the application
update before using the new task scoring representation.
