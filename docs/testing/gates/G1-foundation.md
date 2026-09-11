# Gate G1 — Foundation Readiness Record

## Gate status

| Field | Value |
| --- | --- |
| Gate | G1 — Foundation ready |
| State | In progress |
| Evidence date | 11 September 2026 |
| Acceptance authority | Technical lead |
| Acceptance | Pending |

G1 is not passed. The repository foundation is implemented and locally verified, but the mandatory real-Firebase scenarios and written technical-lead acceptance cannot be completed until development-project credentials and test users are supplied.

## Implemented foundation

- Option B is the sole active application at `apps/platform`; Options A and C are archived outside the npm workspace.
- Next.js hosts public, authentication, applicant, operations, API, and embedded Payload routes in one deployable application.
- Payload uses PostgreSQL, committed migrations, `/cms`, and a Firebase-session custom strategy with local passwords disabled.
- Firebase Authentication is independent from Payload. PostgreSQL owns application users, identities, roles, and capabilities.
- Session exchange uses secure HTTP-only cookies, verified email, recent authentication, revoked-token checking, and CSRF protection.
- Application and CMS schemas use `app_` and `cms_` table prefixes respectively.
- CI, structured logging, environment validation, readiness checks, and a production Dockerfile are present.
- `AGENTS.md` file-size and reuse rules are enforced by `npm run check:files`.

## Verification evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Clean lockfile install | Pass | `npm ci`: 972 packages installed successfully from the committed lockfile |
| Handwritten file limits | Pass | 110 files checked; no limit exceeded |
| ESLint | Pass | Zero errors and zero warnings |
| TypeScript | Pass | `tsc --noEmit` exited successfully |
| Unit/access tests | Pass | 3 files and 8 tests passed |
| Production build | Pass | Next.js 16.3.4 Webpack build produced all 17 routes |
| Application migration on empty database | Pass | `0000_boring_stark_industries.sql` applied to clean `smefund_g1` database |
| Payload migration on empty database | Pass | `20260911_180817_phase1_payload_foundation` applied as batch 1 |
| Migration seed verification | Pass | 7 roles and 9 capabilities present |
| Readiness endpoint | Pass | `/api/health` returned 200 with application and database `ok` |
| Public and auth routes | Pass | `/` and `/sign-in` returned 200 |
| Protected route baseline | Pass | Anonymous `/portal` and `/admin` returned 307 to `/sign-in` |
| Payload route runtime | Pass | `/cms` returned 200 |
| Real Firebase registration and verified identity | Pass | Disposable users registered through the real Identity Toolkit API; unverified state was observed, then verified state was established before sign-in |
| Secure server session | Pass | A real Firebase ID token was exchanged for the production `__Host-smefund_session` HTTP-only cookie |
| Invalid and revoked sessions | Pass | Invalid ID token returned 401; a previously valid session returned 401 after `revokeRefreshTokens` |
| Applicant authorization | Pass | Applicant reached `/portal`, received applicant capabilities, and was redirected from `/admin` |
| CMS authorization | Pass | Applicant received no Payload principal; CMS editor resolved through Firebase without a Payload password and reached `/cms` |
| Operations authorization | Pass | CMS-only user was redirected from `/admin`; programme administrator reached `/admin` |
| Logout | Pass | CSRF-protected logout cleared the production session cookie |
| Test-data cleanup | Pass | Disposable PostgreSQL records were removed and 3 stale Firebase G1 identities from interrupted attempts were deleted |

The sandbox initially prevented npm/esbuild and Next.js worker execution. The identical install and build commands passed with normal process-execution permission; this was an execution-environment restriction, not an application failure.

## Mandatory checks still pending

- Complete a time-based test using an authentically issued, expired Firebase session. Invalid and revoked sessions are already proven.
- Complete the manual inbox/email-link portion of applicant email verification; the automated test established and enforced Firebase's verified state without relying on an external mailbox.
- Repeat mutation-level `/admin` authorization when Phase 3 introduces operational mutation endpoints; Phase 1 currently contains protected read-only prototype routes.
- Obtain written G1 acceptance from the technical lead.

## Dependency review

`npm audit` reports no critical or high vulnerabilities: 8 moderate and 1 low transitive findings remain.

- The esbuild finding is in Drizzle development tooling; no development server is exposed.
- The DOMPurify finding is transitive through Payload/Monaco and requires an upstream dependency update.
- The gaxios path reaches `uuid@9`; the affected UUID operations are not used by the observed gaxios call path.

These findings must be tracked and rechecked before production acceptance. They do not waive any later security gate.

## Decision

Keep G1 **In progress**. Phase 2 or Phase 3 development may proceed at risk, but neither dependent milestone may be reported as accepted until every pending item above is evidenced and the technical lead signs off.
