# Authentication email implementation and verification

Date: 2026-09-29

## Accepted design

- The Authentication catalogue contains `auth.email.verification` and
  `auth.password.reset`.
- Event `ruleEligibility` is independent of catalogue membership:
  `CONFIGURABLE` allows notification rules; `SYSTEM_ONLY` requires delivery
  through a server-owned use case with a fixed recipient.
- Authentication emails are system-only. Rule list and lookup SQL excludes
  them; server policies reject rule edits; database triggers reject direct rule
  creation. Catalogue membership displays eligibility using the existing badge.
- Authentication capture bypasses configurable recipients, event/catalogue
  flags, and the business email channel enable switch. Outbox and delivery
  creation is atomic; the existing scheduler, SMTP sender, retry policy and
  delivery history remain in use.
- Firebase generates and validates the secure action codes. The application
  sends its own branded HTML and plain-text emails. Links always use the
  server-configured `APP_PUBLIC_URL` and `/auth/action`, even if Firebase's
  console action URL still points to its hosted handler.
- Codes are generated at dispatch, including retries, and are never persisted
  in outbox contexts, audit records, or delivery history. Dispatch rechecks the
  Firebase identity and email before generating the link.
- Published event templates take precedence over Authentication catalogue
  templates. Source-file defaults are used when neither is published. Global
  business templates cannot replace security emails. Imports and publication
  require an action link in HTML and plain text.
- Existing auth cards, feedback, password fields, form controls, and buttons
  compose the action page. New-password forms use React Hook Form and Zod.
  TanStack Query hooks delegate Firebase browser operations to ClientAuthService.
- Registration, unverified sign-in, resend, password recovery and profile
  password recovery all use the custom email path.

## Identity and abuse controls

Verification accepts an unverified Firebase identity token because these users
cannot establish the verified platform session. The service verifies the token
with revocation checking and derives the UID and recipient from Firebase; callers
cannot select a verification recipient. This is an authentication bootstrap
operation, rather than an administrative platform permission operation.

Password recovery is public self-service. Unknown, disabled, non-password and
rate-limited account requests return the same success result. PostgreSQL stores
only hashed rate keys. A one-minute recipient limit and a 100-per-minute global
password recovery bucket prevent duplicate and unbounded requests. CSRF is
checked before either request invokes its server service.

The action page supports only verification and password reset, works without a
platform session, handles expired/invalid codes, and offers recovery links.
Success navigation is fixed to `/sign-in`; external `continueUrl` parameters are
ignored. The page disables indexing and sends a no-referrer metadata policy.

## Architecture and migration

Account UI moved from `components/auth` to `modules/users/ui/auth`; the touched
Firebase client service, form schemas and error mapping moved under
`platform/auth/firebase`. Untouched Firebase session/configuration adapters remain
at their legacy paths during incremental migration. The architecture gate now
recognizes the actual migrated browser Firebase service; its boundary restrictions
remain enforced.

Migration `0139_authentication_notification_events.sql` adds event eligibility,
the account-holder delivery recipient type, Authentication catalogue/template
targets, rate-limit storage and database rule guards. It contains no template HTML.
The migration journal is updated. The standalone build explicitly includes the
source email defaults in the existing notification processor route's file tracing.

## Evidence

- Focused authentication, notification and auth UI checks: 34 files, 167 tests
  passed.
- All application SQL migrations, including 0139, applied successfully in one
  transaction to a disposable PostgreSQL 16 container.
- Five real PostgreSQL authentication tests passed: migration/seed replay,
  database rule rejection, atomic fixed-recipient capture, delivery with disabled
  configuration switches, and concurrent/expired rate windows.
- Architecture, form architecture and file-size gates passed.
- Type checking passed.
- Lint passed with no errors and existing repository warnings.
- Full repository tests: 1,484 passed, 75 skipped, 14 failed across nine unrelated
  files. A separate checkout of the committed baseline reproduced the same
  failures (ten assertions in eight files, plus four scoring assertions after
  including their fixture). No failing implementation was changed for this task.
- Production build: pending final verification.

## Deployment and acceptance limits

Apply the migration using the normal deployment migration runner. Run
`db:seed:notifications` when bootstrapping a new installation. Set
`APP_PUBLIC_URL` to the application's public origin and authorize that origin
in the Firebase project for the Admin SDK's continue URL. Configure the existing
Gmail SMTP environment and notification processor secret/schedule; queued emails
require that processor to run.

Staff can import and publish branded Authentication event or catalogue templates
using the existing Channels template screens. An HTML action link is preserved
in automatically generated plain text; explicit plain text must also contain
`{{actionUrl}}`.

No application database migration, deployment, Firebase console change or real
email send was performed. Live inbox delivery and real Firebase action completion
remain rollout smoke checks. Test email delivery uses a fake sender; no Firebase
Emulator configuration was added.

Implementation acceptance is limited to the scoped automated and PostgreSQL
checks above. Repository-wide green-test acceptance remains blocked by the
reproduced baseline failures. Production/inbox acceptance is not claimed.
