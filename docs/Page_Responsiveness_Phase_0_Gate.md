# Page responsiveness phase 0

Date: 4 October 2026. Owner and engineering reviewer: Codex.
Revision: working tree based on da025565. Entry: governing plan and structure
contract reviewed; user requested phases 0–3 and baseline-failure repairs.

## Scope and decisions

The two dashboards and two application detail routes are the implementation
scope. Both application lists are measurement controls. Public CMS and release
phase 4 remain outside this change.

- Dashboard pages currently await authenticated actors and dashboard services.
  Applicant service already reads its projection and urgent RFIs concurrently;
  admin uses one SQL projection with all/assigned/none visibility.
- Staff detail awaits its audited primary projection before workflow/RFI reads.
  Applicant detail waits for its audited primary projection and authorized RFIs.
- Application lists already use browser queries after page authorization.
- Authentication and portal access remain in protected layouts. The business
  delay experiment locks only app_applications in an isolated PostgreSQL
  database, leaving user/identity/permission reads independent.
- Reuse the shell, PageShell, QueryProvider, PortalErrorState, loading primitives,
  existing application APIs, workflow-progress API and authorized services.

Phase 1 moves the reusable shell, navigation, capability context, QueryProvider,
logout, loading and error UI from components/layout to shared/ui/portal.
Rename the affected applicant route-group ancestor to (portal), updating direct
consumers/tests. Public URLs and root-layout ownership remain the same. This is
one route-group placement migration; sibling route bodies remain untouched.

Phase 2 adds GET /api/dashboard/applicant and /api/dashboard/staff?period=30,
DashboardSchemas under modules/dashboard/api, ClientDashboardService and UI
query hooks. Move the applicant dashboard compositions into modules/dashboard/ui.
Keep existing backend dashboard services and SQL projections.

Phase 3 reuses staff /api/admin/applications/[id]/detail and workflow-progress.
Add GET /api/applications/[id]/read-view and /information-requests with explicit
applicant/staff contracts. Reuse the existing applicant requests route and hook
at /api/portal/applications/[id]/requests; the new information-requests route
is staff-only. Routes resolve actors and call existing services.
Detail structures use confirmed permissions only. Secondary queries begin after
primary access succeeds; this deliberate dependency prevents mounting related
content on a denied primary read. Once authorized, RFI and progress reads run
independently with local loading/error/retry states.

Protected query caches are owned by an actor-and-permission-scoped provider,
cleared on disposal and logout. Forbidden/unauthenticated query responses erase
the denied query payload and are not retried. Detail keys include record IDs;
no previous-record placeholder data is used. Mutations invalidate detail,
workflow/RFI and dashboard reads through existing query prefixes.

## Numerical targets and measurement method

Use the same optimized production build command, isolated database, synthetic
Firebase identity, 1440x1000 Chromium viewport, three samples per route and
condition, and disabled speculative prefetch for before/after comparisons.
Cold means a fresh browser context/document; warm means hydrated in-portal
navigation; delayed means the same navigation with a 1500 ms business-table
lock. Authentication is real Firebase and PostgreSQL authorization.

Targets for the four converted routes:

- Delayed navigation feedback median <=150 ms.
- Delayed destination structure median <=250 ms and >=80% faster than baseline.
- Structure precedes completed business data by >=1000 ms under the delay.
- Warm full-data median regression <=20% or <=100 ms absolute; cold <=20% or
  <=250 ms absolute. Investigate breaches and revise before acceptance.
- List controls have no intentional business-query changes; compare them and
  report any measured regression.

Runner: scripts/development/performance/measure-page-responsiveness.mjs. Its
click timings include Playwright actionability/dispatch overhead. Cold structure
uses DOMContentLoaded, not first paint. Three samples support local engineering
comparison, not statistically robust production percentile claims.

## Baseline defects and disposition

Architecture passed (1335 sources); production build passed. Original file gate
failed at 316/300 lines, lint had six graph-ref errors, typecheck failed on an
incomplete actor fixture, and the default suite had 26 failures in ten files.
The user explicitly requested their repair.

The oversized test was split without changing limits. Graph hook values are
explicitly destructured; the actor fixture has the complete identity contract.
Stale assertions were corrected against current labels, table structure and
application-owned progress/RFI tabs. Missing historical stage inspection was
restored and its focused tests passed. A rich workflow-dialog browser simulation
requires 30 seconds on this constrained host; its focused test passes with that
explicit timeout. File limits, lint (17 pre-existing warnings) and typecheck now
pass. Final full-suite/build verification of repairs remains required at G1.

A setup experiment running the opt-in submission integration suite exposed an
outdated declaration fixture; it was not a passing integration run. Performance
fixtures use synthetic data and a valid immutable snapshot/hash in a separate
schema-only database. No applicant/user data is copied from the main database.

## Evidence and acceptance

Acceptance: accepted for implementation scope and numerical targets by Codex
(engineering review), 4 October 2026. All six routes have three production
samples for cold, warm and delayed conditions (54 observations), attached in
[baseline.json](page-responsiveness-evidence/baseline.json). Dashboard delayed
structure medians are 1559.9/1559.5 ms; staff/applicant details are
1934.3/1815.8 ms. Baseline quality defects have explicit repair dispositions
above; G1 still requires full post-repair verification. No successor gate is
accepted by this record.

Rollback: remove performance artifacts and stop/drop only the named isolated
performance runtime/database; reverse the focused repair diff if necessary.
No production deployment is performed.

## Verification commands and route evidence

Baseline commands: `npm run check:architecture` (exit 0), `npm run check:files`
(exit 1), `npm run lint` (exit 1), `npm run typecheck` (exit 2), `npm run test`
(exit 1), and `npm run build` (exit 0). Repair disposition is recorded above.
Measurement commands and environment are documented in
[the evidence README](page-responsiveness-evidence/README.md). Each of the six
routes has cold document entry, hydrated navigation from its listed source,
and a business-table-delay observation in baseline.json. The database lock
separates business blocking from identity/permission reads; Firebase verification
still contributes to root entry. This is not a isolated authentication benchmark.
