# Published version editing uses the selected source

Date: 2026-10-10

Editing a published form, workflow template, or eligibility ruleset now
creates a draft with persisted `sourceVersionId` provenance and copies that
exact source's metadata and configuration. Repeated editing resumes only
the draft from the same source. Drafts from other published versions remain
separate and retain their edits. Version numbering still advances across
the definition's complete history. Eligibility clone responses select the
returned draft ID explicitly rather than reloading the latest version.

The funding call history ActionMenu now offers Edit with the selected
publication ID. The protected command requires that ID, verifies its owning
call, and copies its snapshot and version-specific integration bindings.
The current publication, effective dates, identity and URL remain effective
while the replacement goes through fresh approval and separate publication.
The existing one-pending-replacement rule is retained: a replacement from
another source produces a conflict instead of silently opening that draft
or discarding it.

Migration `0187_version_draft_sources.sql` adds immutable source references
and replaces definition-wide form/ruleset draft uniqueness with uniqueness
per source. Workflow drafts use the same source constraint. Unknown legacy
asset provenance remains unknown; those drafts are preserved and never
substituted for a requested published source. Legacy funding call provenance
is available from the prior one-replacement/current-publication model.
Version schemas were split within the eligibility infrastructure module to
meet the repository's file-size gate.

Verification and acceptance:

- A broad run passed 540 tests in 133 files for forms, eligibility, funding
  calls and workflow cloning. Additional workflow/editor/route runs passed
  207 tests in 40 files, followed by 44 tests in four files after tightening
  the transport requirement. These runs overlap and are not additive counts.
- The final PostgreSQL run passed 23 tests in nine files using disposable
  schemas. It covers selected old sources while newer publications/drafts
  exist, repeated/concurrent cloning, exact form content, ruleset inputs,
  workflow graph and metadata, targeted draft saves, immutable provenance,
  legacy draft preservation and repeatable migration, historical call
  replacement, publication isolation, application pinning, integration
  bindings, graph projections and action deletion.
- Full lint passed with zero errors and 23 existing warnings; final focused
  lint passed. Type checking passed. Architecture and form gates passed for
  1,772 source files; file limits passed for 2,606 handwritten files. All
  420 functions in changed TypeScript files are within 200 lines; the largest
  is 174 lines. `git diff HEAD --check` passed.

This record accepts the implementation and local automated evidence.
Apply migration 0187 before running the updated application. No production
build, browser acceptance or GCP deployment was performed.
