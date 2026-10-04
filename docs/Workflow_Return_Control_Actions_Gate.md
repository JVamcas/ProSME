# Return control behavior and task action placement

Date: 2026-10-03

## Accepted behavior

- Return is a common control action. It no longer completes a review task or
  requires completed forms, eligibility evaluation, contributing tasks, review
  thresholds or the normal stage exit condition. Existing permission,
  assignment, workflow state, configured conditions and immediate-predecessor
  destination checks still apply on the server.
- Executing Return closes the current source iteration as Completed with an
  explicit RETURN closure reason and recorded action. All unfinished tasks in
  that iteration become Cancelled; completed tasks and saved evidence stay
  historical. Required tasks are not falsely marked successfully completed.
- Source closure, task cancellation, new predecessor iteration, action/decision
  record and rework audit run in the existing transaction. A stale source or
  failed destination activation rejects the action without partial writes.
- The correction still targets only an eligible immediate previous stage and
  retains the previously tested fresh onward review behavior, including nested
  returns and Retain/Clear settings.
- Decision actions appear only on the final task step. When the form is the
  last task section, its own final form step must also be selected. Controls
  remain in the same action menu throughout navigation. Going back hides
  decisions again without unmounting the action dialog. Tasks without step
  navigation show their configured actions together.
- Controls do not run the form completion callback. Return's optional/required
  reason behavior follows the action's reasonRequired configuration in the
  definition, server input validation, metadata and dialog schema.
- New stage defaults automatically include enabled Return for correction,
  with Retain as its initial data setting and an optional reason. Both settings
  remain configurable. Common-action reconciliation binds it to new tasks.
  Standard stages reuse existing configured Return actions rather than adding
  a duplicate generic Return; their bindings include contributing tasks.
- Existing published definitions and application records are not rewritten.
  No schema change or migration is needed for these existing statuses/fields.

## Verification

- Focused tests passed: 106 tests across 19 files. Coverage includes interruption
  of incomplete review, stale/unauthorized/context-mismatched requests, required
  task cancellation versus ordinary completion, optional/required Return reasons,
  automatic creation and binding, normal action behavior, outer and inner step
  navigation, dialog persistence, and fresh onward iterations.
- Architecture and form boundary checks passed for 1,311 source files.
- All changed implementation and test files meet the file-size gate. The
  repository gate still reports application-submission-database.test.ts at
  316/300 lines, outside this change.
- Full lint still reports six existing react-hooks/refs errors in
  WorkflowGraphViewport.tsx and 17 warnings; no changed-file errors were reported.
- Final type checking reports only the existing incomplete AuthenticatedUser
  fixture in WorkflowAssignedProgress.test.ts:23.
- Full-suite run completed with 1,957 passed, 173 skipped and 19 failures.
  Eighteen failures remain in six unrelated UI/architecture files. The remaining
  failure was an old Return test fixture still mocking normal stage completion;
  it was updated to mock interrupted stage closure and its three runtime-choice
  tests passed on rerun. All changed workflow tests pass in focused verification.
- Both staged and unstaged whitespace checks passed.

## Runtime limits

No production build was run, as instructed. The running Docker application has
not been rebuilt or switched to this source. Live authenticated browser execution
is not verified. Acceptance covers tested source behavior; broader repository
checks are not claimed as fully green.
