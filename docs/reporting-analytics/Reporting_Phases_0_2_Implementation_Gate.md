# Reporting phases 0–2 implementation gate

Date: 2026-10-08.

Scope: phases 0–2 of the [implementation plan](../SME_Fund_Reporting_Analytics_Implementation_Plan.md).
This records workspace implementation and automated evidence. Written acceptance,
deployment, browser acceptance and activation are separate and remain pending.
Phases 3–8 are not implemented by this change.

## Implemented result

| Phase | Reviewable implementation |
| --- | --- |
| 0 | Existing source inventory, three-dataset model, legacy removal scope and later bootstrap dependencies retained; accepted commitment rule recorded |
| 1 | Old report pages, APIs, client/server services, repositories, navigation, permissions, notification generation/delivery wiring and seeds removed; D1 synchronization remains on the authenticated internal processor |
| 2 | Three immutable dataset versions, eight typed security-barrier views, canonical dataset/query permissions, protected dataset catalogue API, typed parameter/output contracts, PostgreSQL AST policy, restricted streaming executor and controlled SQL editor foundation |

New domain, infrastructure and UI code stays in `src/modules/reporting`.
Shared reporting pool bootstrap stays in `src/platform/database`; notification
retirement stays in the existing notification module and migration boundary.
No Report Definition page, template publication persistence, configured report,
Excel/CSV artifact, schedule or replacement lifecycle delivery is claimed here.

## Database retirement and continuity

Forward migrations 0170–0175 are registered in the existing Drizzle journal.
Old applied migrations are preserved. Migration 0170 requires old workers to
be stopped and refuses active report leases or PROCESSING legacy notification
occurrences. It renames legacy tables to historical archive names, preserving
generated snapshots, desired schedule enablement, anchors, timing and period
cursors. The existing generated-run immutability trigger remains effective.

Old event/template targets are disabled, obsolete report rules/permissions are
removed, and pending report notifications/deliveries are explicitly dead-lettered.
Sent deliveries and unrelated notification rules/outbox history remain intact.
There is no runtime adapter for the retired tables. Old route source files are
absent; actual deployed HTTP removal still depends on deploying this version.

The running local database was inspected with aggregate reads only: zero legacy
runs, active report leases and PROCESSING legacy report notifications were found.
The inventory retains the original local schedule inputs. No migration or
deployment was applied to that running application database.

Migration 0175 fixes an existing prerequisite: the workflow runtime records
successful completion with a terminal outcome, while the previous database
constraint rejected that combination. The replacement constraint permits
COMPLETED terminal outcomes with the required public-status object and retains
rejection/withdrawal constraints. The approved commitment fixture exercises this
through the complete existing migration chain.

## Dataset semantics and authorization

| Dataset/version | Projections and verified boundaries |
| --- | --- |
| website-analytics/1 | Exact configured property/timezone/collection start/period/call and d1-v2 panel scope; normalized metric families via UNION ALL; missing sources remain visible with NULL values and failure/unavailable state; genuine zero and geography ratio units preserved; anonymous eligibility counts use local half-open timestamp bounds |
| application-data/1 | One lodged application joined to its exact immutable submitted snapshot/form version; selected submitted business/scalar answers; repeatable groups never expand the row grain; numeric(18,2) money preserved without JavaScript floating-point conversion |
| workflow-operations/1 | Exact-version stage/task joins; recorded completing actor distinct from current assignee; overlapping scoped pauses merged and clipped to completion/server runAt; adjusted task deadlines; approval evidence, effective awards and call-level commitments |

Accepted user decision: count the latest award decision only when the workflow
is COMPLETED with terminal outcome APPROVED and the application remains submitted.
Withdrawals and a later rejection exclude the commitment. Missing required
amounts produce NULL financial totals with a missing-amount count; no effective
awards legitimately produce zero. Dataset versions cannot be edited in place.

The server checks active authentication, `reporting.dataset.read.all`,
`reporting.query.execute.all` and each dataset's source permissions before
execution. The database checks the actor's current PostgreSQL grants again.
Only `all` source projections are supported: narrower ownership/assignment grants
do not grant access to these datasets. Dataset/actor/property scope is supplied by
the server, independent of editable parameter values. Catalogue reads require
the dataset-read permission and expose metadata rather than application rows.

The NOLOGIN, NOINHERIT reader role receives SELECT only on the approved views.
Execution uses READ ONLY transactions and `pg_catalog` search path; parsed view
references are qualified with `public.` to prevent public operator/function
overloads. PostgreSQL migrations require authority to provision/grant this role.
No reporting principal, role membership, recipient or active schedule is seeded.

## Parser, parameters and execution limits

