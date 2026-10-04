# Page responsiveness phase 3

Date: 4 October 2026. Implementation owner and engineering reviewer: Codex.
Revision: working tree based on 5f1a95eb. Entry: G2 is accepted; the user explicitly
requested phase 3 after the Firebase verification change. Its separate
[authentication acceptance](Firebase_Authentication_Latency_Change.md) precedes
this work. Status: implemented and engineering gate accepted.

## Scope and implementation

Both protected application detail pages compose a client workspace after their
existing authenticated page/grant and UUID checks. Existing portal loading
boundaries remain; the workspace initial query state shows a generic title,
back navigation and accessible skeletons. No record labels, status, fabricated counts or mutation
actions appear before the primary authorized projection succeeds.

The staff workspace reuses GET /api/admin/applications/[id]/detail. The applicant
workspace adds GET /api/applications/[id]/read-view, invoking the existing own
read-view service. GET /api/applications/[id]/information-requests reuses the
existing staff all/assigned RFI service; applicant RFIs retain the existing
/api/portal/applications/[id]/requests endpoint. Workflow progress retains its
existing endpoint and contextual policy. No SQL, domain permission, immutable
snapshot or audit implementation is changed.

Secondary queries mount only after the primary access check succeeds. RFI and
progress reads then run independently, including when their tabs are hidden.
Each uses its own placeholder, error and retry state. A secondary failure leaves
the loaded overview available. Staff workflow grants and validated task context
are passed from the page; assigned access still requires the server's actual
assignment check. Applicant RFI visibility requires its existing specific grant.

Selected native list links preload only the primary query on Next onNavigate.
The destination hook shares its key, cancellation signal and 30-second freshness,
so selection and mounting produce one audited read. Native keyboard, modified
clicks and history remain Next behavior. Hover/speculative business reads are
not introduced. Detail links include the existing shared pending indicator.

Query keys include the application ID; no previous-record placeholder is used.
The existing actor/permission-scoped provider and denied-query eviction remain.
Primary 401/403/404 responses hide the overview and unmount related sections;
record-related RFI/progress caches are cancelled and removed. Submit, withdraw,
draft save/delete, task decisions and RFI responses invalidate the relevant
application, workflow and dashboard prefixes. Delete also removes record caches.

Application list UI and its browser hook move from components/applicant and
components/admin into modules/applications/ui/applicant and /staff. Application
and work-queue hooks move to their owning ui/use files. Workflow RFI hooks become
ui/rfi/useWorkflowRfi and its client service moves to the flattened module root.
Consumers import those paths; query-key constants are shared without importing
large mutation hooks. Staff filter fields now use React Hook Form and the
existing Zod filter schema, as required when migrating that component.

Browser regression testing found a narrow-screen dashboard grid expanded to
476 px with the longer synthetic application reference. An explicit single
minmax grid column bounds its mobile panels; the final browser gate verifies
that repair alongside both detail layouts. No unrelated dashboard behavior changes.

## Error and audit semantics

Malformed IDs still invoke Next notFound and display its 404 page. Both the
frozen pre-phase-3 and changed builds send HTTP 200 for that streamed document;
404 remains the visible result. Unknown valid IDs now receive the generic
initial structure, then an API 404/error with retry/back navigation. The document
may have already committed HTTP 200. Ownership/assignment mismatches return no
record; the underlying audited snapshot read is never reached when access fails.
This distinction is inherent to the requested structure-before-data rendering.

Existing service/repository policy tests remain, including snapshot scope and
assigned progress checks. Nine additional real Firebase/isolated PostgreSQL
HTTP probes verify owner/all allowed reads, another account's owner/staff 404s,
empty scoped RFI projections, denied assigned progress and a disabled PostgreSQL
account (403 despite a valid Firebase session). They use two
disposable identities; no real applicant records are used.

## Performance and revision

The first five-sample paired run met structure targets but breached warm full-data
regression tolerance: staff 182.7 → 407.3 ms; applicant 152.5 → 417.0 ms. It is
retained as [initial evidence](page-responsiveness-evidence/phase-3-initial.json).
The additional nearest detail loading boundaries introduced React's 300 ms
fallback throttle on these fast reads (confirmed in the installed React DOM
implementation). Removing those redundant boundaries retains the existing portal
boundaries and the workspace's own pending skeleton. The revised warm follow-up
and final full comparison confirm that the penalty is removed.

The [final raw comparison](page-responsiveness-evidence/phase-3-final.json) has
60 observations: five per audience/condition/build, alternating build order.
The [summary](page-responsiveness-evidence/phase-3-summary.json) verifies every
numerical target against both the auth-optimized reference and original G0.

