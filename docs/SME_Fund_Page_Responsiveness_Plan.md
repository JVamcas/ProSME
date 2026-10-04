# SME Fund Page Responsiveness Phased Implementation Plan

Status: Phases 0–2 implemented and engineering gates accepted on 4 October 2026.
The user instructed stopping after phase 2; phases 3 and 4 remain unstarted.
See [G0](Page_Responsiveness_Phase_0_Gate.md),
[G1](Page_Responsiveness_Phase_1_Gate.md) and
[G2](Page_Responsiveness_Phase_2_Gate.md) for acceptance and measured evidence.

Date: 3 October 2026

The portal and operations screens should respond visibly when a user clicks a
navigation link, show the destination's structure, and load business data into
that structure afterward. This plan maps the proposed changes to the existing
application and defines ordered implementation phases, mandatory gates, and
the evidence required for written acceptance.

The governing architecture remains the
[project structure contract](SME_Fund_Project_Structure_Contract_FINAL.md).
The product remains one Next.js application at `apps/platform`, with embedded
Payload CMS, Firebase authentication, and PostgreSQL application authorization.

## Baseline behavior before implementation

- Protected layouts await authentication and portal access checks before
  returning the authenticated shell.
- Both dashboard pages await their backend dashboard service before returning
  dashboard content.
- Some application lists already render their headings and controls after
  authorization, then fetch rows through TanStack Query.
- Application detail pages await business data and related workflow information
  before returning their detail views.
- Portal loading boundaries exist, but use a generic loading message rather
  than placeholders matching the destination's content.
- Sidebar links derive their active state from the current pathname and do not
  display a separate immediate navigation pending indicator.

These observations describe the code, not measured latency. Authentication,
database reads, route preparation, and browser work still need timing evidence
to determine their contribution to a particular slow navigation.

## Intended user experience

```text
Click a navigation link
    → Show immediate navigation feedback
    → Keep the existing sidebar and header visible within the same portal
    → Show the destination title and layout with skeleton placeholders
    → Request business data through a query hook
    → Authorize the request on the server and invoke the backend service
    → Replace placeholders with data, or show an error and retry action
```

The page structure must not wait for its business data. Placeholders must not
show fabricated zero counts, empty results, or protected record information.
Actions that require loaded data or confirmed permissions remain unavailable
until those prerequisites are satisfied.

Immediate feedback is the objective for in-app clicks, not a promise that a
fresh browser visit can bypass authentication, network latency, or JavaScript
loading. Initial protected entry can still await the layout's authentication
check. Navigation between different root layouts may also require a full load.

## Change map

Paths below are relative to `apps/platform/src`. Existing paths identify the
current implementation; proposed additions must follow the structure contract.

| Area | Existing location | Proposed change and ownership |
| --- | --- | --- |
| Navigation | `components/layout/portal-nav-list.tsx`, `components/layout/authenticated-portal-shell.tsx` | Add immediate pending feedback and clear it when navigation completes or fails. Move affected reusable navigation and shell UI toward `shared/ui`; preserve unrelated legacy files. |
| Loading boundaries | `app/(operations)/admin/loading.tsx`, `app/(applicant)/portal/loading.tsx`, audience loading boundaries | Reuse shared loading primitives and add destination-specific placeholders where needed. Shared primitives belong in `shared/ui`; feature skeleton compositions belong in their module's `ui`. |
| Admin dashboard | `app/(operations)/admin/page.tsx`, `modules/dashboard/ui/AdminDashboard.tsx` | Separate the static page structure from data-dependent metrics, charts, and panels. Render the structure before dashboard data resolves. |
| Applicant dashboard | `app/(applicant)/portal/page.tsx`, `components/applicant/dashboard/*` | Introduce the same structure-first behavior and migrate affected dashboard UI into `modules/dashboard/ui`, with clear audience ownership. |
| Dashboard browser requests | Existing `modules/dashboard` types and backend services | Add query hooks in `modules/dashboard/ui` and a flattened `modules/dashboard/ClientDashboardService.ts`. Hooks own keys, caching, invalidation, and loading state; the client service owns HTTP and response parsing. |
| Dashboard API | No dashboard API route found during review | Add validated dashboard read endpoints under `app/api`, using domain-oriented naming. Applicant and staff read contracts differ; finalize endpoint paths and response schemas during implementation. |
| Application details | `app/(operations)/admin/applications/[id]/page.tsx`, `app/(applicant)/portal/applications/[id]/page.tsx` | Render a generic detail structure, then load details and secondary workflow sections independently where their authorization and data dependencies permit. Reuse existing application hooks and APIs when their projections match. |
| Workflow sections | `modules/workflows/ui`, existing workflow read services | Give progress and information request sections their own loading and error presentation. Add transport support only where existing APIs cannot supply the required authorized projection. |
| Verification | `tests/unit`, `tests/integration`, `tests/e2e` | Cover navigation feedback, loading and error states, caching, and protected reads under the owning feature. Record performance observations separately from functional acceptance. |

