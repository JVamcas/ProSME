# Reporting Bootstrap Inventory

Date: 2026-10-08.
Companion to [the implementation plan](../SME_Fund_Reporting_Analytics_Implementation_Plan.md).
This is the planned seed catalogue. The three versioned datasets are now
implemented by phases 0–2 migrations; templates, configured reports and schedules
remain planned. See the [implementation gate](Reporting_Phases_0_2_Implementation_Gate.md).
The model/sidebar/removal direction is agreed; operational defaults below are
recommendations pending their implementation phase.

## 1. Local source evidence

Read-only aggregate queries during the 2026-10-08 planning conversation inspected
the running local PostgreSQL 16 database. No applicant values, names or contact
details were exported. These are local observations at that time, not production
coverage or delivery acceptance; recheck before implementation/activation.

| Source | Observed local evidence |
| --- | --- |
| Applications | 8 non-deleted lodged applications: 7 submitted, 1 withdrawn; 8 submission snapshots |
| Funding calls | 8 records |
| Workflow | 8 instances; 18 stage instances: 9 completed, 6 active, 3 cancelled |
| Tasks | 34: 20 completed, 6 pending, 3 in progress, 5 cancelled |
| Completed form responses | 9; five successful APPROVE decisions in APPROVAL_AWARD_DECISION each join completed approved-amount capture |
| Website sources | 5 query scopes and 48 source snapshots; some traffic, page and geography sources ready; most funnel/journey sources no-data; starter completion unavailable |
| Eligibility | 1 anonymous advisory check |
| Analytics contract | Four query scopes use d1-v2; one legacy scope uses d1-v1 |
| Analytics collection | Configured collection start 2026-10-06; timezone Africa/Windhoek |
| Old reports | 0 saved runs in this local database |
| Old bi-weekly schedule | Enabled; anchor 2026-10-08; send time 09:00; finalization delay 48 hours |
| Old monthly schedule | Disabled; timezone/anchor not configured; timing defaults 09:00 and 48 hours |
| Old notification rules | Both website event/rule pairs enabled; zero designated recipient bindings |
| Indicators | PROJECT_INDICATORS exists in submitted values/form definitions; no structured reporting-period actual fields found |
| Chatbot | No interaction capture/schema found in repository or inspected database |

Requested website query bounds extend to September; that is not evidence of
collection before 6 October. October is partial coverage under this configuration.
November 2026 is the first complete calendar month; do not report October as fully
observed. A new environment must derive this from its own collection start.

Source code references:
[analytics storage](../../apps/platform/src/modules/reporting/infrastructure/reporting-website.schema.ts),
[application snapshots](../../apps/platform/src/modules/applications/infrastructure/application.schema.ts),
[workflow runtime](../../apps/platform/src/modules/workflows/infrastructure/workflow-runtime.schema.ts),
[approval/monitoring forms](../../apps/platform/src/modules/forms/domain/StandardFormCatalogue.ts),
[indicator definitions](../../apps/platform/src/modules/forms/domain/FundingApplicationForm.ts),
[notification dispatch](../../apps/platform/src/modules/notifications/application/ServerNotificationDispatchService.ts).
The [chatbot scope](../SME_Fund_AI_Chatbot_Client_Scope.md) records that exact
monthly metrics/format still need agreement.

## 2. Three developer-defined datasets

Each dataset installs a stable key/version, source dependencies, exposed tables
or SQL views, typed columns, joins/cardinalities and permission/resource scope.
The administrator catalogue is read-only. Views are part of a dataset, not
additional datasets, and do not expand permissions to their underlying tables.

| Dataset key/name | Underlying related sources | Approved join contracts |
| --- | --- | --- |
| website-analytics / Website Analytics | app_reporting_website_queries, app_reporting_website_source_snapshots, app_reporting_anonymous_eligibility_checks, app_funding_calls | query.query_key -> snapshot.query_key is 1:N by source_name; check.funding_call_id -> call.id is N:1 |
| application-data / Application Data | app_applications, app_application_submission_snapshots, app_funding_calls, app_form_versions and approved form-definition metadata | application.id -> snapshot.application_id is 1:1 for lodged applications; application.funding_opportunity_id -> call.id and snapshot.form_version_id -> version.id are N:1 |
| workflow-operations / Workflow Operations | applications/calls; app_workflow_instances, app_workflow_stage_instances/definitions, app_workflow_tasks, app_stage_task_definitions, app_form_responses, app_form_versions/definitions, app_workflow_decisions/action_executions; holds/RFIs/deferrals and restricted staff identity projection | application -> workflow 1:1; workflow -> stage iterations 1:N; stage -> tasks 1:N; response.workflow_task_id -> task.id; decision.task_id -> task.id and source_stage_instance_id -> stage.id |

