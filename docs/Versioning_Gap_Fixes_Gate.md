# Versioning gap fixes

Date: 2026-10-09

## Implemented behavior

Form and eligibility ruleset names, codes, and descriptions now belong to
individual versions. Editing a published version creates or resumes its draft,
including the separate ruleset metadata endpoint. Draft saves update version
metadata without changing the published definition. Publication updates the
catalogue definition in the same transaction; earlier published versions retain
their metadata. Workflow metadata follows the same publication boundary.
Editors, published-version selectors, eligibility previews, and workflow task
form names use the exact version's metadata.

Eligibility integration bindings now belong to funding-call versions. Creating
a replacement copies the current publication's bindings into independently
editable records. Binding changes require integration-binding and funding-call
draft-edit permissions, are allowed only in Draft, and increment the call's
concurrency token. Approval and publication retain their separate steps.
Publishing activates the replacement bindings; existing applications resolve
bindings through their original publication pin and workflow. Database guards
protect published bindings and version associations. Independent call cloning
copies only the current configuration's bindings.

Workflow eligibility-form previews include replacement drafts and use their
selected workflow and ruleset versions. A draft selecting a different workflow
does not remove the effective call's preview from its existing workflow.
Eligibility source contexts carry the exact draft or publication identifier.

## Migration requirements

Apply `0185_asset_version_metadata.sql` and
`0186_funding_call_integration_versions.sql` through the normal migration runner
before starting this code. Both migrations are registered in the journal and
verified against PostgreSQL, including repeat execution.

Metadata backfills capture the legacy values still available. Names overwritten
by the previous shared-definition model cannot be reconstructed by this change.
Integration migration retains original binding identities and execution-history
references, associates legacy settings with matching historical publications,
and creates independent copies for pending replacements. Previously overwritten
integration settings likewise cannot be reconstructed without historical evidence.

These migrations have not been applied to the running application database in
this follow-up. Application/container rebuild and deployment remain necessary
to activate this code; no production build or deployment was requested or run.

## Verification evidence

- 712 unit tests passed across 167 files covering forms, eligibility, funding
  calls, workflow definitions, submission snapshots, application form handling,
  and stage activation. The stale shared date-picker assertion now checks the
  current rendered input and passes. An additional work-queue run passed all
  54 tests across 14 files after the exact-version task form-name correction.
- 13 PostgreSQL integration tests passed across six files using disposable
  schemas and synthetic data. Coverage includes metadata isolation and immutable
  history, replacement integration bindings, application pins, previews,
  approval/publication, call-wide dates and controls, legacy backfills, and
  repeat migration execution. A final focused database rerun also passed after
  adding replacement-context projection and current-version clone assertions.
- Full lint passed with zero errors and 23 existing warnings. Final touched-file
  lint also passed. Type checking passed.
- Architecture and form architecture gates passed for 1,767 source files;
  file-size checks passed for 2,596 handwritten files. Changed versioning
  functions satisfy the 200-line limit; unrelated reporting edits were excluded
  from the additional function-size inspection.
- `git diff --check HEAD` passed.

This record accepts the implementation and local automated checks for the
three identified gaps. Browser, rebuilt-container, and production acceptance
were not performed.
