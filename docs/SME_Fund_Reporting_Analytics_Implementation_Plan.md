# SME Fund Reporting and Analytics Implementation Plan

Date: 2026-10-08.

Status: phases 0–7 implemented in the workspace. Automated evidence, execution
limits and remaining acceptance boundaries are recorded in the
[phases 0–2 implementation gate](reporting-analytics/Reporting_Phases_0_2_Implementation_Gate.md)
and [phases 3–5 implementation gate](reporting-analytics/Reporting_Phases_3_5_Implementation_Gate.md),
with schedules and delivery evidence in the
[phases 6–7 implementation gate](reporting-analytics/Reporting_Phases_6_7_Implementation_Gate.md).
Phase completion still requires its own evidence and written acceptance.

This plan replaces the website-specific R1/R2 implementation with the agreed
dataset -> SQL template -> configured report -> run -> delivery model.
It supersedes the previous fixed report, separate Report settings page,
structured filter-builder proposal, and exclusions of SQL authoring/attachments.
The [old delivery gate](Website_Reports_R1_R2_Delivery_Gate.md) is historical
evidence, not acceptance of this replacement.
D1 analytics remains the accepted source/dashboard baseline, preserved in
[D1 Analytics Baseline](reporting-analytics/D1_Analytics_Baseline.md).

## 1. Scope and authority

Follow [AGENTS.md](../AGENTS.md) and the
[structure contract](SME_Fund_Project_Structure_Contract_FINAL.md).
Everything remains inside the existing application at apps/platform.
Reporting belongs to src/modules/reporting; notification extensions belong
to notifications; shared database bootstrap belongs to platform/database.

| Requirement | Planned treatment |
| --- | --- |
| R1: bi-weekly website analytics email | Configured report using the Website Analytics SQL template; 14-day schedule and generated attachment |
| R2: monthly website analytics email | Separate configured report using the same template; configurable day frequency, initially 30 days |
| R4: application export to Excel/CSV | Submitted-snapshot dataset and manually runnable report |
| D2: pipeline, ageing, turnaround, reviewer load, commitments | Five operational templates/reports using the Workflow Operations dataset |
| D2: outcomes by reason code | Deferred until workflow reason-code capture returns |
| D2: indicator performance | Deferred until structured period actuals exist |
| R3: monthly chatbot interaction analytics | Source dependency: chatbot interaction capture is absent |
| D3: public programme statistics and visualization exports | Separate CMS/public requirement; not added to the report authoring screens |
| D1: website analytics | Retain collection, synchronization, storage, dashboard and heatmap behavior |

Client sources: [Terms of Reference](client/Terms%20of%20Reference%20-2.pdf),
pages 7-9 and 12-13; [Workflow Specification](client/ME-Workflow-Engine-Specification.docx),
section 10; [Inception Report](client/Pro%20SME%20Project%20Inception%20Report.pdf),
pages 9 and 15. The client specifies outputs; this conversation establishes the
configurable implementation model. Do not describe SQL authoring as a separately
requested client feature. No new report charts, forecasts or ERP integration.

## 2. Agreed screens and sidebar

~~~text
ANALYTICS
  Website analytics     /admin/analytics/website

REPORTING
  Report Definition     /admin/reports/templates-definitions
  Reports               /admin/reports
~~~

The two reporting paths above are proposed route names. They remain under
app/(operations); unrelated navigation and route ownership stay intact.
Keep permission filtering, empty-group suppression, collapsed accessibility,
pending navigation and mobile behavior in the existing shared navigation.

Report Definition has two tabs, each using the existing DataTable:

- Datasets: system-bootstrapped catalogue; opening one displays approved tables
  or views, columns, types and join relationships. Administrators cannot edit
  dataset definitions or add arbitrary tables.
- Report Templates: searchable/paginated catalogue; opening one provides a
  dataset selector, SQL editor, parameter definitions and output-column metadata.
  Administrators author templates against exactly one dataset.

Reports is a searchable/paginated DataTable of configured reports, not generated
files. Opening a report at /admin/reports/{reportId} shows its selected template
version, default parameters, schedules, delivery configuration and Run report
action. Its Runs tab lists executions: datetime, user/system trigger, status,
rows generated, duration and output/error file access. A selected run can open
a detail drawer or nested detail route; this is not another sidebar entry.
Schedules and delivery are owned by this report detail page, not Report settings.

