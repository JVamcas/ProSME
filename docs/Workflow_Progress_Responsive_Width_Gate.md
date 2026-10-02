# Workflow progress responsive width — verification

Date: 2 October 2026

## Accepted behavior

- Application detail tabs use a single grid column that can shrink to the
  available width instead of adopting the workflow canvas's intrinsic width.
- Workflow progress, its visual flow, and selected stage details stay within
  their containing column. The graph and task table scroll internally.
- Stage navigation and details stack below the desktop breakpoint. Mobile
  padding leaves more room for content; the graph viewport retains its
  existing 560px maximum height.

## Evidence

- Architecture and form boundary checks passed for 1,232 source files.
- File-size checks passed for 1,721 handwritten files.
- Lint passed with no errors and 17 existing warnings; a subsequent quiet
  lint run also passed.
- Type checking and the production build passed.
- Workflow progress and graph unit tests: 15 passed across two files.
- Chromium layout tests passed at 390px, 820px, and 1440px using the actual
  application detail and workflow progress components with compiled platform
  CSS. They verify page width, graph scrolling, viewport height, and task-table
  containment.
- Full default suite: 432 files passed, 28 skipped, one failed; 1,601 tests
  passed, 83 skipped, one failed. The failure is the unrelated
  `workflow-task-decision-actions.test.tsx` assertion expecting empty markup
  after completion; the existing component renders an empty wrapper.
- Existing working-tree changes were preserved.

## Acceptance and limits

The scoped width correction is accepted on the automated layout evidence.
Browser tests use server-rendered component markup with the workflow tab
revealed directly; they do not claim authenticated navigation or hydration
coverage. No deployment or full-suite acceptance is claimed.

Run the opt-in browser suite with:

```sh
RUN_WORKFLOW_RESPONSIVE_TESTS=true npm test --workspace @prosme/platform -- tests/unit/workflows/WorkflowProgressResponsive.test.tsx
```

Chromium and its system libraries must be available. Verification in this
environment used temporary copies of missing libraries under `/tmp`, because
system installation required a sudo password.
