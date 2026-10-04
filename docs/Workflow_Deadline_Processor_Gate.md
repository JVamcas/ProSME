# Workflow deadline processor acceptance record

Date: 2026-10-03

## Accepted implementation scope

One existing scheduler service invokes two independent asynchronous processors.
Each loop awaits its request and has its own interval and timeout. Slow requests,
timeouts, and repeated workflow failures do not stop notification delivery.
Shutdown aborts in-flight requests. Atomic heartbeat files report each loop's
health. Failed calls continue retrying; unhealthy status alone does not restart
a Docker container.

The workflow processor accepts only a service bearer credential and verifies
the canonical `workflow.deadline.all.process` PostgreSQL grant on the reserved
disabled System principal before reading runtime work and again per transaction.
It processes bounded SQL candidate projections, rechecks locked runtime state,
and atomically records lifecycle changes, system audits, notification occurrences,
and durable completion receipts. Competing processors skip locked workflows.
Failed actions roll back and receive a bounded exponential retry delay.

Accepted timed behavior:

- SLA breaches emit notifications and execute a configured task-bound automatic
  escalation when present. Ambiguous configuration fails without a partial write.
- RFI reminder offsets are measured from request creation. Expiry closes the
  request and applies its configured close, escalation, or return continuation.
  Automatic return requires one configured valid repeatable target stage.
- Date deferrals with `RESUME_ON_DATE` resume automatically when due.
- Hold review dates emit reminders and keep the stage held.
- Effective SLA deadlines merge overlapping hold, deferral, and RFI pauses.
  Work queue filtering, ordering, and pagination use that deadline. Cursor
  comparisons use the same millisecond precision as the HTTP projection.
- Notification defaults remain editable; migration and seed reruns preserve
  administrator changes to recipient/channel configuration.

Appeals and funding-call transfer automation are outside this acceptance scope.
No appeal lifecycle exists in the current application, and funding-call transfer
requires an explicit configured destination and continuation operation.

## Verification evidence

- Migration chain through `0149` applied successfully to disposable PostgreSQL 16.
- PostgreSQL regression suite: 15 tests passed. Includes all supported deadline
  kinds, configured RFI continuations, rollback/backoff, authorization denial,
  advisory lock contention, duplicate prevention, terminal workflow exclusion,
  batch limits, pause overlap, queue scope/order/cursor, and seed preservation.
- Focused scheduler/configuration/route/notification writer suites: 21 tests passed.
- Deadline notification rendering suite: 2 tests passed.
- Architecture and form boundary gates passed for 1,256 application source files.
- File-size gate passed for 1,758 handwritten files before this record and the
  final notification rendering test were added.

Final lint, type checking, production build, and full-suite results are recorded
below after completion. The full suite has two funding-opportunity card failures
associated with concurrent unrelated UI changes; those source changes are
preserved.

## Rollout and acceptance limits

Apply migration `0149_workflow_deadline_processor.sql` and rebuild the application
image before enabling the updated scheduler. The existing Docker startup wrapper
performs migrations before starting it. The workflow secret defaults to the
notification processor secret, or can be configured independently. See
`.env.example` and `README.md` for limits, intervals, and timeouts.

This record accepts the locally verified implementation scope. It does not claim
a production deployment, live email delivery, or browser acceptance. No migration
was applied to the application's existing local or production database.
