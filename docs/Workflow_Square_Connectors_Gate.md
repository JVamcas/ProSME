# Workflow square connectors — verification

Date: 2 October 2026

## Accepted behavior

- Workflow connectors follow horizontal and vertical segments with small
  rounded corners, matching the supplied screenshot.
- Forward routes bend between cards. Return and explicit detour routes use
  the same style while retaining their clearance below cards.
- Corner rounding shrinks for short segments. Arrowheads, route status
  styling, labels, and interactive path hit areas remain supported.

## Evidence

- Focused geometry, graph layout, and visual graph tests: 21 passed.
- Geometry coverage includes upward/downward branches, aligned stages,
  short segments, backward routes, and explicit detours.
- Architecture and form boundary checks passed for 1,232 source files.
- File-size checks passed for 1,722 handwritten files.
- Lint passed with no errors and 17 existing warnings.
- Type checking and the production build passed.
- Full suite: 433 files passed, 29 skipped, one failed; 1,607 tests passed,
  86 skipped, one failed. The previously documented unrelated
  `workflow-task-decision-actions.test.tsx` failure expects empty markup for
  a completed task, while the component renders an empty wrapper.
- Existing working-tree changes were preserved.

## Acceptance and limits

The scoped connector geometry change is accepted on the automated evidence.
No browser screenshot comparison, deployment, or full-suite acceptance is
claimed. The outstanding full-suite failure is outside this change.