Server parser: `libpg-query@16.7.3`, matching PostgreSQL 16. One explicitly projected
SELECT is allowed, including supported read CTEs, joins, nested reads, grouping,
approved aggregates and UNION. Every nested relation, column, function, cast and
operator is checked. Unknown AST nodes fail closed. System catalog/base-table
access, cross-dataset reads, arbitrary functions, DML CTEs, recursive CTEs,
SELECT INTO, locks, extra statements and result wildcards are denied.

Native `$1`, `$2`, … values bind through `pg-cursor@2.15.3`. Metadata requires
unique named labels and consecutive positions; UUID/date/timestamp/exact decimal,
integer/boolean/timezone/text and bounded array values/defaults are validated.
Server runAt/source-timezone bindings cannot be overridden. PostgreSQL's approved
timezone built-in supports local calendar bounds. Actual output names and OIDs
are checked at publication validation and execution, including zero-row results.
Numeric, bigint, date and timestamptz values preserve their exact textual form.

| Limit | Value |
| --- | --- |
| SQL | 32 KiB UTF-8 |
| AST | 10,000 nodes; depth 40 |
| Parameters | 32; array values at most 100 items |
| Statement / lock timeout | 30 seconds / 1 second |
| Overall execution deadline | 60 seconds, including output consumption |
| Rows / output bytes | 100,000 / 25 MiB of serialized row batches |
| Cursor batch | 250 rows |
| Concurrency / dedicated pool | Two active executions/connections per application process |

Limits fail explicitly rather than returning a successful truncated result.
Output consumers receive the abort signal and must discard partial artifacts on
failure; persisted artifact handling belongs to phase 4. The byte budget is a row
stream budget, not an Excel/CSV attachment-size policy.

## Editor compatibility

Pinned pair: `monaco-sql-languages@1.2.1` and `monaco-editor@0.37.1`.
The application declares its runtime dependency; the workspace root pins the
same development peer so npm does not resolve the SQL contribution against an
incompatible newer peer. Both Monaco consumers resolve the same version. The
lockfile is updated; no optional formatter was added.

Verified: React 19 server rendering of the controlled shell without browser-only
imports; scalar native parameters and CTE diagnostics; invalid SQL diagnostics;
dataset/alias/typed-column/parameter completion; separate SQL/editor workers and
the editor bundled for the browser with esbuild. Browser bundling is not a Next.js
production build or a browser acceptance test.

Known upstream limitation: editor diagnostics incorrectly flag PostgreSQL
`= ANY($1::text[])`. The server accepts and structurally validates this syntax;
editor diagnostics remain advisory. The existing installed Chromium could not
launch because `libnspr4.so` is absent. No browser/system dependencies were
installed. Actual editor interactions and Next.js worker loading remain browser
acceptance work; no production build was run.

## Automated evidence

- Architecture and form boundary gates: passed for 1,624 source files.
- File-size gate: passed for 2,389 handwritten files; new implementations and
  tests remain within the active 400/300 limits and AGENTS function limits.
- Lint: zero errors; 13 existing warnings outside the changed reporting code.
- Type checking: passed after resolving the pinned Monaco environment type.
- PostgreSQL 16: 24 tests passed, including retirement refusal/rollback, repeat
  application, immutable history/metadata, submitted-snapshot grain/precision,
  task completion identity, overlap/deadline calculations, source coverage,
  terminal approval/withdrawal/latest rejection/missing amounts, output metadata,
  live grant revocation and restricted role/context checks. The complete migration
  chain and reporting migration reruns also passed.
- Reporting/notification regression selection: 375 tests passed; one unchanged
  `WebsiteAnalyticsMetricCards.test.tsx:72` expectation still requires the string
  “Comparison unavailable” while the current component renders `--`.
  Two service-test timeouts during parallel checks passed on a focused rerun.
  New parser, parameter, authorization, route, clean-slate, editor and execution
  tests passed, including row/byte failure, concurrency recovery and abort of an
  unresponsive output consumer.

Reproduce database verification against a disposable PostgreSQL cluster:

```bash
DATABASE_URL='<disposable PostgreSQL cluster URL>' \
  node apps/platform/tests/scripts/run-reporting-database-tests.mjs
```

The runner creates a uniquely named database, tests retirement against historical
fixtures before migration 0170, applies/reruns the remaining migrations, runs the
projection and D1 persistence/heatmap tests, then drops that test database.
Synthetic fixtures contain no real applicant values or exports.

Written acceptance remains pending. This gate establishes implementation and
automated evidence only; it does not establish deployed routes, live GA coverage,
SMTP delivery, private generated artifacts or schedule activation.
