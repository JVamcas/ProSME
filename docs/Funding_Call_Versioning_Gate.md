# Funding call and configuration versioning

Date: 2026-10-09

## Implemented behavior

Editing a published funding call, application form, workflow template, or
eligibility ruleset creates or resumes a draft. Saving that draft preserves
the published source. Forms, workflow templates, and eligibility rulesets
retain earlier published versions when another version is published.

A funding call retains its identity, reference, and public URL. Its current
published version is an explicit pointer to immutable publication history.
Replacement drafts have separate configuration and approval state. Preparing,
saving, submitting for approval, and approving a replacement leave public
configuration and intake unchanged. Each replacement requires fresh approval
and a separate publication selecting exact published versions of all three
configuration assets.

Publication locks the call and selected configuration versions, records the
new immutable publication, replaces the effective configuration and pointer,
and removes the working draft in one transaction. Concurrent publication
cannot activate two replacements. Published history remains addressable from
the staff editor, including the thumbnail associated with that publication.

Applications are pinned to the current publication when their draft is
created. Existing drafts retain their original form, eligibility ruleset, and
workflow template through submission. Submission records the original
publication and starts its selected workflow. Submitted applications retain
their workflows and original configuration for subsequent processing.

Opening and closing dates, intake status, and duplication rules come from the
effective call across all versions. Proposed dates remain inactive until
publication; original dates remain in publication history and submission
snapshots. Suspension survives replacement publication. Withdrawal and
archival prevent replacement activation and intake. Publishing a replacement
does not reset application allowances. Intake controls leave existing workflow
instances intact.

## Migration and rollout

Apply `0183_funding_call_versioned_replacements.sql` through the normal
migration runner before starting code that uses these columns and tables.
This migration has been verified in disposable test schemas and applied to
the local Docker stack after the startup correction documented below.
Production deployment and migration acceptance remain separate.

The migration backfills the current publication pointer and application pins.
Submitted applications use their recorded immutable submission publication;
other applications use matching historical configuration available when the
draft was created. It preserves older published amendments as working drafts,
restores effective published configuration and dates, withdraws old pending
review requests, and requires fresh approval of those replacements.

Applications without reliable matching publication history retain a null pin.
Readiness and submission fail closed for these records. Audit and resolve
them against their historical evidence before release acceptance; do not
default them to the latest publication:

```sql
SELECT status, count(*)
FROM app_applications
WHERE funding_call_version_id IS NULL
GROUP BY status;
```

Database constraints and triggers scope publication pointers and application
pins to the owning call, protect immutable application bindings and published
history, prevent historical publication reactivation, and restrict effective
configuration updates to publication.

## Verification evidence

- Architecture and form architecture checks passed for 1,760 source files.
- File-size checks passed for 2,582 handwritten files. Changed functions also
  satisfy the 200-line limit.
- Type checking passed. Lint completed with zero errors and 23 existing
  unrelated warnings. `git diff --check HEAD` passed.
- The domain unit run covered funding calls, forms, eligibility, applications,
  workflows, and form lifecycle UI: 1,532 tests passed, six skipped, and one
  failed across 359 files. The failure is the unchanged
  `forms/FormRenderer.test.tsx` assertion expecting `aria-label="Open calendar"`
  from the shared date picker. The renderer and its test were not modified.
- The final focused run passed all 48 tests in nine files, covering version
  routes and authorization, historical thumbnails, isolated eligibility
  conditions, ruleset editor actions, stage activation, and submission
  snapshots. An earlier focused run also covered workflow return activation.
- PostgreSQL integration checks passed all nine tests in four files using
  disposable schemas and synthetic records. They exercise unpublished
  isolation, fresh approval, suspension and withdrawal, publication races,
  immutable history and bindings, exact version history reads, asset draft
  resumption and multiple publication, and migration of historical drafts,
  submitted applications, and pending amendments.
- The application integration check submits an existing draft after a
  replacement selects new versions of all three assets. The old draft starts
  its original workflow, new drafts receive the replacement configuration,
  effective dates govern both versions, and duplicate submission allowances
  remain call-wide. Its workflow fixture uses an empty reviewer stage; this
  does not establish browser or reviewer-task acceptance.

Production application build, browser acceptance, production deployment, and
production migration acceptance were not performed during this change. This
record documents implementation and local verification evidence; release
acceptance remains separate.

The subsequent metadata, integration-binding, and replacement-preview fixes
and their current verification evidence are recorded in
[Versioning gap fixes](Versioning_Gap_Fixes_Gate.md). That follow-up also corrects
the stale date-picker test described above.

## Migration startup correction

The first local Docker startup failed in the application pin backfill because
the existing `app_applications_lifecycle_guard` requires each application
update to increment `row_version`. The migration transaction rolled back.
Both pin backfills now increment the affected application's concurrency
version. Records without matching publication history remain untouched.
Existing lifecycle, identity, and immutable submission protections remain
enabled throughout the backfill.

The disposable-schema fixture now installs the existing lifecycle guard from
migration `0083` before running `0183`; PostgreSQL `LIKE` does not copy triggers.
Migration regression assertions verify original pins and lifecycle states,
exactly one concurrency increment for each bound application, and unchanged
unmatched applications. The submission fixture also observes this guard.

All nine PostgreSQL integration tests passed again with the guard enabled and
a 30-second test timeout. The first rerun passed eight tests and timed out one
workflow asset test at the default five seconds; the final rerun passed all
nine in 23.88 seconds. Type checking, focused lint, architecture/form gates,
file-size checks, and diff whitespace checks passed after the correction.

The migration image was rebuilt without rebuilding the application image.
`scripts/docker-up.sh` then completed successfully: Drizzle applied migrations
through `0183`, Payload migrations completed, and the migration container
exited with code zero. The database, application, and scheduler containers
were all running and healthy. Aggregate database verification confirmed that
all existing applications received publication pins while their submitted or
withdrawn states remained unchanged. No application or CMS seed was run.
