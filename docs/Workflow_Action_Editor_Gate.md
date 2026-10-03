# Workflow action editor verification — 3 October 2026

## Requested behavior

- Remove the editable stable-key field from task action details.
- Reuse `uniqueStableKeyFromLabel` to generate stage-unique action keys from
  button labels. Keep existing action keys when editing labels so routes and
  task bindings remain stable.
- Entering Review through Continue or the step marker must leave changes
  unsaved. Only an explicit Save action submission may persist the graph.

## Implementation and evidence

The feature remains in `modules/workflows/ui/definitions`. The dialog composes
step views and delegates editor state to `useWorkflowActionDialog`. The existing
form mapping builds the updated graph. React Hook Form and the Zod resolver
continue to own form validation. Continue and Save use distinct React keys, and
submission checks the Save action button as the submitter before invoking React
Hook Form.

Regression tests cover automatic collision handling, task bindings, label
normalization, navigation into and out of Review, implicit submission, explicit
saving, and preservation of edited action keys and existing routes.

- Architecture and form architecture checks: passed.
- File-size check: passed; affected functions are below 200 lines.
- Lint of the six changed implementation/test files: passed.
- Type checking: passed.
- Focused action editor/path tests: final rerun passed all seven tests.
- Repository lint: failed with six existing `react-hooks/refs` errors in the
  untouched `WorkflowGraphViewport.tsx`, plus 17 warnings.
- Full test run: 1,792 passed, 115 skipped, three failed. Failures are in
  `funding-opportunity-card.test.tsx` and `funding-opportunity-detail.test.tsx`,
  outside this change.
- Production build: passed (exit code 0), including compilation, TypeScript,
  page generation, and build traces.

## Acceptance

The scoped editor change is accepted based on seven passing regression tests,
passing type checking, architecture checks, changed-file lint, and the production
build.
Whole-repository acceptance is not claimed while the unrelated lint/test
failures remain. No database, permission,
route-ownership, or top-level architectural boundaries changed.
