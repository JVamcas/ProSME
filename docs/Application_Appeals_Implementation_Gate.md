# Public application appeals

Date: 2026-10-15

## Accepted scope

The public Contact Us page links to `/contact/appeal`. A portal account is not
required. Submission requires an existing application reference,
rich text grounds and details, and privacy consent. The server resolves name,
email and optional profile phone from the linked application owner; the public
form does not collect contact details or accept contact overrides. Each rich
text field permits at most 1,000 plain-text characters, with a visible counter.
Validation runs in the browser and on the server; the server sanitizes markup
and validates the sanitized result before persistence.

Accepted appeals receive an `APL-` reference. The appeal, creation audit,
submitter acknowledgement, and staff notification occurrence commit in one
transaction. An unknown application reference is rejected without these writes.
The existing notification processor delivers the queued email with its normal
retry and delivery-history behavior.

Process Monitor includes Application Appeals Queue. Its table opens a right
hand drawer with the application reference, rich text, and a link to the existing staff
application page. The application page retains its independent authorization.
Authorized staff can assign an open appeal to active staff with appeal read
access or resolve it with a required note. Expected row versions prevent stale
updates; assignment and resolution create transactional audit records.

The canonical permission catalogue and role editor include:

- `application.appeal.read.all`
- `application.appeal.assign.all`
- `application.appeal.resolve.all`

Read permission enables Operations access and queue navigation. Assigning or
resolving additionally requires its specific permission. The migration grants
these permissions to the existing system administrator role. Other grants stay
under role administration.

## Notifications and migration

`application.appeal.received` is configurable and displayed as **New Application
Appeal Received**. Staff subscribe through existing event rules using specific
users or roles. Recipients must be active staff with appeal read access, checked
both at capture and before dispatch. No default staff audience is invented.

`application.appeal.acknowledged` is system controlled and sends to the linked
application owner's email without requiring the submitter to sign in. Its template uses a public Contact
Us link. The staff template links to the protected appeal drawer. Both follow
the existing branded table layout, logo attachment, button, fallback link,
and footer structure.

Migration: `apps/platform/drizzle/0211_application_appeals.sql`.
It creates module-owned tables and registers both events, the staff rule, and
published event-specific templates. Reapplying preserves existing rules,
grants, and template versions. Normal configuration seeding also knows both
events and template targets. The system acknowledgement template is included
in standalone notification-route file tracing for fallback rendering.

General complaints, attachments, application decision changes, and changes to
published workflow definitions are outside this implementation.

## Verification and acceptance

- Focused regression run: 38 tests passed across seven files. This includes
  eight real PostgreSQL tests for migration replay, narrow projections,
  pagination, assignment, resolution, notifications, and transaction rollback.
- The complete application SQL migration chain passed in a disposable PostgreSQL
  16 database, with minimal CMS tables supplied for existing source triggers.
  The normal migration CLI encountered the existing CMS prerequisite; raw SQL
  chain verification is distinct from normal-runner acceptance.
- Repository lint completed with zero errors and 20 warnings outside this
  change. Focused lint passed for all 47 appeal-related files without warnings.
- Final repository type checking completed without errors. Architecture and form
  architecture checks passed for 2,159 source files; component reuse passed for
  41 new, changed, or chatbot React files.
- The repository file-size gate uses stricter legacy limits of 400/300 lines.
  The appeal files meet those limits; unrelated repository failures are recorded
  here rather than changing other active work: `FormRepository.ts` (422/400),
  `FormDraftSyncPostgres.test.ts` (392/300),
  `WorkflowTemplateDeletionPostgres.test.ts` (332/300),
  `ServerApplicationDocumentService.test.ts` (400/300), and
  `ServerFormsService.test.ts` (363/300).

Code-level acceptance: the requested public intake, 1,000-character rich text
limits, protected queue/actions, acknowledgement, configurable staff event, and
branded templates are implemented and covered by the checks above. Browser,
deployed-container, SMTP and inbox acceptance remain open. No production build,
project database migration, GCP change, or deployment was performed.

Apply migration 0211 through the normal release process. Grant appeal permissions
to the intended staff roles and subscribe their users/roles to New Application
Appeal Received using the existing Event Rules screen. The acknowledgement is
automatic; it does not require a staff subscription.

## Contact field removal follow-up — 2026-10-15

Removed name, email and phone from the public form and request schema. One
bounded lookup resolves the referenced application's owner and optional profile
phone; the appeal stores those contact details and acknowledges that owner's
email. Supplied contact overrides are rejected by the strict request schema.

The follow-up's four focused test files passed all 21 tests. Repository lint
completed with zero errors and 20 warnings outside these changes. Architecture,
form architecture and component reuse checks passed. The eight PostgreSQL
integration tests were skipped because their opt-in environment was not enabled;
their assertions now expect the linked application's owner contact. Browser and
delivery acceptance remain open.

Repository type checking passed with a 3 GiB Node heap after the initial 1.5 GiB
attempt exhausted its heap. Code-level acceptance: applicants submit the appeal
using the application reference without re-entering contact details.

## Appeal detail card follow-up — 2026-10-15

The appeal drawer now groups the application reference and existing application
link in a summary card, displays the appeal status in its shared header, and
places grounds and details in separate bordered sections. Resolution notes use
a green highlighted section. Applicant contact details are omitted from the
drawer, as requested. Open-appeal management controls retain their individual
permission checks; resolved appeals have no management controls.

Three focused rendering tests passed, covering displayed content, absence of
applicant contact details, and management visibility by status and permission.
Focused lint, repository type checking, architecture, form architecture and
component reuse checks passed. Code-level acceptance: the requested grouped
appeal card is implemented without the applicant section. Browser visual
acceptance remains open.
