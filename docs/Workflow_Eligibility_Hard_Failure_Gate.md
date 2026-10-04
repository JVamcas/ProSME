# Authoritative eligibility hard-failure termination — verification

Date: 2 October 2026

## Accepted behavior

- An eligibility verification task configures authoritative screening through its
  form purpose. Its Form & layout step exposes one hard-failure status selector:
  Ineligible, Rejected, or Rejected incomplete. No separate Reject action or
  applicant-facing status selection is required.
- Published task configurations without this setting default to Ineligible.
  Existing published definitions are not rewritten.
- Reviewers save verified answers and run the pinned screening ruleset. A hard
  failure terminates the workflow, publishes the selected status, cancels pending
  tasks and open stages, and retains failed rules and reason codes.
- Evaluation persistence, termination, audit records and the terminal-status
  notification occurrence share one database transaction. Passing results,
  warnings and soft failures do not trigger automatic termination. Applicant
  self-check behavior remains unchanged.
- Approve and advance requires current screening evidence without hard failures.
  This is enforced in action availability, server execution, and legacy form and
  checklist completion paths. Historical stage iterations do not displace the
  latest iteration's screening evidence.
- Retrying a successful evaluation returns its receipt after termination without
  another evaluation or notification. Replay checks current configured process
  permission, task assignment and COI clearance.
- The reviewer response's optional `terminalStatus` uses the shared eligibility
  failure status type. It lets the UI leave the terminated task after evaluation.
- `application.terminal-status-reached` carries application and applicant
  snapshots, previous/new status, failure evidence, correlation and occurrence
  time. The existing notification pipeline resolves recipients and channels from
  the saved UI rule; it does not force delivery to the applicant in runtime code.
- The migration installs an editable applicant/email preset when creating the
  terminal notification rule. Migration and seed reruns preserve subsequent UI
  recipient/channel choices. The event supports configurable templates containing
  the selected status and reason codes.
- The branded source HTML template is
  `apps/platform/src/modules/notifications/templates/email/application-terminal-status-reached.html`.
  Import it into the event target through Notifications and publish that version.

## Evidence

- Architecture and form boundary checks passed for 1,242 source files.
- File-size checks passed for 1,738 handwritten files.
- Lint completed with zero errors and 17 existing warnings.
- Type checking and the production build passed.
- Full default suite: 438 files passed, 30 skipped; 1,632 tests passed,
  96 skipped. An earlier form-preview timeout under concurrent build load passed
  its focused rerun and the final full suite.
- Ten PostgreSQL regression cases passed against a disposable PostgreSQL 16
  database with the complete migration chain applied. Cases cover supported
  status persistence, missing/stale/passing/hard-failure screening, soft failure,
  changed reviewer answers, cancellation, audit evidence, receipt retrieval,
  duplicate notifications, rollback, and UI-configured recipients surviving both
  migration and seed reruns. Fixtures were rolled back after verification.
- The event-registration migration was executed repeatedly without duplicate
  configuration. Fresh installation verification includes catalogue/channel
  initialization and the shared public-status database constraint.
- The new HTML template passed the existing import, sanitizer, branding, CTA and
  placeholder checks. Focused HTML import and renderer suites: 23 tests passed.
- `git diff --check` passed.

## Acceptance limits

The scoped implementation is accepted on the automated evidence above. No
browser acceptance, live email delivery, deployment, or application-database
migration is claimed. Deployments must apply
`0148_eligibility_terminal_status_event.sql`; notification administrators can then
configure the event's rule and publish its email template through Notifications.
