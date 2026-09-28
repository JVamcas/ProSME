# Notification Engine Phase 5 Gate Record

Date: 2026-09-28

## Completed scope

- Added the WorkflowHub-aligned Notifications navigation entries and pages for
  Channels, Event Catalogs, Event Rules, and Delivery Operations.
- Added permission-protected catalog and rule projections. Catalog keys, event
  keys, catalog membership, recipient types, channel types, and template
  target identities remain read-only.
- Added optimistic-concurrency updates for catalog metadata and for the event
  rule aggregate. Event state, rule state, recipient required state, and
  channel bindings update in one transaction.
- Added immutable authorization audit entries for every successful catalog,
  rule-aggregate, and delivery-retry mutation.
- Added SQL filtering, sorting, pagination, counts, and narrow projections for
  delivery history. The response omits rendered bodies, provider credentials,
  and stored failure messages; it exposes only the stable failure code.
- Added an idempotent manual retry command. It row-locks the delivery, accepts
  only failed deliveries, schedules processor work, and never invokes SMTP.
- Added SQL processor-health aggregation for pending, processing, retrying,
  sent, and failed deliveries, the oldest pending time, and stale locks.
- Added migration `0123_notification_operations_indexes.sql` for status/history
  and normalized-recipient lookup indexes.

## Authorization and architecture evidence

- Configuration reads use `notifications.configuration.read`; configuration
  mutations use `notifications.configuration.update`.
- Delivery history and health use `notifications.delivery.read`; retry uses
  `notifications.delivery.retry`.
- All codes come from the canonical
  `src/auth/authorization/permissions` catalogue. Phase 5 code has no import
  from the legacy capabilities file.
- Routes only validate transport input, resolve the actor, invoke the server
  service, and translate the response. SQL remains in the notification
  infrastructure repository.
- Client state follows component to TanStack Query hook to frontend client
  service to API route to server service to repository.
- All Phase 5 forms use React Hook Form with Zod through `zodResolver`.

## Automated evidence

- Focused Phase 5 unit and UI tests: 18 passed. They cover allowed and denied
  operations, stale updates, immutable recipient identity, retry eligibility,
  idempotency, audit insertion, response redaction, and loading, error, and
  empty delivery-history states.
- The isolated PostgreSQL notification runner applied all migrations to a new
  disposable database and passed 18 tests: 7 foundation, 3 occurrence, 4
  dispatch-claiming, and 4 Phase 5 administration tests.
- The Phase 5 PostgreSQL tests verify optimistic concurrency, atomic rule
  mutation, audit persistence, SQL history filters and projection, aggregate
  health output, and two concurrent retry commands producing exactly one
  schedule and one audit record.
- The disposable notification test database was removed by the runner.
- Architecture boundary and form architecture gates passed for 1,095 source
  files.
- Type checking passed.
- Lint passed with no errors. The repository reports 25 pre-existing warnings
  outside the Phase 5 implementation.
- Production build passed and included all Phase 5 pages and API routes.
- Whitespace validation passed.

## Repository baseline exceptions

- The repository-wide Vitest run completed with 1,279 passing and 70 skipped
  tests. Fourteen unrelated existing assertions failed across status badge and
  workflow UI/domain tests. No failing file is part of Phase 5.
- The repository-wide file-size gate remains blocked by the existing
  `tests/unit/funding-calls/ServerFundingCallService.test.ts` at 303 lines
  against its 300-line test limit. Every Phase 5 file is within its applicable
  limit.

## Phase acceptance

Phase 5 administration and operational recovery is accepted. Authorized staff
can configure immutable notification catalog and rule identities safely,
inspect delivery outcomes and processor health without database access, and
schedule an eligible failed delivery for idempotent asynchronous retry. All
Phase 5 mutations are authorized, transactional, and audited.
