# Rolling authentication sessions

Application sessions have a 30-minute server-enforced inactivity deadline.
Activity monitoring is mounted only in the applicant portal, staff dashboard and
CMS. Public and authentication pages neither monitor nor renew sessions.
Pointer, keyboard, touch and scroll activity renews an active session through
`POST /api/auth/session/activity`. Activity requests are batched at most once per
minute, with a trailing request after the last interaction. Renewal accounts for
the time elapsed since that interaction, so batching does not add idle time.
Unattended tabs, status reads, focus checks, background queries and autosave do
not renew sessions. Active tabs share renewed deadlines; logout notifies other
tabs and deletes the server session before clearing the browser cookie.

Firebase remains the identity provider. Its existing session-cookie lifetime,
configured through `SESSION_COOKIE_DAYS` (default five days), is an absolute
upper bound. Browser cookies are issued only for the current inactivity window.
PostgreSQL stores a SHA-256 cookie hash, the account/identity relationship, the
inactivity deadline and the absolute deadline. It never stores the cookie or a
Firebase refresh token. Every platform and Payload header-based authentication
request checks the server inactivity deadline and active account status.
Renewal checks Firebase revocation and uses a conditional SQL update; an expired,
deleted, suspended or disabled session cannot be renewed.

Renewal requires a same-origin POST with a custom request header. It cannot use
an expired cookie to establish a new session. Fresh sign-in still requires
recent Firebase authentication. Protected pages redirect to sign-in on expiry,
preserving their return destination and clearing platform query caches. Payload
data loading remains outside the platform query provider.

## Rollout and validation

Apply `0169_rolling_user_sessions` with
`npm run db:migrate --workspace @prosme/platform` before deploying the application
change. Existing sessions have no registration record and require a fresh
sign-in after rollout.

Focused/static validation accepted on 2026-10-08:

- Authentication, user, logout, cache-isolation and CMS logout checks: 33 files,
  179 tests passed. These include simulated browser events, tab logout, expiry,
  clock skew, CSRF protection, identity scope and conditional SQL projections.
- Type checking passed.
- Full lint passed with 13 existing warnings; focused lint passed without
  warnings in the changed authentication/session implementation and new tests.
- Architecture, form architecture, file-size and whitespace checks passed.
- Migration journal sequence and timestamp ordering were checked.

Live database verification is currently blocked because the configured database
hostname cannot be resolved (`EAI_AGAIN`). The migration has not been applied by
this change. Real-browser and live Firebase acceptance remain unverified;
simulated browser tests do not establish live acceptance. A production build
and the full repository test suite were not run. Rollout acceptance is pending
the migration and a real authenticated idle/renewal walkthrough.
