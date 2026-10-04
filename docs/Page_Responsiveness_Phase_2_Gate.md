# Page responsiveness phase 2

Date: 4 October 2026. Revision: working tree based on da025565.
Owner and engineering reviewer: Codex. Entry: G1 accepted.
Acceptance: accepted by Codex, 4 October 2026, for phases 0–2 engineering scope.
The user explicitly instructed stopping after phase 2; phase 3 is not started.

## Scope

Both pages compose query-driven dashboard views without awaiting business data.
DashboardSchemas validates request periods and both response projections;
ClientDashboardService owns transport/parsing, and useDashboard owns keys,
cancellation and freshness. New protected GET /api/dashboard/staff?period=30
and /api/dashboard/applicant resolve actors and invoke the original scoped
services. Existing SQL projections are preserved; no material query changes.
Applicant dashboard compositions moved from components/applicant/dashboard to
modules/dashboard/ui/applicant, and replaced legacy copies were removed.

QueryProvider identities include actor, sorted permissions and roles; changing
identity disposes the previous client before rendering the new account.
Logout cancels and clears caches before transport. Denied/unauthenticated/missing
query responses erase protected cached payloads and are not retried. Query
errors render before data, so a denied background refresh cannot show stale
metrics. Network errors offer retry; successful empty projections retain their
truthful empty states. Periods use separate keys and cached return visits.

## Performance revision

[Initial conversion](page-responsiveness-evidence/phase-2-initial.json) missed G0:
structure was 348–408 ms and warm data regressed. Starting the selected query
through a domain hook at native Link activation overlaps API startup with route
preparation, reusing the destination query's in-flight promise/cache. Modified
clicks and cross-root transitions do not trigger that prefetch. Dashboard-shaped
loading boundaries expose the destination title early. Chart code loads
separately; labels, counts and empty states remain available independently.
A pathname guard retains generic placeholders for descendant destinations.

The guarded repeat initially failed full-data tolerances; its observations remain
in [phase-2-guard-repeat.json](page-responsiveness-evidence/phase-2-guard-repeat.json).
A separate production build of the original da025565 revision allowed alternating
current/reference samples against the same synthetic database. The
[diagnostic run](page-responsiveness-evidence/phase-2-replay-diagnostic.json)
identified duplicate first-document requests. Payload's withPayload integration
injected Critical-CH: Sec-CH-Prefers-Color-Scheme globally. Chromium restarted the
first authenticated document to supply that hint, repeating server authentication.

The configuration now scopes CMS theme negotiation to /cms/:path*, preserving
unrelated headers and CMS behavior. Authentication/revocation checks are unchanged.
The [final paired run](page-responsiveness-evidence/phase-2-final.json) includes
144 observations: nine samples per staff condition/build and applicant delayed
condition/build, plus 18 per applicant cold/warm condition/build. Two fixed
nine-sample follow-up sets retained all original observations. Build order
alternates and speculative prefetch is disabled. First-document replays disappear
in every revised-build cold sample; each makes one document request. Cold
structure improves 40% for staff and 51% for applicants against the matched reference.

| Median ms | Staff G0 → final | Applicant G0 → final |
| --- | ---: | ---: |
| Delayed structure | 1559.9 → 55.1 | 1559.5 → 58.9 |
| Delayed feedback | — → 55.1 | — → 58.9 |
| Warm structure | 729.9 → 60.5 | 716.1 → 68.5 |
| Warm data | 729.9 → 616.4 | 716.1 → 624.2 |
| Cold data | 2364.0 → 2249.9 | 2239.4 → 1648.2 |

Both dashboards meet the predeclared G0 structure, feedback and full-data limits.
Delayed structure improves about 96%, precedes data by over 1450 ms, and feedback
is below 150 ms. Warm full-data medians improve 15.5% for staff and 12.8% for
applicants against G0. Cold data improves 4.8% and 26.4% respectively.

