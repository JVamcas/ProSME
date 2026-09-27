# Notification Engine Phase 1 Gate Record

Date: 2026-09-27

## Completed scope

- Provider-neutral `EMAIL` channel, event, recipient, template, outbox,
  delivery, error, and audit contracts.
- Authoritative catalogues for `application.submitted` and
  `workflow.task.assigned`, including strict Zod context validation and allowed
  recipient types.
- Module-owned Drizzle schema and migration for notification channels, events,
  event rules, templates, template versions, outbox occurrences, and recipient
  deliveries.
- Database constraints for stable event and occurrence keys, one published
  template version per target, normalized recipient uniqueness, lifecycle
  states, foreign keys, and non-negative attempts.
- Due-work and history indexes.
- Repeatable application seed for the email channel, both initial events, and
  their required recipient rules. The seed contains no SMTP configuration or
  credentials and does not publish templates.
- Six fine-grained permissions in the canonical permissions catalogue, with
  default grants limited to the system-administrator role.
- Deny-by-default operation-to-permission policy and constrained audit actions
  and metadata.

## Deferred scope

All Phase 2 and later work remains deferred, including template rendering and
import, business-event capture, recipient resolution, SMTP, outbox processing,
administration routes and UI, delivery retry execution, and production rollout.

## Migration and seed evidence

- Applied all Drizzle migrations, including
  `0117_notification_foundation.sql`, to a clean disposable PostgreSQL 16
  database.
- Ran the notification configuration seed twice in that database. The first
  run created one channel, two events, and two rules; the second created no
  records.
- Real PostgreSQL tests verified all seven tables, six canonical permissions,
  due-work indexes, duplicate event rejection, immutable event keys, duplicate
  occurrence rejection, and the delivery-history projection shape.
- The disposable database and container were removed after verification.

## Automated and manual test evidence

- Notification unit tests: 15 passed.
- Notification PostgreSQL integration tests: 5 passed.
- Full Vitest suite: 1,209 passed, 61 skipped, and 4 unrelated existing UI
  assertions failed. The failures are in `status-badge.test.tsx`,
  `workflow-action-configuration.test.tsx`, and
  `workflow-task-actions.test.tsx`; none of their source or test files were
  changed by Phase 1.
- Manual source review confirmed that the notification domain imports no
  React, Next.js, database client, or SMTP dependency; no SMTP credentials,
  rendered bodies, routes, UI, or business-event integration were added.

## Repository gates

- Architecture boundary gate: passed for 1,034 source files.
- Form architecture gate: passed for 1,034 source files.
- Phase 1 implementation and test files: within applicable line limits.
- Repository-wide file-size gate: blocked by the unrelated existing
  `tests/unit/funding-calls/ServerFundingCallService.test.ts` at 303 lines
  against the gate's 300-line test threshold.
- Lint: passed with no errors. It reported 22 existing warnings outside the
  Phase 1 files.
- Type-check: passed.
- Production build: passed.
- Whitespace check: passed.

## Known limitations

- Notification templates are not yet imported or published.
- Notification occurrences are not yet captured from application submission or
  workflow task assignment.
- No messages are rendered or delivered, and no SMTP configuration is read.
- The repository-wide test and file-size gates retain the unrelated baseline
  exceptions recorded above.

## Phase acceptance

Phase 1 notification foundation and governance scope is accepted. Its domain,
persistence, seed, permission, audit, and focused test requirements are
complete. The recorded repository-baseline exceptions are outside this phase
and were intentionally not refactored.

