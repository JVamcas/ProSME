# Workflow instance visual flow controls — verification

Date: 2 October 2026

## Accepted behavior

- Workflow instances reuse the definition editor's visual flow toolbar,
  including its description, show/hide toggle, Auto arrange button, and stage
  count badge. The toolbar now lives in the workflow module's UI folder.
- Instances retain their existing expanded default. Hiding the graph preserves
  selected stage details and task assignments.
- Auto arrange restores the calculated layout after dragging and opens a
  collapsed graph. Stage selection, status colors, and recorded route
  highlights remain available.
- The badge counts graph definition stages, so repeated runtime stage runs do
  not inflate the count. Instances without graph data omit the toolbar.

## Evidence

- Architecture and form boundary checks passed for 1,233 source files.
- File-size checks passed for 1,724 handwritten files.
- Lint passed with no errors and 17 existing warnings.
- Type checking and the production build passed.
- Focused controls, progress-panel, and definition configuration tests passed:
  13 tests across three files. The controls tests exercise pointer dragging,
  layout restoration, expansion, repeated-run counts, and missing graph data.
- Full default suite: 434 files passed, 29 skipped, one failed; 1,611 tests
  passed, 86 skipped, one failed. The existing
  `workflow-task-decision-actions.test.tsx` failure expects empty markup after
  task completion, while its component renders an empty wrapper. This failure
  was already recorded in `Workflow_Progress_Responsive_Width_Gate.md`.

## Acceptance and limits

The scoped toolbar behavior is accepted on the component interaction tests
and architecture checks. The full suite is not accepted because of the
unrelated existing failure. No deployment or authenticated browser verification
is claimed.
