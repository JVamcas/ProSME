# Gate G1 — Foundation Readiness Record

## Gate status

| Field | Value |
| --- | --- |
| Gate | G1 — Foundation ready |
| State | Passed |
| Evidence date | 12 September 2026 |
| Acceptance authority | Technical lead |
| Acceptance | Accepted |

G1 passed after the repository foundation, real-Firebase scenarios, live PostgreSQL authorization checks, and production deployment path were verified. Technical-lead acceptance was confirmed on 12 September 2026.

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
| Handwritten file limits | Pass | 236 files checked; no limit exceeded |
| ESLint | Pass | Zero errors and zero warnings |
| TypeScript | Pass | `tsc --noEmit` exited successfully |
| Unit/access tests | Pass | 18 files and 61 tests passed |
| Production build | Pass | Next.js 16.3.4 Webpack production build generated all application routes |
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
| Live authorization changes | Pass | Removing the CMS role and disabling the PostgreSQL user each denied `/cms` on the next request using the existing Firebase session; restoring access took effect immediately |
| Principal administration | Pass | CMS users can enter Payload but cannot read or mutate the principal mirror; it remains visible only to system administrators |
| Authorization audit | Pass | Bootstrap role changes created audit entries and a live update attempt was rejected by the immutable database trigger |
| Operations authorization | Pass | CMS-only user was redirected from `/admin`; programme officer reached `/admin` |
| Logout | Pass | CSRF-protected logout cleared the production session cookie |
| Test-data cleanup | Pass | Disposable PostgreSQL records were removed and 3 stale Firebase G1 identities from interrupted attempts were deleted |

The sandbox initially prevented npm/esbuild and Next.js worker execution. The identical install and build commands passed with normal process-execution permission; this was an execution-environment restriction, not an application failure.

## Acceptance record

- The technical lead accepted G1 on 12 September 2026.
- Real Firebase registration, verified-email enforcement, session establishment, revocation, and logout passed.
- Live capability removal, user disabling, CMS role separation, and immutable authorization auditing passed.
- Operational mutation authorization remains Phase 3 scope because Phase 1 exposes only protected read-only operational prototypes.

## Dependency review

`npm audit` reports no critical or high vulnerabilities: 8 moderate and 1 low transitive findings remain.

- The esbuild finding is in Drizzle development tooling; no development server is exposed.
- The DOMPurify finding is transitive through Payload/Monaco and requires an upstream dependency update.
- The gaxios path reaches `uuid@9`; the affected UUID operations are not used by the observed gaxios call path.

These findings must be tracked and rechecked before production acceptance. They do not waive any later security gate.

## Decision

G1 is **passed**. Phase 2 and Phase 3 may rely on the accepted authentication and authorization foundation.
