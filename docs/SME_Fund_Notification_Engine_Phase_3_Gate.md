# Notification Engine Phase 3 Gate Record

Date: 2026-09-27

## Completed scope

- Added a notification-owned, transaction-aware occurrence service and
  repository. The service strictly validates the authoritative event context
  and approved recipient snapshot shape before persistence.
- Normalized and deduplicated recipient email addresses before delivery-intent
  insertion while retaining the original trimmed email, display name, user ID,
  recipient type, and resolution path snapshots.
- Used the caller-provided Drizzle transaction for event configuration reads,
  occurrence insertion, replay lookup, and delivery-intent insertion.
- Made occurrence replay idempotent through the existing event-key and
  occurrence-key constraint. A replay returns the persisted occurrence and
  does not insert another delivery.
- Recorded disabled events, rules, or channels as completed occurrences with
  no delivery work.
- Integrated `application.submitted` into the existing application submission
  transaction using the persisted application owner, applicant profile,
  funding opportunity, workflow instance, correlation, and submission command
  data.
- Integrated `workflow.task.assigned` once at the shared stage-activation
  boundary used by initial and transition-driven stage activation.
- Grouped all tasks from one activation into one occurrence, snapshotted each
  distinct assignee from PostgreSQL, and created one delivery intent per
  normalized recipient address. Unassigned tasks are excluded and an entirely
  unassigned activation creates no invalid occurrence.
- Kept SMTP, message rendering, dispatch, retry, and processor behavior out of
  the business transactions.

## Deferred scope

All Phase 4 and later work remains deferred, including SMTP configuration,
Gmail delivery, concurrent work claiming, dispatch, retry scheduling,
processor authentication, delivery administration, and operational recovery.

## Migration evidence

- Phase 3 required no schema change. It uses the notification outbox,
  deliveries, event-rule, recipient, and channel tables delivered by Phase 1.
- Applied all Drizzle migrations to a clean disposable PostgreSQL 16 database.
- The notification database runner now executes the foundation and occurrence
  suites in separate processes so each suite owns its database connection
  lifecycle.
- The disposable database and PostgreSQL container were removed after the
  verification run.

## Automated and manual test evidence

- Focused notification, submission, stage-activation, task-grouping, and
  repository unit tests: 22 passed.
- Notification PostgreSQL foundation tests: 7 passed.
- Transactional occurrence PostgreSQL tests: 3 passed. They verified a
  successful write, normalized-email deduplication, idempotent replay,
  surrounding-transaction rollback, and rollback of an earlier business write
  when context validation fails.
- The existing application-submission integration assertions now require two
  pending occurrences and two delivery intents, verify the trusted owner and
  assigned-task snapshots, and require zero occurrences after readiness
  failure or rollback.
- The isolated PostgreSQL assertions inspected pending occurrence and delivery
  counts without invoking a sender. Manual source review confirmed that no
  SMTP configuration, adapter, or send call enters either business
  transaction.
- The full Vitest suite was executed. Seven unrelated existing UI assertions
  failed in status-badge, workflow-task-actions,
  workflow-action-configuration, and workflow-task-decision-dialog tests.
  None of those source or test files is part of Phase 3.

## Repository gates

- Architecture boundary gate: passed for 1,062 source files.
- Form architecture gate: passed for 1,062 source files.
- Every Phase 3 implementation and test file is within its applicable line
  limit. The touched application submission integration test is 299 lines.
- Repository-wide file-size gate remains blocked only by the unrelated
  existing `tests/unit/funding-calls/ServerFundingCallService.test.ts` at 303
  lines against the gate's 300-line test threshold.
- Lint: passed with no errors and 25 existing warnings outside the Phase 3
  implementation.
- Type-check: passed.
- Production build: passed.
- Whitespace check: passed.
- Touched Phase 3 code has no import from the forbidden capabilities file and
  no SMTP or Nodemailer dependency.

## Known limitations

- Delivery processing is intentionally absent until Phase 4, so captured
  delivery intents remain pending.
- The repository's broader application database runner executes stateful test
  files concurrently against one database and produces unrelated fixture
  collisions. Running the application-submission file alone also encounters
  an existing readiness-fixture failure before submission. Phase 3 therefore
  records its atomicity evidence in the isolated notification occurrence
  PostgreSQL suite and its application/workflow boundary evidence in focused
  unit tests and submission assertions.
- End-to-end manual submission through the existing application fixture could
  not proceed past that baseline readiness failure; this limitation is stated
  rather than being reported as a successful manual submission.
- The unrelated full-suite UI failures and pre-existing funding-call test file
  limit remain outside this phase and were not refactored.

## Phase acceptance

Phase 3 transactional event capture is accepted. Both approved events are
wired to their existing business transactions, occurrence and delivery intent
writes are validated and idempotent, recipient snapshots are immutable and
deduplicated, rollback behavior is proven against PostgreSQL, and no SMTP work
occurs in a business transaction. The recorded repository-baseline exceptions
are outside this phase and were intentionally left unchanged.