The matched-reference medians are staff warm 644.4/current 616.4 ms and cold
2350.0/current 2249.9 ms; applicant warm 596.2/current 624.2 ms and cold
1632.8/current 1648.2 ms. All meet G0 regression tolerance. The original nine
applicant samples alone showed slower completion; fixed nine-sample cold and
warm confirmations demonstrated substantial external authentication variability.
All 18 observations per condition are included, rather than choosing the faster
run. The G0 baseline and thresholds have not been changed.

[Authentication diagnostics](page-responsiveness-evidence/phase-2-authentication.json)
match each warm request to its Firebase Admin verification. In the nine applicant
confirmation samples, current request median is 572.0 ms, verification 552.2 ms,
and per-request remainder 22.0 ms; original-build remainder is 25.8 ms. These
independent medians need not sum. The true flag performs revocation/disabled-user
verification through a Firebase user lookup. Session creation uses
verifyIdToken(idToken, true); protected page/API requests use
verifySessionCookie(cookie, true). Request-scoped React caching deduplicates
server-render checks, but a separate API request verifies independently.
No check was disabled or cached across requests. Cold protected entry and root
layout transitions retain authentication latency; local medians are not a
production percentile or load-test guarantee.

## Criteria and checks

- Contracts, scoped endpoint checks, response parsing and cancellation: met.
- Allowed/denied requests and assigned/own projection selection: met, existing
  service/repository tests plus DashboardRoutes tests. Browser-supplied scopes
  are rejected by the staff request schema.
- Cache identity, denied refetch eviction and logout clearing: met in query
  isolation/logout tests; both dashboard browser cases verify content removal.
- Period filtering, cached returns, error/retry and no fake loading values: met
  in all eight browser cases on the final production build.
- G0 performance thresholds: met against both the fixed G0 baseline and final
  matched-reference medians; raw samples and authentication variability retained.
- Migration and architecture: met. CMS theme-header scope is covered by two tests.

Commands: `npm run check:architecture`, `npm run check:files`, `npm run lint`,
`npm run typecheck`, `npm run build`; `npm test --workspace @prosme/platform --
--maxWorkers=2`; from apps/platform, `npx playwright test --config
playwright.responsiveness.config.ts` with the private session/library environment;
G0 runner with RESPONSIVENESS_ROUTE=/admin,/portal, nine samples and
RESPONSIVENESS_COMPARISON_URL pointing to the original build. Fixed applicant
confirmation runs use RESPONSIVENESS_CONDITIONS=warm and then cold, each with
RESPONSIVENESS_SAMPLES=9 and RESPONSIVENESS_SAMPLE_OFFSET=9.
Production build and full suite pass: 512 files/2094 tests; 44 files/178 tests
remain opt-in skipped. Lint has 16 existing warnings and no errors.

Additional baseline repair: the optional submission fixture now uses current
form declarations, a distinct eligible staff reviewer, correct notification
assignees, current eligibility-task semantics and immutable-version trigger text.
An empty second schema-only database verified all seven submission/schema tests,
including concurrent submission, rollback, withdrawal, projections and triggers.
No production fixtures were altered. Other opt-in suites were not run.

Logs: /tmp/page-responsiveness/g2-*.log and submission-validation.log during
review. Raw timing JSON and reviewed synthetic screenshots are retained in docs.
Architecture (1353 source files), form boundaries, file limits (1947 handwritten
files), type checking, production build and eight browser tests all pass. The
complete enabled suite passes after fixing the status-suggestion test timeout
under constrained CPU, preserving every assertion. The optional submission
validation passes separately (two files/seven tests). Tracked browser artifacts
were restored; generated traces and credentials are excluded from the change.
Disposable Firebase identity, isolated servers/databases and private session
files are cleaned up after review; the original runtime/database are untouched.

Rollback: reverse dashboard pages/APIs/hooks and loading boundaries together;
restore migrated applicant UI/imports and the configuration header scoping.
Revert provider identity/logout changes
with their consumers. No schema migration or production deployment is required.

Written acceptance: Codex accepts G2 because the required functional, permission,
cache, migration, quality and measured performance criteria are met. Earlier
unsuccessful measurements are retained and the measured Firebase limitation is
explicit. This permits phase 2 completion only. Phase 3 and release/deployment
phase 4 remain unstarted in accordance with the user's stop instruction.
