# Decision form readiness

Date: 2026-10-03

## Change

The task progress summary counts a valid saved decision form as ready for
submission with the chosen action. Server action availability previously required
that form to be completed already, disabling the action that submits it.

Availability now previews form submission for the selected stage-decision task.
The prospective stage threshold uses the same preview, scoped to that task only.
Contributing tasks and authoritative eligibility tasks retain their completed-form
requirement. Checklist, comment, open-RFI, quorum, permission, clearance, successor,
and other-task threshold checks retain their existing behavior.

The client requires valid form values and completed review sections before
selection. Its existing action finalizer validates and submits the form on the
server before executing the decision. Execution defaults to strict completed-form
checks; the preview option is supplied only by the availability service.
No database schema or permission changes are required.

## Verification

- Focused repository, availability, and execution tests: 33 passed in three files.
- Focused lint: passed for all six changed TypeScript files.
- Architecture and form boundary checks: passed for 1,291 source files.
- Type checking: passed on rerun after generated Next.js types became available.
  The initial attempt failed on missing generated route types.
- Whole-repository lint: failed on six existing `react-hooks/refs` errors in
  the unchanged `WorkflowGraphViewport.tsx`, with 17 warnings.
- File-size gate: failed on the unchanged
  `tests/integration/application-submission-database.test.ts` (316/300 lines).
- Production build: attempted twice; blocked by another Next.js build holding
  the build lock. No active build was interrupted or its lock removed.
- Full test suite: 1,896 passed, 134 skipped, six failed across five unchanged
  test files. Four assertions concern funding opportunity labels/save controls
  and the default stage public-status description. Two tests timed out in
  `FormPreviewDialog.test.tsx` and `WorkflowStageCardActions.test.tsx`.
  This is not a full-suite pass.
- `git diff --check`: passed.

## Written acceptance

The focused source change is accepted against the regression tests and source
checks above. Whole-repository acceptance is not claimed while broader checks
fail or remain blocked. No authenticated browser acceptance, deployment, or
container restart was performed. Unrelated workspace changes were preserved.
