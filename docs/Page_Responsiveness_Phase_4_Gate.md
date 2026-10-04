# Page responsiveness phase 4: regression and release readiness

Date: 4 October 2026. Implementation owner and engineering reviewer: Codex.
Status: implemented; G4 engineering acceptance granted for the scoped candidate.
Entry: [G3](Page_Responsiveness_Phase_3_Gate.md) is accepted and the user requested phase 4.

## Candidate and scope

The accepted candidate is committed phase 3 runtime **96d16df0**, with the 18
verification files and SHA-256 hashes in [candidate](page-responsiveness-evidence/phase-4-candidate.json).
The original runtime comparison is **da025565**. The [combined manifest](page-responsiveness-evidence/phase-4-manifest.json)
records the complete responsiveness scope. Concurrent uncommitted application,
form, funding-call, notification, permission, workflow and migration changes
were preserved and excluded. Acceptance does not establish that the current
shared working tree or those changes are release-ready.

Phase 4 adds browser regressions, shared fixtures, a repeatable performance
summary and a guarded real-Firebase security probe. Two oversized test callbacks
were split into focused files without changing their assertions. This phase
adds no production behavior, database schema, dependency or lockfile changes.

## Performance acceptance

[Raw measurements](page-responsiveness-evidence/phase-4-final.json) retain 180
observations: six routes, cold/warm/1500 ms delayed conditions, two builds and
five samples per group, alternating original/current order. Both builds used
the same synthetic database and real Firebase session. Measurements ran after
build/test activity stopped. Cold means a fresh browser with a warm server and
certificate cache, not a process/certificate cold start. Cold structure uses
DOMContentLoaded; warm timings include the browser click observer. Data denotes
the primary business projection, not every secondary chart.

[Threshold summary](page-responsiveness-evidence/phase-4-summary.json) passes
all agreed structure, feedback, lead-time and full-data regression thresholds,
against the fresh original comparison and the retained G0 baseline. Under a
1500 ms application-table delay, the converted routes measured:

| Route | Feedback ms | Original → current structure ms | Improvement | Structure precedes data ms |
| --- | ---: | ---: | ---: | ---: |
| `/admin` | 63.5 | 1520.4 → 63.5 | 95.8% | 1481.7 |
| `/portal` | 64.8 | 1515.4 → 64.8 | 95.7% | 1453.4 |
| `/admin/applications/[id]` | 27.7 | 1661.2 → 113.9 | 93.1% | 1458.2 |
| `/portal/applications/[id]` | 31.8 | 1632.5 → 113.3 | 93.1% | 1439.2 |

Warm primary data is 69–91% faster on the four converted routes versus the
fresh original comparison; cold primary data is 63–81% faster. Both list control
routes also meet full-data regression tolerance; they were not converted.

[Authentication observations](page-responsiveness-evidence/phase-4-authentication.json)
show median normal verification **572.35 → 0.49 ms**, a 99.91% reduction.
The original/current cohorts contain 324/837 successful normal checks; counts
differ, so this is not a one-to-one paired experiment. All normal observations,
including slow certificate/network and contention tails, are retained. The
previous [paired SDK benchmark](page-responsiveness-evidence/firebase-authentication.json)
independently measured cookie verification 588.86 → 0.41 ms. Instrumentation
remains opt-in and records durations/outcomes without credentials.

[Cached-return and root-transition evidence](page-responsiveness-evidence/phase-4-cached-root.json)
contains five observations per scenario. Cached staff/applicant detail returns
have 98.7/89.5 ms medians and zero additional primary GETs in every repeat.
Portal → staff root navigation has a 334.9 ms median; staff → portal has a
325.6 ms median (maximum 1487.3 ms). Each root change creates exactly one new
document and fresh authorized data. Help → public contact has a 293.7 ms median;
history return is 634.8 ms. Root transitions remain document navigations.

## Functional and security regressions

The browser suite passed 24 scenarios, 25 cached/root repeat checks and both
real mutation scenarios. Coverage includes desktop and 390 px mobile, keyboard
and modified clicks, history, rapid navigation, failed RSC fallback, 503 retry,
independent secondary reads, primary-query deduplication, record switching
without old projections/actions, 401/403 eviction, lost sessions, logout/back
and account changes. Delayed loading exposes generic structure before data.
The [staff loading](page-responsiveness-evidence/phase-4-staff-loading.png) and
[mobile detail](page-responsiveness-evidence/phase-4-applicant-mobile.png)
screenshots were inspected.

Mutation tests use real API writes in an isolated database and assert fresh
fixture state first. Draft deletion updates the list, removes record cache and
produces 404 on detail read. Withdrawal changes status/actions and invalidates
the dashboard query. Seven database integration tests cover submission
concurrency/idempotency/rollback, dashboard projections, withdrawal history and
schema triggers.