Website projections expose exact-period summary, daily traffic, pages, geography,
call engagement, funnel, journeys and eligibility. JSON is unpacked in SQL with
typed columns. Retain property/timezone/period/scope/contract identity, state,
metadata and fetchedAt. Filter to d1-v2. Combine independent metric families with
UNION ALL or separately aggregated projections, never a cartesian join of pages,
regions and journeys. Website-wide traffic and Namibia geography remain explicitly
labelled even when call-scoped funnel/eligibility measures are selected.

Application projection preserves one row per submitted application. Use submitted
snapshot business/applicant/form values. Repeatable answers such as BUDGET_LINES,
TEAM_MEMBERS and PROJECT_INDICATORS require explicit flattening/aggregation
contracts; never join their expanded arrays into an application row and multiply
it. Export selected approved scalar answers by stable key and pinned form version.
Keep full dynamic-answer support available through deliberate SQL projections,
not a default blob export or an unreviewed arbitrary field catalogue.

Workflow projections expose one row per stage iteration, one per task and one
effective approval per application. Scope all joins by exact workflow/stage/form
versions. Pipeline counts distinct applications per active stage and discloses
parallel-stage overlap. Workload counts tasks rather than multiplying them by
form responses or decisions. Completion-user summaries use the recorded completing
actor, not just the task's current assignee.

Reuse WorkflowSlaDeadline and hold/RFI/deferral semantics. Merge overlapping pauses;
bound pause duration at run time for open work and at completion for completed
work. Distinguish gross elapsed age/turnaround from pause-adjusted elapsed time.
Neither measure is assumed to represent hours of hands-on effort.
Exclude cancelled/superseded tasks from active workload; retain unassigned work
as an explicit category.

## 3. Seven initial SQL templates

Each is an editable administrator template seeded initially by the system.
The listed view/result names are proposed contracts to implement and test,
not existing database views. Each template produces one typed SQL result set.
Order parameters explicitly for native $1/$2 binding; names below are UI labels.

| Template key | Dataset | SQL projection and result grain | Parameters |
| --- | --- | --- | --- |
| website-analytics | website-analytics | Exact-period metrics combined into section, dimension, metric, numericValue, unit, sourceState, fetchedAt and coverage fields; ordered tabular rows | startDate, endDate, timezone; property/contract/source scope resolved by server; initial reports are website-wide |
| application-export | application-data | One lodged application: reference, call, submittedAt, lifecycleStatus, submitted business name/region/sector, project title, requestedGrantAmount, totalProjectCost, applicantCofundingAmount and selected submitted scalar answers | startDate, endDate, timezone, fundingCallId?, lifecycleStatuses, formVersionId? |
| application-pipeline | workflow-operations | call, stageCode/name and distinct active application count; disclose parallel-stage overlap | fundingCallId?, stageCode?; runAt is server-owned |
| application-ageing | workflow-operations | One active stage iteration: reference, call, stage, iteration, activatedAt, grossAgeHours, pausedHours, activeElapsedHours | fundingCallId?, stageCode?, minimumAgeHours; runAt is server-owned |
| workflow-turnaround | workflow-operations | UNION of separately aggregated stage and completing-user summaries: level, call, stage/user identity, completedCount, averageElapsedHours, minimumElapsedHours, maximumElapsedHours and pause-adjusted measures | startDate, endDate, timezone, fundingCallId?, stageCode?, userId? |
| reviewer-workload | workflow-operations | Reviewer/call task totals: pending, inProgress, overdue, completedInPeriod and unassigned category | startDate, endDate, timezone, fundingCallId?, reviewerId?; runAt is server-owned |
| budget-commitments | workflow-operations | One call: envelope, effectiveCommittedAmount, remainingAmount, utilisationPercent and amount-coverage diagnostics | fundingCallId?; runAt is server-owned |

startDate/endDate are calendar dates, inclusive in report labels. SQL uses
[local start midnight, midnight after endDate) for timestamp predicates.
timezone is a validated IANA name fixed to the source/report configuration.
Optional IDs default to null for all resources within verified permission scope.
Resolve relative defaults before binding; never inject SQL expressions from
parameter values. Define monetary fields with exact numeric precision.

Accepted during implementation: count the latest award decision only when the
workflow is COMPLETED with terminal outcome APPROVED and the application remains
submitted. Withdrawals and a later rejection exclude the commitment. Select one
effective amount per application; do not sum historical approvals, recommended
payments or the call envelope repeated by joins. Missing required amounts make
commitment totals NULL with coverage diagnostics. PostgreSQL tests cover terminal
approval, withdrawal, later rejection and missing amounts. Template/report
publication and bootstrap remain later phases.

