# R1 and R2 website report persistence and delivery

Recorded: 2026-10-07. Implementation and focused verification are complete.
Live browser, GA-to-email reconciliation, SMTP receipt, deployment and written
phase acceptance remain pending. D1 was accepted by the user before this work.

## Implemented behavior

- Saved report history is at `/admin/reports/website`; immutable report detail is
  at `/admin/reports/website/{reportId}`. History has five columns: Period,
  Frequency, Generation, Email delivery and Notes, with bounded SQL pagination
  and All reports, Bi-weekly and Monthly views.
- Schedule and designated-recipient configuration is at
  `/admin/reports/settings`, under the Reporting sidebar section, as requested.
  Both schedules start disabled. The first period start, property-local send
  time, finalization delay and enablement are configurable. R1 uses consecutive
  14-day periods; R2 uses complete calendar months. Dates cannot precede the
  configured GA collection start. An existing history fixes the period anchor;
  pending runs pin their source configuration and timing.
- The existing scheduler container invokes the protected reporting processor.
  The processor handles at most one due period per invocation, queues the exact
  period's D1 source queries, waits for completed aggregates fetched after its
  finalization time and retries pending work. Missing or failed sources do not
  become zero-valued reports. A pending period prevents that schedule advancing.
- Finalization captures the existing notification occurrence, pins the published
  email template, stores the normalized snapshot and advances the period cursor
  in one transaction. A unique schedule/period identity, leases, ordered locks
  and recovery prevent duplicate persisted reports and occurrences. PostgreSQL
  rejects subsequent updates or deletion of generated reports.
- Saved reports reuse D1 metrics and charts and include ordered funnel results,
  top pages and funding calls, Namibia regions, journeys, eligibility results
  and source coverage notes. Saved reads work during a GA configuration outage.
- HTML and plain-text email summaries use the existing notification templates,
  escaping, outbox, dispatcher and delivery history. Existing notification event
  rules own the designated recipients. Active users must retain saved-report
  permission, the configured user/role designation and delivery eligibility
  before every send or retry. Template versions are pinned for report delivery.
- Canonical permissions independently protect saved reads and schedule updates.
  Recipient configuration retains the existing notification read/update
  permissions. Processor credentials remain separate from human permissions.

## Reuse and source organization

Pages and APIs compose feature use cases. Reporting schemas and repositories
live in the reporting module. Notification extensions live in notifications.
The screens reuse `PageShell`, `DataTable`, `Tabs`, `Pagination`, `GeneralButton`,
`FormDateInput`, `FormInput`, `Checkbox`, `QuerySection`, `PortalLoadingState`,
`PortalErrorState`, the existing Sonner toast API, D1 chart
components and the existing notification recipient drawer, action buttons and button links.
Forms use React Hook Form, Zod and `zodResolver`; hooks and client services own
browser server-state access. Affected components are formatted as readable
multiline source; history table and source table responsibilities have separate
files.

## Verification evidence

The repeatable migration is
`apps/platform/drizzle/0168_website_report_delivery.sql`. It was applied twice
against isolated PostgreSQL 16 schemas in a disposable local test container.
The application database was not migrated or changed for these tests.

| Check | Evidence |
| --- | --- |
| Architecture and form boundaries | Passed for 1,628 source files |
| File-size gate | Passed for 2,377 handwritten files |
| Type checking | `npm run typecheck --workspace @prosme/platform` passed |
| Lint | Passed with zero errors and 13 existing warnings outside this change |
| Focused services, policies, routes, presentation and notification regressions | 38 files, 215 tests passed |
| Actual PostgreSQL reporting persistence, recovery and D1 repository regressions | 4 files, 18 tests passed |
| Whitespace | `git diff HEAD --check` passed |

The PostgreSQL tests cover disabled schedules, bounded claims, concurrent pooled
connections, expired lease recovery, exact-period source readiness, source-query
failure, atomic rollback and restart, immutable snapshot enforcement, audit and
optimistic versions, pinned templates, recipient revocation and bounded history
filtering/pagination. Period tests cover 14-day boundaries, short months, year
changes, local send times and timezone conversion.

The broader reporting/notification run exposed an existing D1 assertion in
`WebsiteAnalyticsMetricCards.test.tsx` expecting “Comparison unavailable” while
the current component renders “--”. That unrelated D1 assertion was preserved.
The complete repository suite was not run. No production build was requested or
run. Browser, live GA and actual SMTP delivery checks are not claimed as passed.

## Activation and live acceptance

1. Apply the registered migration through the normal database migration process.
2. Confirm GA property, collection start and timezone; the existing scheduler
   credentials and existing notification email channel must be configured.
3. Grant saved-report read permission to intended recipients. In Report settings,
   configure designated active users or roles using the existing recipient drawer
   and enable the notification delivery rule. The migration seeds published
   report templates when an active system administrator exists; otherwise run
   the existing notification seed after administrator bootstrap.
4. Set each first period start, send time and finalization delay, then enable the
   intended schedule. For R2, choose the first day of a calendar month.
5. Verify a generated R1 and R2 report in the browser and reconcile their saved
   source aggregates, period, published-template summary and actual received
   email. Confirm delivery history and retry behavior in notifications, then
   record written phase acceptance.

SMTP remains at-least-once: a crash after a successful send but before recording
the receipt can result in a retry. Database idempotency does not establish
exactly-once delivery at the mail provider.