[Real Firebase checks](page-responsiveness-evidence/phase-4-firebase-security.json)
pass malformed-signature rejection, signed-token expiry rejection, strict
revocation rejection, normal signed-cookie acceptance until expiry after
revocation, and a sensitive role-management API's 401 denial. Normal-cookie
acceptance is the explicitly requested policy: signature/expiry verification
without an immediate user lookup. Five sensitive access-management routes and
verification-email operations retain revocation checking. Session creation and
protected reads retain standard verification, React/request deduplication and
permission checks. Normal sessions retain the existing five-day expiry policy.

[Nine contextual checks](page-responsiveness-evidence/phase-4-context-checks.json)
pass own/assigned permission and resource-context cases, including non-owner,
unassigned staff and a disabled PostgreSQL actor. PostgreSQL remains the source
of authorization. The query isolation regression proves an aborted/late old
actor response cannot populate a new actor's cache. Staff record-switch UI uses
a synthetic second submitted projection; actual assignment denial is separately
verified against the server. No real applicant data was used.

## Required checks and review

[Validation record](page-responsiveness-evidence/phase-4-validation.json) records
commands, outcomes, retained quality/browser logs and unsuccessful attempts.
Checks ran in a frozen source
snapshot to exclude concurrent edits and rebuilding browser artifacts.

| Check | Accepted result |
| --- | --- |
| `npm run check:architecture` | Passed; architecture/form boundaries, 1367 source files |
| `npm run check:files` | Passed; 1979 handwritten files; final repeat passed |
| `npm run lint` | Passed; 0 errors, 16 existing warnings |
| `npm run typecheck` | Passed after build and final E2E fixture edit |
| `npm run test --workspace @prosme/platform -- --maxWorkers=1` | 521 files / 2138 tests passed; 44 files / 178 existing opt-in tests skipped |
| `npm run build` | Production Next.js build completed with `SKIP_CMS_PRERENDER=1` |
| Playwright responsiveness configuration | 24 scenarios, 25 repeat checks, 2 real mutations passed |
| Isolated database integration | 7 tests passed |
| Real Firebase/context probes | 5 Firebase and 9 contextual checks passed |
| Complete function-size review | 223 files; 1757 functions; maximum 195 lines, limit 200 |

The complete responsiveness diff was reviewed against the structure contract,
canonical contextual permissions and the client → query hook → client service →
API → backend service → repository flow. Server-only Firebase stays outside
client bundles. Responsiveness changes preserve domain/audit and SQL semantics.
Shared fixtures avoid duplicate session/navigation helpers. [Function review](page-responsiveness-evidence/phase-4-function-review.json)
records the AST check; the two excessive test callbacks were split in this phase.

Early attempts had missing private build environment, an incorrect synthetic
staff fixture, overlapping browser/build artifacts, incorrect mutation observers,
consumed fixtures and test-cache permissions. These were corrected and repeated
on a stable fresh candidate. They are not accepted results. The validation record
records their disposition; no candidate failure remains unresolved. Existing
opt-in skips are not counted as passes; the relevant seven database tests ran
separately.

## Limits and deployment prerequisites

Five local samples per group are regression evidence, not production percentiles.
Initial certificate retrieval, session-cookie creation and strict verification
can still involve external calls. Root-layout transitions are full loads. Query
freshness does not establish authorization; APIs retain permission/context
checks. Streamed unknown-record pages can have document status 200 while their
API/visible result is 404, as originally. Public contact/root navigation was
tested; full Payload content acceptance is outside the synthetic content scope.
Other screens and public CMS optimization remain separate work.

Release the exact accepted runtime with its verification changes, or integrate
and revalidate concurrent changes before release. Use the existing single Next.js
application with embedded Payload, matching validated `ENVIRONMENT`, PostgreSQL
configuration and real Firebase credentials. Firebase outbound certificate/auth
access must be available. This scope adds no database migrations; unrelated
pending work follows its own migration process. `AUTHENTICATION_TIMING=1` enables
temporary duration-only measurements and stays off by default. Deployment
requires separate authorization and has not been performed.

## Rollback and post-release checks

Retain the previous verified application artifact and redeploy it through the
existing release process if regressions appear. A focused source rollback must
restore the coupled responsiveness pages, providers, hooks, client transports
and loading boundaries; do not reset the shared tree or revert unrelated work.
Immediate-revocation policy can be restored in the authentication adapter while
retaining timing, deduplication and contextual permissions. No responsiveness
database rollback is required.

After an authorized release, repeat dashboard/detail navigation, logout/session
rejection, own/assigned denial, cached return, delete/withdraw invalidation and
strict sensitive-route rejection; compare structure/authentication timings in
matching conditions.

Disposable resources were removed after evidence capture. The
[cleanup record](page-responsiveness-evidence/phase-4-cleanup.json) records two
synthetic Firebase identities, two test servers and two isolated databases;
existing development resources were preserved. Private environments, cookies
and browser traces are not committed.

## Written acceptance

**Accepted by Codex, engineering reviewer, on 4 October 2026**, for committed
runtime 96d16df0 plus the verification scope above. All G4 exit criteria are met
by the linked performance, browser, security, architecture and quality evidence.
Phases 0–4 are complete for this bounded candidate. Acceptance excludes
concurrent unrelated changes and does not imply deployment.