The current applicant route group is named `(applicant)` while the target
contract names `(portal)`. This plan identifies current files accurately;
implementation must handle affected route placement under the contract without
performing an unrelated repository-wide migration.

## Data and authorization flow

Interactive server data must follow the existing required dependency chain:

```text
Client component
    → TanStack Query hook
    → ClientDashboardService or existing domain client service
    → Next.js API route
    → Server domain service
    → Repository or integration adapter
    → PostgreSQL or external system
```

Existing dashboard services and repositories should be reused wherever their
contracts fit. Moving the fetch to the browser does not require rewriting the
business rules or database model. Routes validate transport input, resolve the
actor, invoke services, and translate responses; they do not query tables.

Every protected read and write still checks canonical permission codes and the
target resource context on the server. Ownership and assignment checks remain
mandatory. Client visibility and cached data never grant authority. Cache keys
and reset behavior must prevent data reuse across accounts and authorization
contexts; sensitive query data must be cleared on logout or account changes.

Server rendering can remain where appropriate. A server-rendered section may
stream behind a loading boundary when interactive refetching is unnecessary.
Public CMS pages can be reviewed separately if measurements show they are slow.
Payload's internal `/cms` loading remains outside the platform query flow.

## Phase sequence and gate policy

```text
Phase 0  Baseline and scope                 → G0
Phase 1  Navigation and loading feedback    → G1
Phase 2  Dashboard data loading             → G2
Phase 3  Application detail data loading    → G3
Phase 4  Regression and release readiness   → G4
```

Every gate starts as **Not started**. Implementation, verification, and written
acceptance are distinct steps. Do not mark a phase complete or start its
successor until the preceding gate is accepted. Failed or incomplete checks
leave the gate open; documenting a failure does not turn it into a pass.
Written acceptance must identify the reviewer and supporting evidence.

Implementation gate records belong in `docs/` using the proposed filenames
below. Create them as work is performed, not as preapproved records. Each
phase must leave the application working and have a focused rollback path.
The original plan began with no accepted gates. Current execution status is
recorded below; acceptance evidence is held in each gate record.

| Phase | Entry requirement | Gate record | Current status |
| --- | --- | --- | --- |
| 0 | This plan and governing contract reviewed | `Page_Responsiveness_Phase_0_Gate.md` | Accepted |
| 1 | G0 accepted | `Page_Responsiveness_Phase_1_Gate.md` | Accepted |
| 2 | G1 accepted | `Page_Responsiveness_Phase_2_Gate.md` | Accepted |
| 3 | G2 accepted | `Page_Responsiveness_Phase_3_Gate.md` | Not started |
| 4 | G3 accepted | `Page_Responsiveness_Phase_4_Gate.md` | Not started |

## Phase 0 Baseline and implementation scope

**Goal:** Establish the actual blocking work, bounded scope, and measurable
acceptance targets before changing application behavior.

**Work and deliverables:**

1. Trace navigation, authentication, page rendering, API calls, and repositories
   for `/admin`, `/portal`, both application lists, and both application detail
   routes using synthetic test records.
2. Record production-mode cold and warm visits, repeat visits, and navigation
   with deliberately delayed business-data responses. Record environment,
   sample count, cache state, and click-to-feedback, click-to-structure, and
   click-to-data timings. Separate authentication time from business reads.
3. Inventory reusable query hooks, client services, API projections, loading
   primitives, and navigation components. Identify missing transport contracts.
