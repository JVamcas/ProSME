# Reporting phases 6–7 implementation evidence

Date: 2026-10-09.
Scope: schedules, lifecycle events and saved-file delivery in the existing
reporting and notification modules. Implementation evidence is recorded here;
phase acceptance and activation still require the live checks below and written
acceptance. No production build, deployment or real email send was performed.

## Implemented behavior

- Report detail composes the existing table, drawer, form fields and delivery
  history components. New schedule forms use React Hook Form and Zod. Client
  services and TanStack Query hooks own HTTP and cache state.
- The explicit reporting bootstrap preserves edited definitions and installs
  two disabled website schedules, three lifecycle email templates and disabled
  report-scoped event rules. It creates no recipients or permission grants.
- Schedules use an anchor as the counting-reference date and a frequency in
  calendar days. The first run is due at anchor plus frequency, with subsequent
  runs every configured interval, at the configured local generation time.
  The form starts with Anchor date, then Frequency (days). The two disabled
  bootstrap schedules use 14 and 30 days from collection start. No finalization
  delay applies. Website periods cannot precede collection.
- Manual form defaults and queued runs use the latest complete configured
  website period, with an explicit partial-coverage fallback when none exists.
  Scheduled and manual generation share pinned definitions and the same worker.
- Schedules claim leases with `FOR UPDATE SKIP LOCKED`, deduplicate each period
  and retain their cursor while generation prepares or runs. Terminal history
  permits the cursor to advance. Delivery failure does not block later periods.
  Explicit generation retries link a new attempt to its original immutable run.
- Exact-period preparation reuses D1 synchronization. Provider failures remain
  preparing; legitimate no-data and supported unavailable sources retain their
  states and notes. Runs retain source coverage metadata. A 24-hour preparation
  deadline produces a terminal failure and sanitized error file.
- The started, completed and failed lifecycle events are captured transactionally
  with run history and notification occurrences. File events are dispatched only
  after their output/error artifact has been saved and registered.
- Event subscriptions and recipients are managed in **Event Rules**. Report
  detail provides a scoped summary, navigation to Event Rules and scoped delivery
  history. There is one authoritative event/report rule with existing recipient
  and channel bindings; unrelated notification events keep their global rules.
- Occurrences retain report/rule identity and the selected published email
  template version. Delivery retries use that same version and saved file;
  publishing a newer template does not alter a pending report email.
- Before sending, the existing dispatcher rechecks active user, email, current
  user/role binding, event/rule activation and report/dataset/source permissions.
  File events additionally require run-download permission, matching artifact
  scope and a verified saved checksum. Attachment failure is visible in delivery
  history without changing generation state. SMTP retains at-least-once semantics.
- Report delivery history and retry authorization also apply through the global
  notification administration paths, using pinned run dataset permissions.

## Operational bounds and schema

| Concern | Implemented bound or policy |
| --- | --- |
| Schedule processing | At most four transitions/enqueues per tick; oldest due first |
| Report schedules | At most 20 per report, enforced transactionally |
| Schedule lease | 180 seconds; deferred claims retry after 60 seconds |
| Period edits | Existing settings immutable; enablement uses optimistic versions and preserves cursor/pending run |
| Source preparation | 24 hours per generation attempt |
| File attachment | 18 MiB before MIME encoding; bounded stream and 15-second read timeout |
| Generation | Existing phase 4 worker/export limits continue to apply |

Repeatable migrations `0179_reporting_schedules` and
`0180_reporting_notification_scope` add schedules, run metadata and scoped rule
and outbox identities. Migration `0181_reporting_optional_eligibility_scope`
fixes an empty optional funding-call UUID cast exposed by the exact-period
no-data export regression test. Schema definitions remain in their owning
module infrastructure folders. New permissions are in the canonical catalogue.
Migration `0182_reporting_day_frequency` replaces period rules with an integer
day frequency, converts existing biweekly/monthly settings to 14/30, removes
finalization delay, and preserves anchors and pinned run history. Existing monthly
cursors align to the anchor's new 30-day intervals while pending run references
remain intact. Previously queued periods retain their original dates; the first
new day-based period can overlap a calendar-month boundary during conversion.

## Automated evidence

