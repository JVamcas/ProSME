# Workflow runtime control choices verification

Date: 2026-10-03

## Accepted behavior

- Return exposes Retain/Clear when the action is executed. That choice controls
  initialization of the target stage's new iteration and the rework record.
  The staged retention implementation is preserved: compatible responses become
  fresh drafts, tasks match by definition and reviewer slot, and historical
  records remain intact. New work requires completion again.
- Refer exposes Block/Keep open and Return to referrer at execution time.
  The selected values are stored in the referral and its activation context.
  Definitions supply defaults, explicitly labelled as defaults in the designer.
  Older callers that omit the new optional fields use those defaults; deadline
  actions continue to use configured defaults. No schema migration is needed.
- Completing a referred stage resolves its referral and, when requested,
  explicitly hands control back to the existing source stage/task. It updates
  the current-stage pointer and records a return event/audit in the same
  transaction. Answers, assignment and task lifecycle are preserved.
- Sequential completion reports the original referring stage as its destination
  and suppresses the referred stage's configured onward/terminal transition when
  a return applies. The action audit records no terminal outcome for this active
  workflow. Handoffs remain available when task lifecycle completion already
  completed the referred stage before sequential advancement runs.
- Return routing requires the source task to belong to the same source stage
  and workflow and remain pending/in progress in an active or blocked stage.
  It does not revive completed or cancelled work. If the source has finished
  while a nonblocking referral was open, normal onward routing applies.
- Return disabled leaves onward routing to the configured workflow. Resolving
  either kind of referral removes that referral's block. Other holds and
  referrals continue to govern availability; a handoff does not clear them.
- Blocking referrals are enforced in both generic task lifecycle operations
  and the shared SQL completion policy used by task completion repositories.
- Referral resolution and handoff are idempotent. Audit failure rolls back both
  resolution and routing. Existing authorization and ownership checks remain
  in the protected application services.

## Verification evidence

- Architecture and form-boundary checks passed.
- Changed-file ESLint passed. Full lint still reports six pre-existing
  `react-hooks/refs` errors in `WorkflowGraphViewport.tsx`.
- Type checking passed.
- Eight focused action, form, activation, lifecycle and transition test files:
  41 tests passed. A subsequent two-file routing/action-execution run passed
  17 tests, including both newly completed and already-completed handoffs.
- PostgreSQL repository tests: 14 passed across retention and referral routing.
  Session-local temporary tables isolate them from application data. Coverage
  includes both source behaviors, return disabled, holds, completed sources,
  source-resource scope, completion blocking, idempotency and audit rollback.
  These tests verify repository SQL rather than every production trigger or a
  full browser-to-database action. Enable the test files with
  `RUN_WORKFLOW_REFERRAL_DATABASE_TESTS=true` and
  `RUN_WORKFLOW_REWORK_DATABASE_TESTS=true` using a reachable `DATABASE_URL`.
- File-size check reports only the pre-existing
  `application-submission-database.test.ts` (316 lines against its 300-line
  script limit). Changed implementation/test files satisfy the script limits.

- Final production build passed, including TypeScript and all 84 static pages.
- Final full-suite run: 1,907 passed, 147 skipped and four failed across three
  unchanged UI files: `funding-opportunity-card.test.tsx`,
  `funding-opportunity-detail.test.tsx` and
  `workflow-stage-public-status.test.tsx`. These failures match the previously
  documented baseline. The related action-configuration test was updated for
  the default-setting label and passed.

Acceptance is limited to the runtime behavior and verification described above.
Repository-wide lint, tests and file-size gates are not accepted as green while
these unrelated failures remain.
