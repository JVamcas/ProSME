# Workflow progress: current stages, returns and planned assignments

Date: 2026-10-03

## Accepted source behavior

- The sidebar, graph status and summary use one latest run per stable stage key.
  Stage numbering uses definition sequence rather than the number of runs.
  Current active and blocked stages remain independently visible for parallel work.
- Prior runs are accessible through expandable run history. Historical details
  explicitly identify their run, retain timestamps and show their task evidence.
- The progress projection identifies Return closures using persisted workflow
  rework records scoped to the source run and workflow. These runs display
  Returned for correction and Returned at, are excluded from the completed count,
  and explain that another review follows correction. Historical return runs
  display a history explanation rather than implying they still await review.
- Existing runtime persistence and audit remain unchanged. RETURNED is a progress
  read-model status, not a new database lifecycle status. Existing returned
  records are supported without rewriting historical decisions or a migration.
- A replacement task hides its predecessor only within the same stage instance.
  Rework tasks in later runs no longer suppress historical assignments. Existing
  review-release behavior and server permission checks remain in effect; returned
  runs do not allow active task execution.
- Stages awaiting activation project task definitions from the instance's pinned
  workflow version, including configured role/named-user labels and reviewer
  count. Their task rows display Waiting, explain activation-time assignment,
  and have no task-instance link. This preview does not allocate reviewers or
  create runtime records early.

## Verification and acceptance

- Focused tests: 25 passed across six files. Coverage includes current stage
  selection, summary counts, historical inspection and assignments, Return
  timestamps/status, waiting assignment previews without task links, generated
  SQL scope and joins, task replacement scope, review release, permission checks,
  and visual flow selection/toggling.
- Focused ESLint passed for changed workflow source and tests.
- Architecture and form boundary checks passed for 1,311 source files.
- Changed files pass the file-size gate. The repository gate still rejects the
  unrelated application-submission-database.test.ts at 316/300 lines.
- Full lint: six existing WorkflowGraphViewport.tsx ref-access errors and
  20 warnings outside this focused change.
- Full type checking before waiting previews: only the existing incomplete
  AuthenticatedUser fixture in WorkflowAssignedProgress.test.ts:23 failed.
- Full suite before the final waiting-preview additions: 1,969 passed, 173
  skipped, 21 failed. One failure expected duplicate sidebar entries; its
  expectation was updated and all four visual-flow tests passed on the focused
  rerun. The other 20 failures concern existing funding UI, portal navigation,
  work queue status, public stage status, task progress tab and API conventions.
  The repository-wide suite is not accepted as green.
- Production build compiled successfully; final result pending TypeScript.

Acceptance is limited to the verified source behavior. Live authenticated
browser execution and deployment of this change are not verified.
