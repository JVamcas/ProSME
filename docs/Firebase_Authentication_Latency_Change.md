# Firebase authentication latency change

Date: 4 October 2026. Implementation owner and engineering reviewer: Codex.
Scope: the explicitly requested verification-policy change; phase 3 follows
only after this change's validation. No authorization policy or database schema
is changed.

## Verification policy

Normal protected page/API requests call verifySessionCookie(cookie), and normal
session creation calls verifyIdToken(idToken). Firebase still validates signed
JWTs and their issuer, audience and expiry. Verified-email enforcement, the
five-minute recent-authentication requirement for establishing a session,
PostgreSQL actor/status/role/permission resolution, resource ownership/assignment
checks and the existing request-scoped React cache remain in place.

A server-owned checkRevoked option enables immediate revocation verification.
It is explicitly required by these access-management writes:

- POST /api/admin/users: invite and assign account roles.
- PATCH /api/admin/users/[id]: change account status or roles.
- POST /api/admin/users/[id]/promote: grant staff access.
- POST /api/admin/users/[id]/provision: establish an application account.
- PATCH /api/admin/roles/[id]: change role permissions.

GET directory/role reads use standard authentication. The existing
POST /api/auth/verification-email operation retains verifyIdToken(idToken, true)
because it initiates an identity-verification action, including before a
platform session can be established. Password-reset requests already read the
current target Firebase user, reject disabled accounts and retain their existing
anti-enumeration/rate-limit behavior.

Standard verification does not immediately detect a Firebase-only revocation or
account disable: a correctly signed session remains cryptographically valid
until expiry. Current PostgreSQL account status and grants are still checked
when resolving actors and enforcing permissions. Immediate Firebase revocation
checking remains required on the sensitive operations above. No cross-request
authentication cache or decoded-token shortcut was introduced.

## Timing evidence

[Raw observations](page-responsiveness-evidence/firebase-authentication.json)
contain 20 alternating samples per operation/mode, using the same synthetic
identity/token and the real configured Firebase project. SDK certificate caches
are warm for paired observations. The disposable identity was deleted afterward;
no credentials, tokens, cookies or identity identifiers are recorded.

| Verification median | Previous revocation mode | Standard mode |
| --- | ---: | ---: |
| Session cookie | 588.86 ms | 0.41 ms |
| ID token | 623.67 ms | 0.44 ms |

Warm verification improves approximately 99.93%. These SDK measurements exclude
PostgreSQL/business reads; they do not claim the entire API takes 0.41 ms.
First normal verification with cold certificate caches took 831 ms for the ID
token and 1186 ms for the session cookie. Certificate loading/rotation and session
cookie creation can still require network requests.

Real-SDK validation confirms a modified cookie signature is rejected, standard
verification accepts a signed session until expiry after revocation, and the
sensitive mode rejects that revoked session. The latter distinction is the
explicitly requested verification policy.

Set AUTHENTICATION_TIMING=1 on the server to enable duration-only logs containing
operation, checkRevoked, succeeded and durationMs. It is off by default and
records no identity, credential, token, cookie or SDK error details. Both normal
and sensitive session verification, plus session-creation token verification,
use the same instrumentation.

Reproduce the standalone SDK comparison with configured Firebase environment:

```bash
AUTHENTICATION_PERFORMANCE_OUTPUT=/private/firebase-timings.json \
AUTHENTICATION_PERFORMANCE_SAMPLES=20 \
node --env-file=.env scripts/development/performance/measure-firebase-authentication.cjs
```

The measured run used the configured application's credentials privately in its
local Docker network. A host attempt could not obtain credentials/connectivity;
only the successful Docker run supplies the reported evidence.

## Files and validation

Implementation files changed (paths relative to apps/platform/src):

- platform/auth/firebase/ServerFirebaseSession.ts, moved from auth/firebase/session.ts.
- platform/auth/ServerSessionService.ts, moved from auth/firebase/ServerSessionService.ts.
- platform/monitoring/ServerAuthenticationTiming.ts (new).
- auth/authorization/current-user.ts (explicit sensitive option; React cache retained).
- app/api/auth/session/route.ts and payload/auth/firebase-session-strategy.ts (imports).
- app/api/admin/users/route.ts; app/api/admin/users/[id]/route.ts;
  app/api/admin/users/[id]/promote/route.ts; app/api/admin/users/[id]/provision/route.ts;
  app/api/admin/roles/[id]/route.ts (sensitive mutation opt-in).

Tests: tests/unit/auth/FirebaseSessionVerification.test.ts,
AuthenticationTiming.test.ts, CurrentUserVerification.test.ts,
SensitiveAuthenticationRoutes.test.ts (new), and session-service.test.ts (imports).
The repeatable benchmark is scripts/development/performance/
measure-firebase-authentication.cjs; its non-secret observations and this record
are the documentation changes. Phase 3 files are separately recorded in G3.

Session verification and session establishment moved from auth/firebase to
platform/auth, as required by the repository structure contract. Their direct
consumers and tests import the new paths. Current-user resolution only adds the
explicit sensitive verification option; getCurrentUser retains React cache.
The five sensitive handlers opt in, while their schemas and domain permission
checks are preserved. ServerAuthenticationTiming owns opt-in diagnostics.
New tests cover verification defaults, sensitive mode, failed/missing sessions,
verified email, retained actor resolution, sensitive transport opt-in and private
logging. Existing session, CSRF, navigation, user-policy and email tests are reused.

Focused validation: 24 files/125 tests pass. Architecture/form boundaries, file
limits, lint (zero errors; 16 existing warnings), production build and generated
TypeScript checks pass. The full enabled suite passes (516 files/2114 tests; 44 files/178
existing opt-in tests skipped). Engineering acceptance: Codex, 4 October 2026;
the authentication change is complete and phase 3 may begin. Logs are retained under /tmp/firebase-auth-*.log during
review.

Rollback: restore the prior verification implementation and consumer paths,
remove explicit handler options and duration logging together. No migration or
production deployment is required.
