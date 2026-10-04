# Return data retention verification

Date: 2026-10-03

## Accepted behavior

- Retain/clear applies to the new iteration of the configured target stage,
  rather than the referring/current stage or historical records.
- The source is the latest earlier iteration of the same stage definition in
  the same workflow. There is no fallback to older evidence when that iteration
  has no matching task or response.
- Tasks match by task definition and reviewer slot. Both retention modes record
  the prior task through `supersedesTaskId` and append a per-task audit record.
- RETAIN copies compatible form-version responses as fresh DRAFT responses for
  the newly allocated reviewers, including previously saved drafts. It also
  carries forward editable review comments, document checks, checklist items,
  and scores. Decisions, completion flags and eligibility evaluation results
  are not carried forward.
- CLEAR creates no response copies and leaves new task working results empty.
- Historical stages, tasks and responses remain unchanged. New tasks still
  require completion and evaluation. Normal and referred stage activation do
  not use this policy.
- Initialization runs inside the existing stage/action transaction, including
  deadline-triggered returns. The set-based SQL initializes all matching tasks
  and responses and writes their audit records atomically.

No schema change or migration is required; existing task lineage, response and
audit columns support this behavior.

## Verification evidence

- Architecture and form-boundary checks passed.
- Changed-file ESLint passed.
- `npm run typecheck` passed after the production build regenerated route types.
- `npm run build` passed, including TypeScript and all 84 static pages.
- Focused activation and action tests: 4 files, 25 tests passed.
- PostgreSQL query integration tests: 6 passed using session-local temporary
  tables in the existing local test container, without changing application
  records. These cover retain, clear, reassigned reviewers, multiple reviewer
  slots, form compatibility, latest-iteration selection, workflow/stage scope,
  cancelled-task drafts, source preservation, task lineage and audit output.
  The temporary schema exercises the query, not every production trigger or an
  end-to-end action.
  Enable with `RUN_WORKFLOW_REWORK_DATABASE_TESTS=true` and a reachable
  `DATABASE_URL`.
- Full test run: 1,891 passed, 133 skipped, 4 failed. Failures were in unchanged
  funding opportunity card/detail and workflow stage public-status UI tests.
- Full lint failed on 6 existing `react-hooks/refs` errors in
  `WorkflowGraphViewport.tsx`; changed files had no lint errors.
- File-size check failed only on the unrelated
  `application-submission-database.test.ts` (316 lines against the script's
  300-line limit). All files in this change satisfy the script's limits.

Acceptance is limited to the retention behavior verified above. Repository-wide
quality gates are not accepted as green while the unrelated failures remain.
