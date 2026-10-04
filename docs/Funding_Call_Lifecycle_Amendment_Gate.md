# Funding call lifecycle amendments

Date: 2026-10-04

## Implemented behavior

- The funding-call list, detail and editor expose **Withdraw and return to
  Draft** for Approved, Scheduled, Live and Suspended calls when the user has
  the amendment permission. The action requires a reason and current row
  version, records lifecycle history and notifications atomically, and opens
  the draft editor after success.
- The amended call follows the existing readiness checks, submission,
  maker-checker approval and publication process again. Old approval records
  remain historical; the current Draft state cannot be published directly.
- Returning to Draft stops new applications and draft submissions through the
  existing effective-open checks. Existing submitted applications, workflow
  instances, tasks, deadlines and outcomes are not changed by this action.
  Suspension and permanent withdrawal retain their existing pipeline behavior.
- Permanent withdrawal remains a separate terminal action, labelled
  **Permanently withdraw**. A permanently Withdrawn call cannot use the new
  amendment action.
- The application form, eligibility ruleset and workflow version attachments
  become immutable when the first application is created, including a draft.
  The lock survives application withdrawal or deletion. Server policy,
  transactional row locks and database triggers enforce the same rule; the
  editor disables these selectors and explains it. Other permitted draft
  details remain editable. Calls without applications can change attachments.
- Locked versions missing from selectable options remain visible as the
  current attached version. Metadata saves can preserve retired attachments;
  submission and publication still require the original readiness checks.
- Republication creates the next immutable publication revision. Public
  reads, search, pagination and counts use the latest revision and do not
  duplicate a call with multiple historical publications.

## Explicit permissions

| Action | Canonical permission |
| --- | --- |
| Submit for approval | `funding.call.submit.all` |
| Return a pending request for amendment | `funding.call.return.all` |
| Withdraw an approved/published call to Draft | `funding.call.withdraw-for-amendment.all` |

Existing explicit permissions still govern creation, draft editing, approval,
publication, suspension, resumption, permanent withdrawal, archival and
withdrawal of one's own approval request. Own-request withdrawal continues to
check the submitter relationship and governance policy on the server.

Migration `0161_funding_call_amendments.sql` adds the three permissions,
backfills attachment locks from existing applications, installs the lock
triggers and extends the lifecycle command constraint. It preserves previous
submit/return authority through explicit grants. Initial amendment grants go
only to roles that already have both permanent-withdrawal and draft-edit
permissions; later grants can be administered separately.

## Verification evidence

- Architecture and form architecture checks passed.
- File-size checks passed for 2,015 handwritten files. Changed functions were
  also checked against the 200-line limit.
- Lint passed with zero errors and 16 warnings in unrelated existing files.
- Type checking passed.
- Production build passed, including compilation, TypeScript, page generation
  and build traces.
- Full test run: 530 files and 2,213 tests passed; 47 files and 203 tests skipped;
  one unchanged application-list test failed at
  `tests/unit/ui/operations-list-screens.test.tsx:119`. It expects an application
  reference while the unchanged application table displays the application ID.
  Funding-call lifecycle, permission, route and editor tests passed in this run.
- Six PostgreSQL integration tests passed in an isolated disposable schema on
  the Docker database network. They cover permission migration, historical
  draft backfill, persistent attachment locks, unlocked edits, latest-revision
  pagination and counts, amendment/republication replay, submitted-application
  preservation and immutable earlier publication snapshots. Only table
  structure and synthetic test records were used; the schema was removed.
- `git diff --check` passed.

## Release status

The migration has not been applied to the running application database. The
running application has not been rebuilt or deployed. Browser acceptance was
not performed. Repository-wide test acceptance remains withheld because of
the unchanged application-list failure; user/release acceptance is not claimed.

Apply migration 0161 before running the changed application, then rebuild and
deploy through the normal release process. Permission grants and existing-call
attachment locks should be reviewed as part of that release.
