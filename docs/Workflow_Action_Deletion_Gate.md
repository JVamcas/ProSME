# Workflow action deletion

Date: 2026-10-03

## Acceptance

- Deleting any workflow action removes the selected action, every transition
  using it on its source stage, and its task bindings. Same action keys on other
  stages remain intact.
- The delete command receives only the selected stage/action and version data.
  The server derives the updated graph from the stored draft. Unrelated draft
  validation errors cannot prevent deleting an action.
- Existing update permission checks, template/version ownership, draft-only
  editing, optimistic concurrency, transactional persistence, and audit writing
  remain enforced through the existing workflow repository.
- Publication and ordinary graph-update validation remain unchanged. Outstanding
  configuration errors still appear in the returned editor validation.
- Successful deletion refreshes both the default and selected-version editor
  caches. Failures leave the confirmation open with the server error.

## Verification

- Focused service, route, and UI tests: 24 passed across three files.
- Changed-file ESLint passed.
- Architecture and form-boundary checks passed for 1,305 source files.
- Type checking reports only the existing incomplete `AuthenticatedUser` fixture
  in `WorkflowAssignedProgress.test.ts:23`; the deletion files have no reported
  type errors.
- Full lint reports six existing `react-hooks/refs` errors in
  `WorkflowGraphViewport.tsx` and 17 warnings outside this change.
- File-size checking reports the existing 316-line
  `application-submission-database.test.ts` against the gate's 300-line limit.
  Files added or modified for deletion meet the file limits.
- Production build intentionally omitted at the user's request.
- Full suite with two workers: 1,951 passed, 153 skipped, and five failed in four
  unrelated files covering funding-opportunity UI, workflow public-status UI,
  and the existing API-namespace architecture assertion.
- Git whitespace checks passed.
