# Eligibility evidence and stage completion readiness

Date: 2026-10-03

## Finding and change

Read-only inspection of the reported local task's stage found a completed
contributing screening task whose draft form values matched its recorded
eligibility evaluation. Its configuration identifies eligibility work through
`formPurpose: ELIGIBILITY_VERIFICATION`, without an explicit command.

The task detail projection and domain registry recognise this supported
configuration. Stage completion and action task readiness recognised only
`command: AUTHORITATIVE_ELIGIBILITY`, so the completed screening task did not
count toward the required stage threshold. The approval menu consequently
reported remaining stage work while the approval task showed all sections ready.

Both readiness projections now recognise either supported eligibility setting.
Draft form evidence must still match the recorded evaluated values. Ordinary
draft forms and changed eligibility evidence remain insufficient. Existing
decision form submission preview, permissions, clearance, reviewer thresholds,
and successor checks are preserved. No application records were modified.
Existing staged workspace changes were preserved.

## Verification

- Database regression: four passed against the existing local test database.
  Temporary tables and a unique helper schema were created inside a transaction
  and rolled back. Cases cover both eligibility settings, changed evidence,
  ordinary draft forms, completed counts, and contributing task identifiers.
- Readiness repository and availability unit tests: 23 passed.
- Focused lint: passed.
- Architecture and form boundary checks: passed for 1,291 source files.
- Type checking: passed, including a rerun after adding the integration test.
- Production build: passed.
- Full test suite: 1,898 passed, 135 skipped, four failed in three unchanged UI
  test files concerning funding opportunity controls/labels and the default
  public stage status description. This is not a full-suite pass.
- Whole-repository lint: failed on six existing `react-hooks/refs` errors in
  unchanged `WorkflowGraphViewport.tsx`, with 17 warnings.
- File-size gate: failed on unchanged
  `tests/integration/application-submission-database.test.ts` (316/300 lines
  under the current gate configuration).
- `git diff --check`: passed.

## Written acceptance

The focused correction is accepted against the database regression, unit tests,
architecture checks, type checking, and production build above. Whole-repository
acceptance remains withheld due to the unrelated failing checks. No authenticated
browser approval was executed. The running localhost:3008 Docker application
has not been rebuilt or restarted; it must load the corrected source before
the UI reflects this fix.
