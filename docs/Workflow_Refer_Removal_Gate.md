# Refer action removal

Date: 2026-10-03

## Accepted behavior

- Refer is no longer offered in the workflow action designer, default common
  actions, standard workflow templates, or task action menus.
- The standard approval-stage action previously labelled “Refer back to
  committee” is now a Return action labelled “Return to committee”. It uses the
  normal Return destination and Retain/Clear behavior.
- Runtime input validation and server policy reject attempts to execute a
  historical Refer definition.
- Migration `0154_remove_refer_action.sql` disables Refer definitions in
  editable drafts without deleting definitions, executions, referrals, or
  audit history. Published and retired versions remain immutable; runtime
  filtering and policy prevent their historical Refer definitions from running.
- Historical Refer definitions remain readable so old workflow versions and
  audit records can still be inspected. Existing referral completion and
  unblock/return cleanup remains in place for referrals already in progress.
- Draft and publication validation reject Refer actions so they cannot be
  introduced through a direct API request.

## Verification evidence

- Focused workflow tests: 56 passed across nine files. Designer and action UI
  tests also passed, including explicit coverage that Refer is absent and
  rejected.
- PostgreSQL workflow tests: 20 passed across Return destination selection,
  rework retention, and historical referral completion routing.
- The local migration image was rebuilt after narrowing migration 0154 to
  editable drafts. Application and Payload migrations then completed with exit
  code 0; the app and scheduler both reported healthy.
- Architecture and form-boundary checks passed for 1,300 source files.
- Changed-file ESLint passed. Full lint continues to report six unrelated
  existing `react-hooks/refs` errors and 17 warnings.
- File-size checking reports only the unrelated 316-line application submission
  database test. All files changed for this removal meet the limits.
- Workspace type checking reports only an unrelated incomplete
  `AuthenticatedUser` fixture in `WorkflowAssignedProgress.test.ts:23`.
- Full serial suite: 1,932 passed, 153 skipped, and five failed in four unchanged
  files covering funding-opportunity UI, workflow public-status UI, and the
  existing API-namespace architecture assertion.
- Production build passed in an isolated workspace snapshot.
