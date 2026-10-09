# Rolling authentication sessions

Application sessions have a five-minute server-enforced inactivity deadline.
Activity monitoring is mounted only in the applicant portal, staff dashboard and
CMS. Public and authentication pages neither monitor nor renew sessions.
Pointer, keyboard, touch and scroll activity renews an active session through
`POST /api/auth/session/activity`. Activity requests are batched at most once per
minute, with a trailing request after the last interaction. Renewal accounts for
the time elapsed since that interaction, so batching does not add idle time.
The first interaction renews immediately, including when a newly mounted page
inherits a session close to expiry. Activity listeners use capture so scrolling
inside panels and controls that stop event propagation are still observed.
Temporary renewal failures retry the recorded interaction with its original
timestamp; retries do not count as new activity.
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
The origin check uses the incoming `Host` and `X-Forwarded-Proto` because
Next.js standalone constructs `request.url` with its internal bind address.
The TLS proxy must preserve `Host` and overwrite `X-Forwarded-Proto`; the
repository's Nginx configuration does both. Requests still require the activity
header, a matching browser origin and, when present, same-origin fetch metadata.

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

## Five-minute inactivity update (2026-10-08)

The inactivity policy is now five minutes. No additional database migration is
required for this update. Existing sessions can retain their previously granted
deadline until it passes; fresh sign-ins use the five-minute window immediately.

Local validation for this update: 26 authentication/session test files and 164
tests passed, including continuous activity for twelve minutes, expiry exactly
five minutes after the last interaction, nested scrolling, stopped keyboard
events, retry timing, and renewal of a nearly expired inherited session. Type
checking, architecture/form boundaries, file limits and whitespace checks passed.
Full lint passed with 13 existing warnings. Deployment and live authenticated
browser verification remain pending.

## Container origin correction (2026-10-08)

Credential-free runtime probes reproduced HTTP 403 for valid activity requests
on both local Docker (`http://localhost:3008`) and the GCP application container
(`https://smefund.na`, with the TLS proxy headers). The local endpoint accepted
the internal origin `http://0.0.0.0:3008` and proceeded to HTTP 401 because the
probe intentionally supplied no session cookie. This isolated the failure to
the origin check before session authentication or renewal: normal browser
activity could not extend the initial five-minute cookie.

The corrected transport validates the browser-facing authority and protocol.
Regression tests reproduce internal/public address differences and confirm
that cross-site, malformed, wrong-protocol and internal-origin requests remain
denied. All 175 tests in 26 focused authentication/session files passed, as did
type checking, architecture/form boundaries, file limits and whitespace checks.
Full lint passed with 13 existing warnings. A temporary Next.js development
server accepted both the localhost origin and the HTTPS proxy header combination
and reached session authentication (HTTP 401 without credentials); a mismatched
origin remained HTTP 403. The verification server was stopped afterward.
No production build or deployment was performed; live authenticated
renewal/idle acceptance remains pending.