Reuse existing DataTable, Tabs, PageShell, GeneralButton, dialogs, form controls,
pagination and notification recipient controls. All handwritten forms, including
parameter configuration and manual run values, use React Hook Form, Zod and
zodResolver. Monaco's SQL value is a controlled form field. Do not create a
parallel input/table/dialog system.

## 3. Domain and persistence contracts

| Entity | Required responsibility and persisted identity |
| --- | --- |
| Dataset | Stable system key/version, name and required description, related exposed tables/views, typed columns, joins/cardinalities, permitted functions and authorization contract |
| Template/version | Name and required template description, dataset/version, SQL, typed ordered parameter definitions, output columns/types, supported formats, author and immutable published version |
| Report | Stable key/name and required description, selected published template version, parameter defaults, default format, execution-owner principal and report-level delivery configuration |
| Schedule | Belongs to one report; multiple schedules supported; counting-reference anchor date, frequency in days, timezone, generation time, cursor, enabled state and version |
| Run | Belongs to one report; optional schedule/version, template/dataset versions, actual parameters, resolved period, format, user/system trigger, idempotency identity, timestamps and row count |
| Run artifact | Private object reference, filename, MIME type, byte count, checksum and artifact kind: generated output or error file |
| Delivery | Existing notification occurrence/delivery identities referencing the report/run/artifact; retries and provider status remain notification-owned |

Proposed new tables are app_reporting_datasets, app_reporting_templates,
app_reporting_template_versions, app_reporting_reports,
app_reporting_report_schedules, app_reporting_report_runs and
app_reporting_run_artifacts. Confirm names against the actual schema before
migration. Avoid rebuilding the legacy frequency-unique schema under its old
name or maintaining a compatibility adapter. Dataset SQL views use descriptive
app_reporting_dataset_* names.

Every dataset, report template and configured report has a persisted, nonblank
description of up to 2,000 characters. Initial descriptions summarize the source,
result-grain and default-scope descriptions in the bootstrap inventory. Dataset
descriptions are developer-owned; administrators edit template descriptions in
the Details step and report descriptions in Configuration. Catalogues display
each description alongside its record.

A published template version is immutable; editing creates a draft/new version.
A report explicitly selects its version. Updating that selection affects future
runs. Store exact resolved inputs and source coverage on each run; previous runs
never change when defaults, schedules, SQL or datasets change.

Use run states QUEUED, PREPARING_SOURCE, RUNNING, SUCCEEDED and FAILED.
Generation success and delivery success are separate. Multi-record state/event
writes are transactional and audited; file storage is coordinated through the
run identity and recorded artifact reference, not assumed to join a DB transaction.

## 4. SQL editor and server execution

