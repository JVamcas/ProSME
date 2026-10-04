# Local production performance evidence

All records are synthetic. Raw timing JSON contains only route paths, fixed
synthetic record identifiers, timing values and environment metadata. Screenshots
contain synthetic account/application content. Session cookies, credentials,
Playwright traces and environment exports stay in private temporary storage.

Environment: repository revision da025565 plus the implementation working tree;
Node 24.13.0, Next 16.3.4, React 19.2.8, TanStack Query 5.90.16, Playwright 1.63.0.
Chromium uses a 1440x1000 viewport. The original G0 run has three observations per route/condition. The final G2
comparison has nine per staff condition/build and applicant delayed condition/build,
and 18 per applicant cold/warm condition/build after fixed follow-up sets. Each
JSON retains its run metadata and all observations.
Measurements disable Next speculative prefetch, use a fresh context for each
sample and use real Firebase authentication and PostgreSQL permissions.

The isolated runtime is named smefund-responsiveness-test, exposed only on
localhost:3018. The schema-only database is smefund_responsiveness_test. Only
permission catalogue rows were copied; all users, forms, funding calls and
applications are synthetic. The original application/database remain untouched.
The fixed measurement record is 66666666-6666-4666-8666-666666666661.

## Reproduction

Build with `npm run build`, then start an isolated production runtime using a
schema-only PostgreSQL database ending in `_responsiveness_test`. Provision a
synthetic Firebase identity linked to a synthetic application user with staff
and own-application read permissions. Supply a valid session as a private JSON
file containing `cookie`; never commit it. Load the synthetic measurement record
with a valid submitted snapshot and both application-list entries.

The measured Docker setup mounts the repository at /workspace and private
measurement helpers at /perf. Its /perf/runtime.cjs loads private environment
configuration, overrides DATABASE_URL to the isolated database, and launches
its command arguments. Delayed samples invoke the checked-in
scripts/development/performance/delay-business-reads.cjs through that wrapper.
The delay helper refuses non-test databases and holds an application-table lock
for 1500 ms; authentication/user reads remain independent.

```bash
RESPONSIVENESS_SESSION=/private/browser-session.json \
RESPONSIVENESS_OUTPUT=/tmp/performance.json \
RESPONSIVENESS_SAMPLES=3 \
node scripts/development/performance/measure-page-responsiveness.mjs
```

Set RESPONSIVENESS_BASE_URL to change localhost:3018, and
RESPONSIVENESS_ROUTE to a comma-separated subset of exact routes. The runner
requires Playwright Chromium and Docker access for the delayed condition.
Use the existing application test-fixture helpers to provision synthetic forms
and records; the optional submission integration suite now verifies a complete
submission and its real immutable database triggers in a separate empty database.

Warm observations navigate from another route within the same portal after
hydration. Cold observations use a fresh document/context on an already running
server. Cold structure is DOMContentLoaded rather than first paint. Click
observations use DOM mutation timestamps registered before Playwright activation
and include actionability/dispatch overhead. Data means the primary visible
business projection, not completion of every asynchronous chart or secondary
workflow section. Secondary independence is separately verified in browser tests.

Three samples are a local engineering comparison, not production percentile or
load-test evidence. Initial root-layout entry retains real authentication work.

## Matched original-build comparison

The reference build uses archived da025565 source, with only the incomplete
TypeScript test-actor fixture repaired to allow compilation. Its runtime code
is unchanged. It runs separately on localhost:3019, against the same synthetic
database/session as the revised build on localhost:3020. Both use timing-only
instrumentation around Firebase Admin verifySessionCookie, preserving arguments,
revocation checks and results. No authentication cache was introduced.

Set RESPONSIVENESS_COMPARISON_URL to alternate original/current sample order.
RESPONSIVENESS_CONDITIONS selects cold,warm,delayed (default all), and
RESPONSIVENESS_SAMPLE_OFFSET continues alternating sample numbering for a fixed
follow-up set. Response metadata records paths, status, request duration and
navigation/RSC flags; it contains no cookies or credential headers.

phase-2-guard-repeat.json and phase-2-replay-diagnostic.json retain unsuccessful
or diagnostic runs. phase-2-final.json records the final header-scoped build.
Global CMS Critical-CH caused Chromium to replay the first authenticated
platform document. CMS-only hint scoping removes those replays without changing
CMS theme negotiation. Real Firebase latency remains variable and is reported
separately from the dramatic improvement in visible destination structure.

The final G2 evidence includes both fixed applicant confirmation sets (nine warm
and nine cold samples per build), with all original observations retained. The
combined matched-reference applicant full-data difference is under 5% warm and
1% cold. phase-2-authentication.json contains only per-sample request, Firebase
verification and remainder durations for the warm confirmation. Each request
was matched by synthetic path and start time in private timing-only logs.

The disposable test identity, isolated databases/servers and private credentials
are removed after validation. Reproduction requires a newly provisioned isolated
setup and synthetic session; no reusable credentials are committed.

## Phase 3 and Firebase verification

firebase-authentication.json records the accepted real-SDK verification-policy
comparison: 20 alternating samples per operation/mode (80 observations, forming 40 comparisons),
with certificate caches warm. Its two first-verification observations retain the
cold-certificate cost. The synthetic identity was deleted. The authentication
change record explains which access-management/verification-email operations
retain immediate revocation checking and the signed-cookie-until-expiry behavior
of normal verification.

For G3, the frozen reference is the **auth-optimized G2 build based on 5f1a95eb**,
not da025565. Both reference/current servers use the same isolated database and
session; the reference is on localhost:3019 and current on localhost:3018.
phase-3-auth-optimized-baseline.json is a preliminary three-sample reference.
phase-3-initial.json retains the first matched five-sample comparison: destination
structure passed, but warm full-data times regressed beyond tolerance.
phase-3-warm-revision.json records the fixed follow-up: removing the redundant
nearest detail-route loading boundary eliminated React's additional 300 ms
fallback delay. The client workspace still renders its own pending skeleton.
phase-3-final.json contains the final five-sample cold/warm/delayed comparison;
phase-3-summary.json records all numerical target checks. phase-3-authentication.json
retains duration-only production verification samples, with cold fetches kept.
phase-3-list-controls.json holds three-sample cold/warm list controls; the rendering
revision only affects detail routes. Set RESPONSIVENESS_APPLICATION_REFERENCE to
the seeded reference when measuring list readiness (this fixture uses
SUBMISSION-FUND-2026-000001 instead of the original PERF reference).

phase-3-context-checks.json records nine real authenticated API probes using a
second synthetic account with only own/assigned grants and no applicable
ownership/assignment. Denied reads expose no record, scoped RFIs are empty,
assigned progress is forbidden, and a disabled PostgreSQL account remains
forbidden despite its signed Firebase session. The allowed actor reads the
primary staff/own projections and progress. Reviewed screenshots contain only
synthetic identities and applications. phase-3-files.json lists the focused
change's files, including architectural migrations and their import consumers.