| Audience / condition | Auth-optimized reference structure / data | Final structure / data | Original G0 data |
| --- | ---: | ---: | ---: |
| Staff cold | 273.9 / 500.3 ms | 96.7 / 543.9 ms | 2898.4 ms |
| Staff warm | 211.6 / 211.6 ms | 163.3 / 163.3 ms | 1175.8 ms |
| Staff delayed | 1626.1 / 1626.1 ms | 113.2 / 1562.0 ms | 1934.3 ms |
| Applicant cold | 192.8 / 450.8 ms | 146.8 / 494.3 ms | 2189.5 ms |
| Applicant warm | 138.4 / 138.4 ms | 145.8 / 145.8 ms | 905.2 ms |
| Applicant delayed | 1578.2 / 1578.2 ms | 112.7 / 1548.6 ms | 1815.8 ms |

Delayed structure is 93.0%/92.9% faster than the already auth-optimized reference,
and 94.1%/93.8% faster than G0 (staff/applicant). Feedback medians are 26.5/28.3 ms,
under 150 ms; structure is under 250 ms and precedes data by 1444.1/1434.6 ms,
above the required 1000 ms. Warm full-data difference is -48.3/+7.4 ms versus the
matched reference; cold difference is +43.6/+43.4 ms. All meet the agreed
20% or absolute tolerance. Versus the original G0, warm data is approximately
86%/84% faster and cold data approximately 81%/77% faster; this combined gain
includes the separately accepted Firebase change.

List controls have no material regression: staff cold 454.1 → 510.3 ms,
warm 412.2 → 418.7 ms; applicant cold 469.6 → 445.4 ms, warm 414.4 → 418.7 ms.
These three-sample controls precede the detail-only boundary revision. All
remain within G0 tolerance; no list SQL changed. Runtime timing-only logs retain
651 successful normal verifications below 100 ms with median 0.58 ms; five verifications of 100 ms or more are retained separately rather than
included in that warm figure. The paired real-SDK
benchmark remains the direct before/after authentication-policy evidence.

## Checks and numerical evidence

Architecture/form boundaries (1367 source files), file limits (1969 handwritten
files), lint (zero errors; 16 existing warnings), production build and generated
TypeScript checks pass. The final enabled suite passes: 519 files/2133 tests;
44 files/178 existing opt-in tests are skipped. All 14 browser tests pass.
The focused changed-feature suite passes (six files/30 tests). Commands are run from
repository root unless specified:

- npm run check:architecture; npm run check:files; npm run lint.
- npm run build, then npm run typecheck using generated route types.
- npm test; focused application workspace/route/invalidation/page/list tests.
- npm run test:public --workspace @prosme/platform -- --config
  playwright.responsiveness.config.ts, with private synthetic session and Chromium
  library environment against the isolated production server.
- scripts/development/performance/measure-page-responsiveness.mjs, alternating
  current/reference targets using the same synthetic DB/session. Cold, warm and
  1500 ms application-table-delay conditions retain all raw observations.

The reference is the frozen **G2 plus accepted Firebase optimization** build,
not the original G0 revision. This isolates phase 3's rendering improvement from
Firebase latency reduction. Original G0 figures are also reported separately.
Cold means a fresh browser document on a warmed server, not cold certificates.
Local samples do not establish production percentiles or load capacity.

## Rollback and acceptance

Rollback both detail pages/workspaces and their query/client
transport additions together. Restore migrated hooks/list UI and consumers;
reverse shared invalidation changes and the mobile grid repair. Firebase policy
has its own focused rollback in its change record. No schema migration is needed.

Criteria: structure/feedback and full-data tolerance met by the final comparison;
section independence and access-before-secondary ordering met by workspace and
browser tests; allowed/denied/context mismatch and disabled actor checks met by
existing policy tests plus nine real HTTP probes; cache eviction, record/account
isolation and action invalidation met by the relevant query/provider/mutation
suites. Audited-read and immutable snapshot semantics are preserved by invoking
the unchanged services, with one primary request verified on native selection.
No new repository query or N+1 loop was introduced.

Written acceptance: Codex accepts G3 on 4 October 2026 because its performance,
functional, authorization, cache, migration, architecture, quality and production
build criteria are met. Earlier failed performance evidence remains attached;
the revised result, streaming error behavior and cold-certificate limitation are
explicit. The complete enabled suite and all 14 browser tests pass after the
performance revision. Phase 4 and deployment remain unstarted.

Changed paths are listed in [the file manifest](page-responsiveness-evidence/phase-3-files.json).
Logs are /tmp/phase3-*.log and /tmp/page-responsiveness/g3-*.log during review.
Disposable Firebase identities, isolated servers/database, copied reference build
and private credentials/session/traces are cleaned up after acceptance. Existing
local application, database, scheduler and migration-test containers remain untouched.
