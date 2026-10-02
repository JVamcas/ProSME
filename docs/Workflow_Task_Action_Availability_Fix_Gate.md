# Workflow task action availability fix

Date: 2026-10-03

## Accepted change

Task detail requests reached the workflow action availability repository, where
the task projection referenced the stage instance's workflow identifier without
joining its table. PostgreSQL rejected the query with `42P01`.

The task query now joins its owning stage by `stageInstances.id =
workflowTasks.stageInstanceId`. Existing task/stage filtering and
conflict-of-interest clearance checks remain in place. No schema or permission
change is required for this fix.

## Verification evidence

- A PostgreSQL regression test reproduced the container's `42P01` before the fix.
- All four final PostgreSQL tests pass against the isolated verification database.
  They cover the task projection, a cleared task belonging to another stage,
  an actor without clearance, and a stage outside the requested workflow.
  Fixture writes are rolled back.
- Architecture and form boundary checks pass for 1,256 source files.
- File-size check passes for 1,760 handwritten files, including a final rerun
  after this record was added.
- Repository lint finishes with zero errors and 17 existing warnings.
  Focused lint on both changed TypeScript files passes without warnings.
- Type checking passes.
- The production build passes using `ENVIRONMENT=local scripts/container/build.sh`.
- Full suite: 1,650 passed, 115 skipped, two failed. Both failures are in the
  existing funding-opportunity card tests and are also documented in the
  workflow deadline processor acceptance record. This is not a full-suite pass.

## Acceptance and rollout scope

The missing-join fix is accepted based on the reproduced failure and passing
PostgreSQL regression tests. The unrelated card test failures remain outside
this fix's acceptance scope.

The user explicitly authorized rebuilding and restarting the local stack with
all current workspace changes, including the pending workflow deadline work.

## Completed container rollout

- Docker production build and both image exports succeed.
- Application and Payload migrations exit successfully.
- Notification default seeding succeeds and preserves existing configuration.
- The app and scheduler both use image
  `sha256:62facb2f25dff16ee732be8c451ba53b6e157a9f5797d3a558e0d3a9f9820f5e`.
- App, scheduler, and database containers are healthy. The obsolete scheduler
  container was removed to prevent duplicate processing.
- HTTP `/api/health` returns 200 with application and database checks both `ok`.
- The workflow processor completes one claimed item with zero failures.

Rollout also exposes a separate notification configuration gap:
`workflow.hold.review-due` has no available published email template. One
delivery is recorded as failed with `NOTIFICATION_TEMPLATE_UNAVAILABLE`.
Seeding supplies configuration defaults, not administrator-published template
versions. This delivery was not manually retried, and no template was published.

The task SQL fix and local rollout are accepted. Whole-application acceptance
remains qualified by the two existing UI test failures and this notification
configuration gap. Authenticated task-detail HTTP behavior was not checked
without a staff session; query behavior is verified against PostgreSQL.
