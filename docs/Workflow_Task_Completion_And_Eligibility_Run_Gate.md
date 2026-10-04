# Task completion menu and eligibility execution — verification

Date: 3 October 2026

## Scoped behavior

- Contributing tasks expose Complete Task in the existing Actions dropdown,
  including tasks without configured workflow actions. The existing finalization
  callback, completion service, and readiness checks remain in use.
- Eligibility verification forms offer Run eligibility ruleset after answers are
  captured. Completed form responses retain the execution control. Required
  answers must be valid and save/completion mutations must finish before running.
- Older configurations declaring the eligibility verification form purpose
  resolve the authoritative eligibility command with the existing changed-evidence
  reevaluation policy. Explicit policies remain authoritative; unsupported explicit
  commands remain invalid. Ordinary review forms do not gain eligibility execution.
- The task projection recognizes evaluated answer snapshots for inherited forms.
  Evaluation still saves the submitted snapshot, applies the application's pinned
  ruleset, and enforces existing permission, assignment, COI, prerequisite,
  optimistic concurrency, transaction, audit, and hard-failure rules.
- The Actions component moved into the workflow task UI folder. Existing callers
  were updated without introducing a second menu implementation.

## Evidence and acceptance limits

- Architecture and form boundary checks passed for 1,260 source files.
- File-size checks passed for 1,772 handwritten files; git diff --check passed.
- Final targeted UI, configuration, repository, and execution regression tests
  passed: seven files and 44 tests. The full suite passed 446 files and 1,684 tests, skipped 32 files
  and 115 tests, and failed two unrelated funding-opportunity-card assertions
  (closing-date text and saved-control lookup).
- Lint was run and reported an unrelated react-hooks/globals error in
  workflow-stage-public-status.test.tsx, plus 17 warnings.
- Type checking was run and reported unrelated errors in NotificationDeliveryHistory
  (string indexing) and workflow-stage-public-status.test.tsx (missing allowedActions).
- Requested production builds encountered another active build's lock. The
  concurrent build compiled successfully, then failed during TypeScript checking.
  A successful production build is not claimed.

Scoped regression behavior is supported by automated tests. Overall repository
acceptance remains incomplete because of the unrelated validation failures above.
Concurrent workspace edits were preserved. No browser acceptance or deployment
is claimed.
