# Return to the previous stage and onward rework

Date: 2026-10-03

## Accepted source behavior

- Return targets an immediate predecessor in normal workflow progression.
  For A -> B -> C, C may Return to B, but cannot skip B and Return to A.
  Display ordering does not establish predecessor relationships. Return and
  historical Refer transitions do not create normal progression edges.
- Definition validation, the route editor, runtime availability, and server
  execution enforce this restriction. Runtime additionally requires a completed
  destination iteration in the same application and pinned workflow version,
  with no active or blocked iteration there. Parallel joins can have multiple
  immediate predecessors; Return selects exactly one eligible predecessor.
- After C returns work to B, completing corrected B follows its configured
  normal transition and creates a fresh C iteration with new pending tasks.
  Previously completed C is not reused. Rework also applies to stages normally
  configured as nonrepeatable, without changing ordinary repetition rules.
- An already active or blocked successor is reused to avoid duplicate tasks.
  Iteration selection runs after the workflow activation lock. Activation,
  task creation, configured data retention, audit, and notification capture
  remain inside the existing transaction.
- Correction context ends when the returning stage is reviewed again.
  Nested returns unwind to the outer correction, so C -> B -> A followed by
  A -> B -> C still creates fresh reviews. Context lookup stays within the
  workflow and terminates safely if historical context is cyclic.
- Prior stage iterations, decisions and task evidence remain historical.
  Retain/Clear initializes only new working records using the existing policy.
  Return follows normal configured transitions; it does not introduce Refer's
  automatic handoff to a referrer.
- The standard Moderation return now targets Due Diligence and Risk, its
  immediate predecessor. Existing published definitions are not rewritten;
  Return configurations that skip a stage are rejected and need correction.

Return now interrupts incomplete source work instead of requiring ordinary
stage completion. See [Workflow_Return_Control_Actions_Gate.md](Workflow_Return_Control_Actions_Gate.md)
for the current source closure, task cancellation, configured reason and action
placement behavior.

## Verification

- Focused tests passed: 66 tests across 12 files. Coverage includes immediate
  predecessor validation and editor options, fresh successor tasks, nested
  returns, active successor reuse, ordinary repetition, and services affected
  by extracting review threshold persistence into its own repository.
- PostgreSQL regression passed: 16 assertions using the actual destination,
  iteration selection and continuation projection SQL. Session-local temporary
  fixtures and functions were rolled back. Coverage includes skipped-stage
  rejection, misleading display order, workflow scope, completed/cancelled
  iterations, active/blocked reuse, nested contexts and cyclic contexts.
  Repeatable integration coverage is in workflow-control-destinations.test.ts
  and workflow-rework-iterations.test.ts; the latter is enabled with
  RUN_WORKFLOW_REWORK_ITERATION_DATABASE_TESTS=true and DATABASE_URL.
- Changed workflow source and tests passed ESLint with no warnings or errors.
  Full lint still reports six existing react-hooks/refs errors in
  WorkflowGraphViewport.tsx and 17 warnings.
- Architecture and form boundary checks passed for 1,308 source files.
- All changed files meet the file-size gate. The repository gate still reports
  the unrelated application-submission-database.test.ts at 316/300 lines.
- Type checking reports the existing incomplete AuthenticatedUser fixture in
  WorkflowAssignedProgress.test.ts:23; no other type errors were reported.

- The final full suite completed: 1,947 passed, 173 skipped, 18 failed across
  six files outside this change (funding card/detail, portal navigation, work
  queue status, workflow public status and API namespace conventions). No
  focused Return or affected-service tests failed. Repository-wide tests are
  not accepted as green.
- Both staged and unstaged whitespace checks passed.

## Runtime and acceptance limits

The production build was not run, as requested. The running Docker application
has not been rebuilt or switched to this source. Live authenticated browser
execution is not verified. Acceptance covers the tested source behavior;
repository-wide checks are not claimed as fully green.