The disposable PostgreSQL harness applies the full migration chain, reruns each
reporting migration at its schema version, clones isolated synthetic fixtures,
and removes the databases afterward. The fixture sender captures ordinary file
attachments for byte/checksum reconciliation; it does not contact SMTP.

Final database run: 76 tests passed across 17 test files, including full migration
chain and reporting migration repeatability checks.

- Reporting database suites cover period uniqueness, concurrent and expired
  claims, pending cursors, terminal recovery, owner revocation, manual/scheduled
  CSV parity, linked retries, exact-period source coverage and no invented zeros.
- Delivery suites reconcile sent CSV and error-file bytes with registered saved
  artifacts, verify pinned template versions after publication, and verify
  provider retries leave generation/run counts unchanged. They cover recipient
  removal, source/download revocation, corruption and cross-report retry denial.
- Event Rules tests verify three scoped rules per report, independent audiences,
  global-rule compatibility, source filtering, narrow edit permission, optimistic
  conflicts and a summary projection without recipient-option catalogues.
- Unit and route selection: 74 files, 486 tests passed, including calendar/year,
  leap-year, DST, invalid schedule input, attachment-policy and protected API
  checks. The broader selection exposed six pre-existing failures in the untouched
  `ReportParameterTable.test.tsx` and `WebsiteAnalyticsMetricCards.test.tsx`;
  these two suites are excluded from the passing focused selection.
- Architecture/form boundaries and file-size gates passed. Type checking passed;
  lint passed with zero errors and 13 existing warnings in unrelated files.
  A final focused UI/service rerun also passed 27 tests across four files.

Reproduction commands from repository root:

```sh
DATABASE_URL=<disposable-postgresql-url> node apps/platform/tests/scripts/run-reporting-database-tests.mjs
npm exec --workspace @prosme/platform -- vitest run --maxWorkers=1 tests/unit/notifications tests/unit/reporting tests/integration/reporting/WebsiteAnalyticsProcessorRoute.test.ts tests/integration/reporting/ReportDatasetRoute.test.ts --exclude tests/unit/reporting/ReportParameterTable.test.tsx --exclude tests/unit/reporting/WebsiteAnalyticsMetricCards.test.tsx
npm run check:architecture
npm run check:files
npm run lint
npm run typecheck
```

## Acceptance and activation still pending

Apply the migrations and invoke the explicit reporting bootstrap in the target
environment with its authorized bootstrap principal. Refresh intended anchors,
timezone, collection coverage, execution-owner grants and designated recipients.
Configure subscriptions in Event Rules and activate only the intended schedules.
The seed schedules remain disabled until that configuration is supplied.

Phase 8 still needs authenticated existing-browser review, live GA exact-period
coverage, private storage attachment retrieval, actual SMTP/file receipt
reconciliation, deployment/runtime evidence and written acceptance. Synthetic
database and sender tests establish local behavior, not those acceptance gates.

## Anchor and day-frequency correction

The user's clarified model supersedes the calendar-month/finalization-delay
schedule design. An anchor of 2026-10-09 with frequency 14 is due on 2026-10-23,
2026-11-06 and 2026-11-20. Frequency 30 is always 30 calendar days and accepts
any anchor date. Existing timezone, generation-time, authorization, leasing,
cursor recovery and Event Rules integration remain in use.

The initial implementation checks above are historical evidence. Correction
validation completed on 2026-10-09:

- Schedule form and recurrence tests: 13 tests passed across two files, covering
  anchor-relative first generation, arbitrary day frequencies, month/year/leap
  boundaries, DST and validation. The selected route/workspace/form/period run
  also passed 30 tests across four files before concurrent delivery UI edits.
- The full disposable PostgreSQL reporting harness passed 77 tests across
  18 files, including migration-chain and repeatability checks. After refining
  legacy cursor alignment, the final migration harness rerun passed four tests
  across two files and verified anchor-aligned conversion, pinned run history,
  pending references, cleared leases and repeated migration application.
- Type checking and lint passed with zero errors or warnings. Architecture and
  form boundaries passed for 1,747 source files; file-size checks passed for
  2,553 handwritten files. `git diff --check` passed.

The disposable PostgreSQL container was removed. No production build,
deployment, live source collection, browser acceptance or SMTP receipt check
was performed for this correction. Target environments must apply migration
`0182_reporting_day_frequency` before using the updated schedule code.