4. Define exact files to change, related legacy files to migrate, API paths,
   cache identity/reset behavior, and section request dependencies. Resolve
   affected applicant route placement against the structure contract.
5. Specify numerical response targets, measurement method, and acceptable
   regression tolerance in G0. Identify the reviewer responsible for acceptance.
6. Run the existing quality checks and classify baseline failures. Unrelated
   failures require resolution or explicit documented disposition before a
   later gate can be accepted; they must never be reported as passing.

**G0 exit criteria and evidence:**

- Route inventory and request traces identify which work blocks each page.
- Baseline timing samples and reproduction instructions are attached.
- The affected file map, architecture decisions, and numerical targets are
  explicit; neither implementation scope nor performance targets remain TBD.
- Quality-check results and baseline defects are recorded.
- Written acceptance confirms the implementation scope and measurement targets.

## Phase 1 Navigation and loading feedback

**Goal:** Make navigation visibly respond while preserving the existing portal
shell during transitions within the same portal.

**Where:** The navigation and shell files in the change map, their affected
shared UI replacements, and admin/portal loading boundaries. Feature loading
compositions belong in the owning module's `ui` folder.

**Work and deliverables:**

1. Add pending feedback to navigation links. Preserve active-route semantics,
   keyboard access, modified clicks, and links opening in a new tab.
2. Handle completion, failure, superseded navigation, and rapid repeated clicks
   without leaving an indicator stuck on an old destination.
3. Add accessible skeleton placeholders that reflect destination structure.
   Keep the sidebar and header usable while route content loads.
4. Migrate only the reusable shell/navigation/loading code actually touched;
   update its consumers and remove replaced duplicates.

**G1 exit criteria and evidence:**

- Delayed-response browser evidence shows feedback before destination data
  completes and meets the G0 click-to-feedback target.
- Navigation tests cover normal and keyboard activation, modified clicks,
  back/forward history, failed navigation, and successive destinations.
- Placeholders do not represent loading as zero metrics or an empty result.
- Screenshots or recordings show desktop/mobile layout and accessible loading
  announcements; shell controls remain usable during same-portal transitions.
- Required quality checks and written acceptance are recorded.

This phase improves feedback; dashboard business data still blocks the existing
views until Phase 2 is accepted.

## Phase 2 Dashboard data loading

**Goal:** Both dashboards show their static structure before their business
read completes, using the required query and client-service flow.

**Where:** Both dashboard pages, `modules/dashboard/ui`,
`modules/dashboard/ClientDashboardService.ts`, dashboard transport schemas,
protected routes under `app/api`, and affected applicant dashboard components.

**Work and deliverables:**

1. Define and validate applicant/staff dashboard response contracts. Reuse
   existing backend services and projections; finalize routes from the G0 map.
2. Add API handlers that resolve the actor, validate input, invoke the existing
   authorized services, and translate errors. Preserve scope and audit behavior.
3. Add the client service and query hooks. Hooks own query keys, period filters,
   cache freshness, invalidation, and request state.
4. Separate titles and static layout from data-dependent cards, charts, and
   panels. Remove dashboard business-data awaits from page composition.
5. Provide loading, success, empty, error, retry, and background-refresh states.
   Migrate the affected applicant dashboard UI into `modules/dashboard/ui`.
6. Verify query isolation and clearing on logout/account changes. Keep permission
   enforcement on the server for initial requests and refetches.

**G2 exit criteria and evidence:**

- With delayed dashboard endpoints, both titles and skeleton structures render
  before the response; no metric appears as a fabricated zero while loading.
- Applicant and staff dashboards meet the G0 structure-response targets, with
  cold and warm timing evidence under comparable conditions.
- Period filtering, cached return visits, refetches, and retry work correctly.
- Protected endpoint/service tests cover allowed, denied, and applicable
  ownership/assignment mismatches without broadening permissions.
- Logout, account changes, and a subsequent denied request cannot reuse another
  account's dashboard cache or display protected stale data after denial.
- Required quality checks, migration of touched legacy UI, and written
  acceptance are recorded. Repository tests accompany material query changes.

## Phase 3 Application detail data loading

**Goal:** The selected admin and applicant application detail screens open with
structure first and load authorized detail sections without unnecessary waits.

