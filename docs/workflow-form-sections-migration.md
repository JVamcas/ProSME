# Workflow task form sections — implementation and local migration

Date: 2026-10-13 (Africa/Johannesburg).

## Behavior

Converted workflow stages expose Tasks and Actions. Each task's Attached form link
opens its exact form version. Existing legacy versions retain their
original editors and runtime behavior. New review tasks use form sections.

Forms support `SCORE` and `SCORING_AGGREGATE`. An aggregate references score keys
in its own form, with sum, average, weighted sum, or weighted average, explicit
raw/percentage normalization, missing-score handling, and decimal precision.
Aggregate sources cannot be other aggregates. Values are read-only in the UI and
recomputed on the server; submitted totals are not trusted.

Workflow document fields reuse the existing evidence upload/download service and
retain uploader, verifier, expiry, activation-request, template, and file policies.
Evidence identifiers are resolved server-side for the current task and run.
Document requirements are projected from the form for draft editing and refreshed
transactionally before workflow publication. Historical evidence is not moved or
recreated. Ordinary document fields continue to use their existing form behavior.

## Conversion

The operator command creates separate workflow drafts and task-specific form
drafts. It does not overwrite source drafts, publish configuration, rebind funding
calls, or rewrite active/completed task responses.

- The source is every unmigrated workflow draft, plus the latest published version
  of a definition when it has no newer draft/published version.
- Existing task forms are copied from their exact binding. Existing sections,
  fields, rules, options, display mode, submission mode, and context bindings are
  retained. Shared forms receive separate task-specific copies.
- Converted sections follow the task's saved section order. Existing form sections
  stay together at the original Form position, preserving their internal order.
- Checklist acceptance remains a checkbox; configured non-boolean responses and
  notes have fields. Mandatory acceptance still requires true.
- Score ranges, weights, and required criterion comments are retained. Migrated
  aggregate calculations use the configured method on raw marks. New aggregates
  offer percentage normalization explicitly.
- Duplicate legacy inline scoring is reconciled against the tab criteria. Conflicts
  fail conversion instead of silently selecting a definition.
- Exact checklist/scoring/comment references in workflow conditions and context
  bindings are rewritten to their new form keys, including reviewer slots.
- Inherited eligibility forms retain their funding-call binding. Conversion fails
  explicitly if such a task has legacy tab work requiring additional handling.
- Each workflow conversion and its audit/mapping records commit atomically.
  `app_workflow_form_migrations` makes reruns a no-op for converted sources.

Run application schema migrations first, using the normal `db:migrate` command.
Then, from `apps/platform`, with the configured database environment available:

```sh
NODE_OPTIONS=--conditions=react-server node --env-file-if-exists=../../.env \
  ../../node_modules/payload/bin.js run ../../scripts/seed/migrate-workflow-forms.ts
```

This defaults to a dry run. Set `APPLY_WORKFLOW_FORM_MIGRATION=true` to apply it.
Publish the converted forms before publishing and binding the new workflow
version. Existing versions remain available for current applications.

## Local database evidence

Target: local Docker PostgreSQL database `smefund-local-db` / `smefund`.
No GCP or production environment was changed.

The standard runner applied pending application migrations 0200–0206. This also
applied the previously pending 0205 business-profile position/member migration.
The new 0206 schema was first tested inside a rolled-back transaction.

Conversion results:

| Check | Result |
| --- | ---: |
| New workflow drafts | 4 |
| New task form drafts | 30 |
| Forms extending an existing exact form version | 22 |
| Original fields compared with their converted copies | 144 |
| Original-field mismatches | 0 |
| Converted tasks retaining legacy checklist/comment/scoring tables | 0 |
| Converted forms accepted by the editor schema and renderer parser | 30 |
| Changes created on a second apply run | 0 |

Counts and comparison fingerprints matched before/after for original workflow
versions, runtime workflow instances/tasks, form responses, document evidence,
and original form versions. No applicant data was exported into this repository.

## Acceptance boundaries

Architecture boundary, form architecture, and component reuse checks passed.
The broader forms/workflows/work-queue suite passed 1,226 tests, with six skipped.
An additional focused run passed 99 tests, and the final work-queue run passed
61 tests after the result-parser extraction. Final type checking and architecture
checks passed. Lint completed with no errors and 17 existing warnings.

All changed source meets the AGENTS limits of 600 implementation lines, 400 test
lines, and 200 lines per function. The older `check:files` script still fails on
two unchanged tests under its 300-line test limit:
`ServerApplicationDocumentService.test.ts` (400 lines) and
`ServerFormsService.test.ts` (363 lines). These unrelated files were not modified.

The local running app uses an existing built container image; it has not been
rebuilt or redeployed. No production build or browser installation was run.
Browser and deployed-image acceptance remain pending. This record is technical
source/database evidence, not a claim of browser or production acceptance.