## 4. Eight configured reports and two schedules

Formats: default XLSX, with CSV available against the same output projection.
All reports retain the template version and resolved format on every run.
The defaults below are proposed policy; template parameter definitions validate
both report defaults and run overrides.

| Report key/name | Template | Default parameter resolution | Schedule and delivery |
| --- | --- | --- | --- |
| website-biweekly / Bi-weekly Website Analytics | website-analytics | Consecutive 14-day period; website-wide; source timezone | One bi-weekly schedule; success attachment to designated administrators |
| website-monthly / Monthly Website Analytics | website-analytics | Completed calendar month; website-wide; source timezone | One monthly schedule; success attachment to designated administrators |
| application-data-export / Application Data Export | application-export | Previous complete month; all permitted calls; submitted/withdrawn lodged records; any compatible form version | Manual; requester download; event recipients explicitly configurable |
| application-pipeline / Application Pipeline by Stage | application-pipeline | All permitted calls/stages; current run timestamp | Manual current snapshot; requester download |
| application-ageing / Application Ageing | application-ageing | All permitted calls/stages; minimumAgeHours=0; current run timestamp | Manual current snapshot; requester download |
| workflow-turnaround / Workflow Turnaround | workflow-turnaround | Previous complete month by completion timestamp; all permitted calls/stages/users | Manual; requester download |
| reviewer-workload / Reviewer Workload | reviewer-workload | Current open tasks plus completions in previous complete month; all permitted calls/reviewers | Manual; requester download |
| budget-commitments / Budget Commitments against Envelope | budget-commitments | All permitted calls; current run timestamp; terminal-approved latest awards excluding withdrawals | Manual; requester download; planned phase 5 bootstrap |

Manual website runs default to the latest completed configured reporting period.
If none exists, use collectionStart through yesterday with explicit partial
coverage, or report that no completed dates are available. Do not silently extend
before collectionStart. Snapshots represent state when executed; arbitrary
historical as-at reconstruction is outside this initial bootstrap.

Carry the observed bi-weekly anchor/cursor, timezone, 09:00 time and 48-hour delay
into explicit replacement configuration after refreshing the target environment
inventory. Preserve desired enablement as a configuration input; actual activation
requires validated sources, authorized execution owner and designated recipients.
These local settings do not authorize a deployment or immediate send.

Proposed monthly defaults are 09:00, 48-hour finalization delay and the GA timezone.
First full local period would be 2026-11-01 through 2026-11-30 under the observed
collection start. Keep monthly disabled until configured/verified. Partial October
can be generated manually and must state its coverage.
Operational reports start without schedules; the client has specified no cadence.
Each configured report nevertheless supports its own schedules.

## 5. Events and delivery bootstrap

| Event key | Seeded email template | Saved artifact |
| --- | --- | --- |
| reporting.generation.started | Report generation started | None; report/run/trigger/period metadata |
| reporting.generation.completed | Report generation completed | Generated XLSX or CSV attached |
| reporting.generation.failed | Report generation failed | Sanitized error text file attached |

These three email templates are separate from the seven SQL output templates.
Persist all three events; recipient configuration decides notification delivery.
No recipient addresses or guessed user/role bindings are seeded. Reuse existing
recipient controls with report-scoped routing, outbox and delivery history.
A website report cannot be considered delivered because its schedule is enabled;
the observed old website rules have zero recipients.

## 6. Remaining client outputs and phase decisions

| Item | Required next step |
| --- | --- |
| Outcome by reason code | Restore governed workflow reason-code capture, then define/seed this report; no free-text substitute |
| Indicator performance | Add stable indicator identities and typed period actuals linked to targets/units; monitoring ratings are not actuals |
| Monthly chatbot analytics | Implement interaction/unresolved-query capture first; agree metrics, audience and format before its dataset/template |
| D3 published statistics/chart export | Continue separately in CMS/public visualization scope; editable label/value statistics do not substitute operational outcomes |
| Effective budget commitments | Accepted terminal approval rule implemented and tested in phase 2; template publication remains phase 3/5 |
| SQL editor/backend parser | Server policy, parameter contract and editor foundation implemented; browser acceptance remains pending |
| Execution limits/export library | Query limits recorded in phase 2 gate; choose export library/private artifact streaming in phase 4 |
| Scheduled authorization owner | Configure an explicit active PostgreSQL principal with source/report permissions; processor secrets are not a dataset grant |
| Recipients and activation | Configure authorized recipients per report and verify source/attachment delivery; old local bindings are absent |

Historical local evidence informs implementation, not acceptance. Refresh schema,
history, cursors, recipients and collection coverage in every target environment.
No source data, runtime code, schedules, recipients or storage files are changed
by documenting this inventory.