**Where:** Both application detail pages, `modules/applications/ui`, existing
application hooks/client services/API routes, and affected workflow UI and
transport contracts.

**Work and deliverables:**

1. Reuse existing detail projections where they match the view. Add missing
   transport projections only through the owning module's service and API.
2. Render a generic detail structure while the application read is pending.
   Record-specific labels and action permissions require confirmed data.
3. Load details, information requests, and workflow progress concurrently only
   where each operation independently verifies its resource authorization.
   Keep genuine request dependencies explicit.
4. Add section-level loading and failure states. A secondary section failure
   must not discard successfully loaded application content.
5. Preserve invalid-ID, not-found, unauthorized, audited-read, and mutation
   behavior. Existing actions must invalidate the affected query data.

**G3 exit criteria and evidence:**

- Delayed detail responses leave the structure visible and meet G0 targets.
- Tests demonstrate independent section loading and required dependency order.
- Ownership/assignment mismatches deny access before protected reads or effects.
- Not-found, invalid-ID, authorization failure, retry, and action invalidation
  behave correctly. A denied primary detail read clears protected cached content
  and prevents related content from remaining visible in that screen.
- Switching records or accounts never displays a previous record as the new one.
- Existing read audit semantics are preserved and no N+1 reads are introduced.
- Required quality checks and written acceptance are recorded.

## Phase 4 Regression and release readiness

**Goal:** Verify the combined change against functional, security, performance,
architecture, and build requirements before recommending release.

**Work and deliverables:**

1. Repeat G0 measurements on the same routes, environment, and cache conditions.
   Include cold/warm visits, slow responses, failures, and cached return visits.
2. Exercise desktop/mobile, keyboard access, history navigation, rapid clicks,
   session expiry, logout/account changes, and relevant mutation flows.
3. Verify transitions between root layouts separately; document any remaining
   initial-entry authentication delay and other measured limitations.
4. Review the complete diff against the structure contract, permission model,
   dependency flow, readable-source rules, and file/function limits.
5. Record a rollback procedure for the focused change and any deployment
   prerequisites. Publication or deployment requires its own authorization.

**G4 exit criteria and evidence:**

- Comparison tables meet the agreed G0 thresholds and regression tolerance.
- Browser evidence proves structure renders before delayed business data and
  identifies remaining delays without claiming all navigation is instantaneous.
- All required checks below have recorded results; no failure is labeled a pass.
- Scope, deferred work, residual limitations, and rollback steps are documented.
- Written acceptance names the reviewer, date, accepted scope, and evidence.
  This establishes release readiness, not evidence of deployment.

## Required checks and gate record format

For each implementation phase, run from the repository root:

```text
npm run check:architecture
npm run check:files
npm run lint
npm run typecheck
npm run test
npm run build
```

Run targeted integration and browser tests relevant to the phase as well.
Record the exact commands, environment, exit results, and evidence locations.
Use synthetic records and do not store secrets or real applicant data in logs.
Each phase requires a production build, not just the final phase.

Every gate record must contain:

- **Identity:** Phase, revision/commit, date, implementation owner, and reviewer.
- **Scope:** Completed files/behaviors, related migrations, and deferred items.
- **Entry:** Evidence that the predecessor gate is accepted.
- **Criteria:** Each exit criterion marked met, unmet, or unverified with proof.
- **Checks:** Architecture, file limits, lint, types, tests, build, and browser
  results, including exact commands and unresolved failures.
- **Performance:** Measurements against G0 targets where applicable.
- **Limitations:** Baseline defects, new defects, and their disposition.
- **Rollback:** Steps and any prerequisites.
- **Acceptance:** Pending, rejected, or accepted; reviewer name, date, rationale,
  and links to the evidence. Only accepted gates permit phase completion.

## Scope and effort

Feedback alone is a small change. Dashboard conversion is moderate; converting
all screens would be larger. This plan bounds the initial conversion to the
two dashboards and selected application detail pages. G0 establishes the exact
file list and effort estimate. Public CMS optimization and other slow screens
require a separate scoped extension based on measurements.

Phases 0–2 have written engineering acceptance in their linked gate records.
Phase 3 was not started; detail page bodies retain their original behavior.
Phase 4 release readiness and deployment are outside this accepted scope.