Use monaco-sql-languages with its PostgreSQL language contribution.
Its documented completionService accepts custom completion items; supply only
the selected dataset's tables/views, typed columns, aliases and join guidance.
It is an editor, not a dataset access policy or query execution engine.
[Official library documentation](https://github.com/DTStack/monaco-sql-languages)

Implement a focused compatibility check before installing exact pinned versions:
PostgreSQL parameters, React 19, Next.js client-only loading, workers, diagnostics
and dataset completion. The upstream README currently qualifies compatibility
with monaco-editor 0.37.1; choose and test a compatible pair rather than assuming
the newest versions work together. Commit the lockfile. Add no optional formatter
unless necessary for the agreed editor.

Use native PostgreSQL positional parameters ($1, $2, etc.) as the initial SQL
contract, with named labels/types/order in parameter metadata and editor
suggestions. Example labels are startDate, endDate, timezone and fundingCallId.
This proposed syntax must pass the compatibility check.
Bind values through the database driver. Parameters represent values, never
table names, column names, joins or executable SQL.
[PostgreSQL parameter execution](https://www.postgresql.org/docs/16/libpq-exec.html)

At publication and again at execution, parse the PostgreSQL SQL on the server
and validate one supported read query with an explicit result projection.
Permit SELECT and supported read-only CTEs, joins, grouping and aggregates within
the selected dataset. Validate every relation/column/function, including nested
queries and CTE bodies; reject data-modifying CTEs, extra statements, SELECT INTO,
locking clauses, arbitrary functions, system catalogs and cross-dataset access.
Use parsed structure, not keyword regexes or frontend diagnostics, as the policy.

Execute through a reporting repository with a restricted database role,
read-only transaction, explicit search path, server-owned resource scope,
statement/lock timeouts and bounded worker concurrency. Database privileges and
dataset views/RLS must enforce the permitted scope; a SQL author cannot choose
another actor or bypass ownership/assignment through editable parameters.
Read-only mode alone is insufficient to validate a user-authored query.
[PostgreSQL transaction rules](https://www.postgresql.org/docs/16/sql-set-transaction.html)

Dataset tables are approved projections, not broad access to user credentials,
review comments, documents or raw internal tables. Validate typed parameters,
defaults and output types server-side. Stream bounded output; exceeding row,
time or file-size limits fails clearly rather than silently truncating a report.
Choose and record concrete execution limits and the server parser in phase 2.

## 5. Bootstrap inventory and data semantics

The detailed catalogue, source joins, SQL-template results, parameter defaults,
schedules and local evidence are in
[Reporting Bootstrap Inventory](reporting-analytics/Reporting_Bootstrap_Inventory.md).
The initial inventory is 3 datasets, 7 SQL templates, 8 configured reports,
2 website schedules, 3 lifecycle events and 3 lifecycle email templates.

Dataset definitions are developer-owned and installed through repeatable
migrations plus the explicit reporting bootstrap. Seed initial templates and
report configurations with stable keys after an authorized bootstrap actor is
available. Normal startup must not initialize CMS content or recreate removed
website-specific reports.

Bootstrap is idempotent and transactional for related records. Updating a
system dataset is versioned; do not overwrite administrator-edited templates,
report defaults, recipients or schedules on rerun. Keep substantial seed SQL
and metadata in focused declarative seed resources, not giant services.
Unsupported reports remain recorded source dependencies, not runnable templates
against nonexistent tables.

## 6. Generation, scheduling and artifacts

Manual and scheduled requests create the same run type. A manual request has
a caller idempotency key and validated overrides. A scheduled run has a unique
report/schedule/resolved-period identity. Pin template/configuration versions and
parameters when the run is created, before asynchronous work begins.

An authenticated processor uses bounded claims, leases and recovery. It prepares
the exact required sources, records RUNNING and emits generation started once
per run, executes the SQL, and streams the Excel/CSV output to private storage.
On successful file persistence, atomically register the artifact, finalize the
run and capture the success event. A crash after storage upload is recovered
using the run's deterministic artifact identity; clean up orphaned temporary files.
If execution fails, persist failed-run diagnostics, retain a sanitized error
artifact, then capture the failure event. Persist the FAILED state even when
error storage is unavailable. Cover artifact-write failures explicitly: do not
claim an attachment exists when storage failed; retry persisting the error artifact
and recording its event idempotently.

Initial formats are XLSX and CSV; no chart/PDF reporting subsystem.
Preserve declared column order/types, numeric precision, timezone labels and
safe spreadsheet text handling. Include coverage and source availability in
website output; absent source data stays absent, never fabricated as zero.
The current DocumentStorage interface reads/writes Buffers; add focused stream
support in the existing storage integration for bounded report export, rather
than assuming streaming already exists or buffering arbitrarily large results.

Schedules use an anchor date as the counting reference and a frequency in days.
R1 initially uses 14 days; R2 initially uses 30 days. First generation is due
at anchor plus frequency, then at anchor plus two frequencies, and so on.
Each run covers its completed interval from the previous boundary through the
day before its generation date. Resolve calendar-day boundaries and generation
time in the configured timezone, then persist UTC timestamps. No additional
finalization delay applies; delivery follows success. Missing source refreshes
leave a run preparing/retryable, not a zero-filled successful report. Capture
the distinction between a legitimate no-data source and a failed source.
Reuse D1 synchronization for exact period/property/contract queries, rather than
letting administrator SQL call external APIs.

Process missed periods oldest first in bounded batches; keep a retryable source
failure's cursor pending. A terminal failed period has its failed run/error event
recorded before the schedule advances to its next period, preventing permanent
starvation. An explicit retry creates a new attempt linked to the original run;
worker crash recovery resumes the existing run without duplicate lifecycle events.
Delivery failures do not rerun SQL or hold later generation indefinitely.

## 7. Lifecycle notifications and delivery

| Proposed event key | Event payload and attachment |
| --- | --- |
| reporting.generation.started | Report/run identities, trigger/user, period and start time; no generated attachment |
| reporting.generation.completed | Report/run identities, completion time, rows, duration, output artifact reference; attach saved XLSX/CSV |
| reporting.generation.failed | Report/run identities, failure time and error-artifact reference; attach sanitized error file |

Seed all three event definitions and versioned HTML/plain-text email templates.
Template contexts carry validated scalar metadata and artifact identities, not
arbitrary HTML, SQL output blobs or applicant values. Events always exist in
run history; report delivery configuration determines their notification audience.
The required website success event emails designated administrators. For manual
reports the requester can download the output; optional event recipients are
explicit report configuration.

Manage event subscriptions and recipients in the existing Event Rules screen.
Report detail shows a scoped subscription summary, a link to Event Rules and
delivery history. Reuse existing
recipient types, outbox, rules, renderer, retry machinery and history; extend
report-scoped routing so the generic success event can serve different reports.
Extend notification rule identity to event plus report scope, retaining global
rules for unrelated events. A report/event selects one authoritative scoped rule;
its existing recipient/channel bindings own the audience. Capture that rule and
published email-template version on the occurrence. Report id in event context
must match the resolved scope, including on retry. Replace the current event-only
unique rule constraint through a repeatable migration and regression-test global
notification lookup as well as two reports using the same lifecycle event.
Keep one authoritative recipient configuration, not independent lists on report
and notification screens. Resolve each event's recipients per report and
revalidate active-user/report/dataset access before sending or retrying.

The SMTP sender already supports attachments, but dispatch currently supplies
only the branding logo. Extend attachment resolution to authorized run artifacts
and make inline cid optional for ordinary file attachments. Read files through
the existing private storage adapter; output/error downloads require permission
and target context checks. Email attachment limits must fail visibly in delivery
history without changing a successful run into failed generation.
SMTP is at-least-once; do not claim exactly-once external mail delivery.

## 8. Authorization, ownership and application flow

All permission definitions live in the canonical permissions directory.
Define granular dataset read, template read/create/update/publish, report
read/create/update/run, schedule update, delivery update and run read/download
operations. Use explicit all/assigned/own scopes only where their context is
implemented and tested. Do not replace them with role-name checks or broad manage.
A report grant does not automatically grant its dataset's applicant/reviewer data.
Check source scope before enqueue/execution, on output download and at delivery.
Use the report configuration owner as the scheduled authorization principal;
revalidate it rather than trusting a captured grant. The processor credential
authorizes worker transport, not unrestricted source-data access.

~~~text
Client view -> TanStack Query hook -> Client<Domain>Service
  -> app/api/reporting/* -> Server<Domain>Service
  -> reporting repository / storage adapter / notification use case
~~~

Use flattened ClientReportDefinitionService, ServerReportDefinitionService,
ClientReportService and ServerReportService, with focused generation, scheduler
and bootstrap use cases as needed. Repositories/schemas/execution policy stay in
reporting/infrastructure or domain as appropriate. Extend the architecture gate
to recognize approved reporting projection dependencies if necessary; do not
bypass it through indirection or broad exceptions.

Proposed APIs cover datasets, templates, reports, nested schedules/delivery,
run creation/history/detail and artifact downloads under /api/reporting.
Keep /api/internal/reporting/process authenticated; retain its D1
synchronization responsibility when adding the generic worker. Pages compose
views; transport routes validate/contextualize input and invoke services.
Use SQL projections and bounded pagination for catalogues/history.

## 9. Remove the old report implementation first

Phase 1 removes these runtime families rather than retaining them as a fallback:

- Pages: admin/reports/website, its report detail, and admin/reports/settings;
  sidebar entries Website reports and Report settings.
- APIs: /api/reporting/website-reports and /api/reporting/website-schedules
  including their nested detail/update routes.
- ClientWebsiteReportService, ServerWebsiteReportService,
  ServerWebsiteReportProcessorService, WebsiteReportSchemas, WebsiteReport
  domain/period/snapshot/summary code, WebsiteReport* repositories and report UI.
- WebsiteReport* notification seeds/templates/repositories/policies,
  NotificationWebsiteReportEvent and their catalogue/context/renderer wiring.
- Legacy report permissions, schema-index exports, obsolete fixtures/tests and
  report-specific bootstrap references after checking all actual references.

Keep D1 reporting-website/eligibility/heatmap schemas, collection services,
Google Analytics adapters, repositories, synchronization, dashboard and tracking.
Remove only the old generation branch from ServerReportingProcessorService.
Keep the shared scheduler, processor authentication, health-response contract,
notification engine, storage and application/workflow data.

Use forward migrations; never rewrite/delete already-applied migrations.
Inventory target-environment history, pending runs and notification references
before retiring app_reporting_schedules and app_reporting_runs.
Prevent new legacy claims and reconcile in-flight work before dropping tables.
Retain immutable historical evidence and shared notification records as needed;
remove obsolete configuration without deleting unrelated outbox/audit history.
No legacy runtime adapters are part of the new design.

Record the old anchor/cursor/timezone/timing and desired enablement as explicit
inputs to the new website configurations. This preserves reporting-period
continuity, not the old implementation. Recheck source/recipient readiness before
the new processor activates those schedules. The phases 0–2 implementation has
not migrated or deployed the running application database.

## 10. Phased implementation and acceptance

| Phase | Reviewable result | Required evidence before completion |
| --- | --- | --- |
| 0: plan | Current model, bootstrap inventory, removal scope and dependencies documented | Documentation review; no runtime implementation claimed |
| 1: clean slate | Old report UI/APIs/services/wiring removed; D1 processor still synchronizes | Reference audit; repeatable forward migration on isolated DB; analytics/notification regression checks; old routes no longer serve reports |
| 2: datasets and execution policy | Three versioned datasets, typed SQL views, server parser/parameter contract and restricted query executor | PostgreSQL join/projection/precision tests; denied relations/functions/CTEs; allowed/denied/context mismatch; editor compatibility; recorded limits |
| 3: Report Definition | Dataset read table and template table/editor, parameter schema, immutable publication | Editor diagnostics/completion; publication/validation/version conflicts; schema-driven form checks; protected API/service tests |
| 4: Reports and manual runs | Configured-report list/detail, defaults, Run action, Runs tab, persisted lifecycle events and private Excel/CSV/error artifacts | Real SQL-to-file reconciliation; zero rows; limit/storage failures; idempotency/concurrent claims/crash recovery; permission revocation/download tests |
| 5: bootstrap | Seven templates/eight reports installed via explicit idempotent seed | Dataset/template mapping and semantic fixture tests; seed rerun preserves edits; budget rule resolved; unsupported reports absent |
| 6: schedules | Two website schedules inside report detail, anchor plus frequency in days, exact-period preparation and bounded catch-up | 14-day/30-day/year/timezone boundaries; collection coverage; lease/cursor recovery; manual and scheduled generation parity |
| 7: events and delivery | Three lifecycle events, report-scoped recipient configuration and saved-file attachments | Actual email/file reconciliation; error file receipt; delivery retries do not regenerate; recipient revocation/attachment failure tests |
| 8: acceptance and activation | Complete approved inventory verified and intended schedules activated | Existing-browser review, live source coverage, private storage, SMTP and deployment evidence; written acceptance with remaining dependencies |

Each phase is independently reviewable; do not implement the entire system in
one unreviewed change. Run architecture/form and file-size gates, lint, typecheck
and appropriate policy/service/repository/route tests. Use actual isolated
PostgreSQL for material SQL/migration/concurrency changes. Run broader regressions
when the affected dependencies justify them. Never call focused fixtures live
acceptance. Record unrelated baseline failures explicitly.

Do not run a production build or install browser/system dependencies unless the
user explicitly requests it. Browser, live GA, SMTP, deployment and written
acceptance remain distinct from static/automated checks. Follow the active file
gate (400 implementation / 300 test lines) and AGENTS function limits; split
responsibilities and keep readable formatting.

The outstanding decisions and source dependencies are recorded in the inventory.
The accepted budget rule counts the latest award decision only for terminal
APPROVED workflows and submitted applications, excluding withdrawals. Phase 2
records SQL syntax compatibility and concrete execution limits in its gate;
operational defaults and activation remain subject to their later phases.

## 11. Historical documentation verification record

Recorded on 2026-10-08 for this documentation-only change:

- Local documentation checks passed for four files and 19 relative links,
  Markdown table/fence structure, bootstrap catalogue counts and preservation
  of the original D1 specification apart from its relocated image/sidebar link.
- Architecture and form boundary checks passed for 1,641 source files.
- File-size check passed for 2,404 handwritten files.
- Type checking passed. Lint completed with zero errors and 13 existing warnings
  in application files untouched by this change. Whitespace validation passed.

No application test suite, production build, browser, deployment or email send
was run for this documentation change. No implementation phase or live gate is
accepted by these checks; the completed plan is ready for review.
