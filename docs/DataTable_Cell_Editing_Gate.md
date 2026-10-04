# DataTable cell editing — verification

Date: 2 October 2026

## Accepted behavior

- Extend the existing generic TanStack DataTable; reuse the existing buttons,
  inputs, select, and field-error components.
- Columns opt into editing through their `editor` definition. Other columns
  remain read only. Row-specific eligibility is optional.
- A save callback and stable row key enable editing. Saving remains owned by
  the consuming feature and its existing query mutation.
- React Hook Form and a Zod resolver validate each cell. Save failures preserve
  the edit for retry; pending saves disable controls; unchanged values skip saves.
- Compact rows are the default. The table scrolls within its container when
  needed and preserves sorting, expansion, toolbar, footer, and custom rendering.
- Move the table and its toolbar into `src/shared/ui`, updating existing imports.

## Evidence

- Architecture and form boundary checks passed for 1,231 source files.
- File-size check passed for 1,718 handwritten files.
- Lint passed with 17 existing warnings and no errors.
- Standalone type checking passed after Next.js regenerated its route types.
- The production build passed after the final submit-handler correction, including
  TypeScript checking and generation of all 83 static pages.
- Focused DataTable tests: 2 files, 10 tests passed. The editing suite also passed
  after the submit-handler lint correction.
- Full test run: 432 files passed, 28 skipped, 1 failed; 1,596 tests passed,
  83 skipped, 1 failed.
- The single failure is the existing completed-task markup assertion in
  `tests/unit/ui/workflow-task-decision-actions.test.tsx`: expected empty markup,
  received `<div class="space-y-4"></div>`. The test and its component match HEAD;
  the failure reproduces independently of the table tests.
- `git diff --check` passed.

## Acceptance limits

The reusable UI behavior and focused automated verification are accepted.
The full repository test gate remains unsuccessful because of the unrelated
workflow assertion above. Browser visual acceptance and deployment are not
claimed. Existing screens require explicit column editors and a save mutation
to enable editing; no domain write endpoints or permissions were changed.
