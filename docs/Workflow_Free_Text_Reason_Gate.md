# Workflow free-text reasons and terminal rejection — 2026-10-03

## Scope and acceptance

Accepted for the requested implementation scope:

- Every action exposes the same **Require a reason** checkbox in Action details.
- Reviewers enter one optional or required free-text reason, up to 4,000
  characters. The configured flag controls client and server validation for
  every action type, including rejection. Reviewer reason codes, hold reason
  lists, and independent action-type reason requirements are removed.
- Execution, control, withdrawal, and audit records retain the supplied reason.
- Terminal rejection settings belong in Routing. Behaviour does not depend on
  the rejection destination. Routing validates terminal applicant status fields.
- Terminal rejection always cancels open stages and tasks. Both cancellation
  checkboxes are removed; transport validation rejects disabled cancellation,
  and the repository cancels outstanding work unconditionally.
- Stage-transition rejection continues through its configured routes.

This is scoped source and automated-test acceptance, not repository-wide gate
acceptance or deployment acceptance. Existing user edits to the Details layout
and removal of the reversal action key are preserved.

## Migration

`0151_workflow_free_text_reason.sql` and its journal entry rename the universal
action flag and reviewer reason columns, backfill previously required reasons,
remove obsolete per-type configuration and unconditional presence constraints,
and enforce terminal cancellation defaults in existing versions.

The requirement backfill only runs while the legacy column exists. Rerunning
the migration preserves administrators' subsequent optional-reason choices.
Historical reason values, comments, and normalized audit payloads remain intact.
Eligibility rule identifiers remain internal machine findings and are separate
from reviewer reasons.

The migration was tested against an isolated PostgreSQL 16 container, including
legacy values, optional records, preservation of history, mandatory cancellation,
and repeat execution. The temporary container was removed after testing.
The application database has not been migrated; apply the migration with the
application update before using the new schema.

## Verification evidence

- Architecture and form boundary gates passed for 1,276 source files.
- File-size gate passed for 1,804 handwritten files.
- Changed-file lint passed.
- Focused workflow and reviewer UI suite: 141 files passed, 545 tests passed;
  two files and four tests skipped. The PostgreSQL migration was separately
  executed successfully rather than relying on its default skipped state.
- Additional execution persistence and unconditional cancellation regressions:
  two files and four tests passed. Cancellation is checked with both true and
  stale false flags; persistence covers omitted and multiline free-text reasons.
- Universal reason validation covers required and optional flags for all ten
  action types, whitespace, length limits, and rejection of reason-code input.
- Production build passed, including compilation, TypeScript, and prerendering.
- Full repository suite: 460 files and 1,814 tests passed; 33 files and 116 tests
  skipped. Four tests failed in untouched funding-opportunity card/detail and
  workflow-stage public-status UI tests.
- Repository-wide lint remains blocked by six `react-hooks/refs` errors in
  untouched `WorkflowGraphViewport.tsx`, plus 17 warnings.
- Standalone type checking remains blocked by the untouched
  `WorkflowApplicantStatusDefaults.test.tsx:175` passing an input with `unknown`
  entry conditions to a function expecting parsed `ConditionGroup | null` values.

Command evidence is available in the session's `/tmp/workflow-reason-*.log`
files. No full-repository passing gate, browser acceptance, live migration,
or deployment is claimed.