## Standard document settings

Migration `0207_document_upload_settings.sql` adds the form field's `uploaded_by`
setting and the workflow requirement's `max_pages` and `accepted_extensions`
projections. Apply it before running the updated application. This migration
adds nullable columns and constraints; it does not rewrite published forms,
workflow versions, responses, or uploaded evidence.

The document editor uses the standard allowed extensions, maximum pages, and
maximum file size fields, plus Uploaded by: Applicant, Any, or Assigned reviewer.
The separate workflow-evidence settings panel is removed. Existing document
links retain their stable keys. Legacy settings remain a fallback for versions
that have not been edited; edited documents use the standard fields. New task
form documents no longer need a separate workflow-evidence opt-in.

Any permits the existing authorized reviewer upload and owner-scoped applicant
RFI upload paths. It does not grant additional permissions or bypass ownership
or task assignment. Both upload paths validate extensions, size, content type,
file signature, and configured PDF page limits before storage.

The new migration has not been applied as part of this editor change. Browser,
running-container, and deployment verification remain separate acceptance steps.

Verification for this settings change: 371 broader tests passed, followed by
8 focused tests for the final upload and workflow-definition projection checks.
Final type checking, architecture boundaries, form architecture, and component
reuse checks passed. Full lint reported no errors and 17 existing warnings;
focused lint for the final changes passed. The file-size gate still flags the
two unchanged tests listed above under its older 300-line limit.

## Controlled GCP conversion — 2026-10-14

Executed at the user's request against project `msmepro`, application VM
`prosme-vm`, deployment `/opt/prosme-dev`. This section supersedes the earlier
local-only status for this operation; it is not publication or browser acceptance.

The deployed migration image was pinned to
`sha256:11e8ca06c0233f329e08822dc3aa7247530fae01e91e34a5c353cae127f9b1be`.
The host conversion entrypoint and repository implementation matched the local
file hashes. The Dockerfile had omitted the entrypoint from its explicit COPY
list. That omission is fixed in source; this operation used disposable containers
with the entrypoint supplied separately, without rebuilding the running app.

The initial dry run identified exactly two sources and 12 task forms per source.
The first apply attempt rolled back because the existing document constraint
rejected `JPEG`, which form document projection already supported. Database counts
confirmed zero conversion records, four workflow versions and 21 form versions
after that rollback.

Migration `0208_workflow_document_projection_constraints.sql` aligns document type
and uploader constraints with the supported domain choices. Its PostgreSQL test
ran against a temporary table with `search_path = pg_temp` and rolled back. It
verified legacy preservation, all supported choices, invalid-value rejection and
repeat execution. The correction was then applied with the standard Drizzle
migrator after checking the exact 0207 ledger baseline. The recorded 0208 ledger
timestamp is `1801785600054`.

The conversion was pinned to the source IDs below, with an immediate dry-run
recheck, a five-second database lock timeout and a two-minute statement timeout.

| Workflow | Source | Converted draft |
| --- | --- | --- |
| SME Fund Standard Application Workflow | v3, `8f139b3f-4607-4762-b72d-e28c27b8ffe7` | v4, `bc7ccb81-78bf-4111-b601-37d97cb05f90` |
| Copy of SME Fund Standard Application Workflow | v1, `526278ce-7817-4bd9-b9ea-a6aafe98e475` | v2, `10fa83ef-3452-4771-a0aa-15c09efb2165` |

Verified results:

- Two workflow drafts and 24 task-form drafts created; 18 extend existing forms.
- All original row fingerprints across the 54 checked workflow, form, runtime,
  evidence and assignment tables remained present unchanged.
- All 118 original form fields matched their copies, excluding new record IDs
  and version/section foreign keys. All 26 original sections matched, excluding
  new IDs and their intentional position within the combined task form.
- The editor's legacy-tab predicate is false for every converted stage. Form-backed
  document policy projections remain for evidence/RFI behavior.
- Both per-source repeat executions skipped with zero new forms, and the source
  discovery query returned no remaining candidates.
- All 24 new forms and both new workflows remain DRAFT. No publication or funding
  call switch was performed. Older versions retain their legacy editors.
- App and scheduler containers remained healthy; neither was restarted.

Local validation: 19 focused tests passed; the isolated PostgreSQL migration test
passed; architecture boundaries, form architecture, component reuse and type
checking passed. Type checking required a 2560 MB Node heap after a 1536 MB attempt
exhausted its heap. Full lint had zero errors and 17 existing warnings; focused
lint passed after the schema/test change. No production build or browser check
was performed. Docker packaging is source-reviewed, not rebuilt-image verified.

Review the converted form/workflow drafts before publication and binding. The
running environment has migration 0208; retain this migration and its journal
entry in the next deployment so source and database history remain aligned.
