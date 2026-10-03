# Task document scope and stage decision lock

Date: 2026-10-03

## Accepted behavior

- Stage decision links remain locked until contributing tasks are complete,
  using the existing server prerequisite rule and an explicit explanation.
- Document versions are linked to individual workflow tasks. Uploads and their
  task links are persisted in the same transaction; task and requirement
  ownership are checked in the repository query.
- Task detail, document completion, action readiness and applicant information
  requests use the task's evidence links, rather than application-wide uploads.
- For C → B, CLEAR creates fresh B tasks without document links. RETAIN copies
  document links only from the latest matching B task, alongside editable data.
- Normal forward progression B → C starts fresh C tasks even when the original
  Return used RETAIN. Return ancestry remains available for continuation.
- Historical tasks, uploads and responses are preserved. No files are deleted.
- Migration 0155 adds the task/evidence association and backfills original runs
  using upload timestamps. Explicit retained returns receive copied links;
  forward progression does not automatically inherit historical uploads.

## Verification evidence

- Architecture and form boundary checks passed.
- Changed-file ESLint and `git diff --check` passed.
- Focused tests passed: 8 files, 42 tests, followed by the updated readiness
  suite (17 tests) and task projection check (1 test).
- PostgreSQL integration tests passed: 8 tests, using session-local temporary
  tables in the local migrations container. Tests cover CLEAR/RETAIN evidence
  links, task lineage, compatible responses and preservation of historical data.
- Migration SQL passed twice in an isolated schema inside a rolled-back
  transaction. Synthetic B/C runs verified that B's explicit Return retained
  its documents while C's forward run did not inherit old C documents.
- Full typecheck is blocked by the existing incomplete AuthenticatedUser fixture
  in `WorkflowAssignedProgress.test.ts:23`.
- Full lint is blocked by existing ref-access errors in
  `WorkflowGraphViewport.tsx`. Changed files pass focused lint.
- The file-size gate is blocked only by the unrelated
  `application-submission-database.test.ts` (316 lines, script limit 300).
- Full test run: 1,977 passed, 175 skipped, 20 failed across 7 unchanged test
  files. Failures are in structure convention, public funding card/detail,
  portal navigation, work queue status, stage public status and workspace tabs.

The migration has not been applied to application records. The running Docker
application has not been rebuilt or restarted. Repository-wide acceptance is
withheld while unrelated quality gate failures remain.
