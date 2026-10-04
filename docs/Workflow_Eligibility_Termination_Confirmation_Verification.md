# Eligibility termination confirmation — verification

Date: 3 October 2026

## Behavior

- A reviewer running authoritative eligibility sees a confirmation dialog when
  the pinned ruleset produces a hard failure. The dialog starts at 30 seconds
  and displays the remaining time.
- Continue confirms immediately. Reaching zero confirms once. Cancel, closing
  the dialog, changing tasks, or leaving the task stops the pending countdown.
- Cancel preserves the captured answers in the form and leaves the task
  available for correction and another evaluation. Autosave pauses while the
  confirmation is open and resumes after cancellation.
- The unconfirmed evaluation raises an internal rollback signal from inside
  the transaction. Temporary answer saves are rolled back; no outcome, task
  completion, termination, terminal audit, or notification is committed.
- Confirmation submits the captured answer snapshot with the existing expected
  task and response versions. The backend checks permissions, assignment, COI,
  prerequisites, versions, and re-evaluation policy again before evaluating.
- Confirmed hard failures retain the existing atomic evaluation, termination,
  audit, notification, and idempotent receipt behavior. Passing evaluations and
  soft failures continue through the existing path.
- Both the bound verification form and standalone eligibility task use the
  same confirmation hook and shared confirmation-dialog primitive.

## Evidence

- Architecture and form boundary checks passed.
- Handwritten file-size checks passed.
- Type checking passed.
- Lint of the changed implementation and test files passed.
- Focused server, form, route, and dialog suites passed: 30 tests. The final
  dialog rerun passed six cases, including snapshot preservation and task changes.
- Full suite with two workers: 452 files passed, one failed, 32 skipped; 1,730
  tests passed, two failed, 115 skipped. The failures are in the unchanged funding
  opportunity card tests: the expected closing-date label and a text-based
  lookup of the now icon-only save button.
- Full lint reports six existing `react-hooks/refs` errors in the unchanged
  `WorkflowGraphViewport.tsx` and 17 existing warnings.
- `git diff --check` passed.

## Acceptance limits

The scoped automated checks support the requested confirmation behavior.
Repository-wide acceptance remains blocked by the existing lint and funding
opportunity card test failures. No deployment, live browser acceptance, live
notification delivery, or new PostgreSQL integration execution is claimed.
The countdown belongs to the open reviewer dialog; it is cancelled when the
task is unmounted. No schema change or database migration is required.
