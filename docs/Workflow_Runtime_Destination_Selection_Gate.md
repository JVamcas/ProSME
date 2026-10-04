# Runtime Return destination selection

Date: 2026-10-03

## Accepted behavior

- The Return dialog offers a destination selector. A configured destination
  selected by the action's transition conditions is preselected when eligible;
  the user can choose another eligible stage. If there is no configured
  destination, the user must choose one. The server also resolves the configured
  default for older callers that omit the destination, and never silently picks
  the first stage in the list.
- Return offers only immediate predecessor stages in normal workflow progression
  that have completed in this application's history. In A -> B -> C, C can
  Return to B; it cannot Return to A. A stage with another active or blocked
  iteration is excluded from Return. Historical
  Return and Refer links are excluded when tracing progression paths. Current stages,
  downstream stages, unrelated parallel branches, and stages reachable
  downstream through a normal progression cycle are excluded.
  Display sequence only orders the choices. Return additionally requires actual
  completion history; ordering is never evidence that a stage was completed.
- The selected destination is validated against that same SQL projection before
  changing task or stage state. Cross-version destinations, disabled stages,
  empty stages, current/downstream stages, and nonhistorical Return targets are
  rejected. Definition validation rejects defaults that are not earlier stages;
  execution also rejects invalid defaults already saved in published versions.
  Existing source authorization, assignment, runtime-version and idempotency
  checks remain in the protected action service.
- Explicit rework iterations can reopen a stage without requiring
  ordinary graph repetition to be enabled. Normal graph activation continues
  to enforce Repeatable. The designer accepts a nonrepeatable stage as a
  Return default; a configured default route still has one destination.
- The action's own conditions remain authoritative. Configured transition
  conditions choose the default and do not prevent a user from choosing another
  eligible destination. Target entry and join conditions are checked during
  activation and failures roll back the action transaction.
- Return completes the source stage and activates the selected target with the
  selected Retain/Clear policy. Refer was subsequently removed; see
  `Workflow_Refer_Removal_Gate.md`. Historical referral completion routing is
  retained only for referrals already in progress.

## Initial destination-selection verification

- Architecture and form-boundary checks passed for 1,299 source files.
- Type checking passed.
- Production build passed in an isolated workspace snapshot using the existing
  dependencies. Another build held the original workspace's Next.js lock;
  the snapshot avoided interfering with that build or the running application.
- Eight focused test files passed: 46 tests covering defaults, overrides,
  unconfigured Refer, unavailable Return, exact destination validation,
  source permissions, activation, control outcomes and designer validation.
- PostgreSQL repository tests passed: 21 across destination selection, rework
  retention and referral routing. Session-local temporary tables isolate them
  from application records. The destination tests also exercise ordinary
  transition target validation to ensure its SQL remains valid and scoped.
  Enable the destination suite with
  `RUN_WORKFLOW_DESTINATION_DATABASE_TESTS=true` and a reachable `DATABASE_URL`.
- Changed-file ESLint passed. Full lint reports the same six existing
  `react-hooks/refs` errors in `WorkflowGraphViewport.tsx`.
- File-size checking reports only the unrelated
  `application-submission-database.test.ts` (316 lines against the script's
  300-line limit). All changed files meet the script limits.
- Full suite during the image build: 1,913 passed, 154 skipped, nine failed.
  A serial rerun of the failing files passed both workflow editor files that
  had timed out. Five failures remain in unchanged funding opportunity UI,
  workflow public-status UI and the architecture test requiring the old API
  namespace layout. This task adds no API namespaces or routes.
- A read-only query for the task in the supplied screenshot found two eligible
  Refer stages: Approval and Award Decision, and Evaluation and Close-out.
  This query preceded the earlier-stage restriction; its result does not
  describe the current selector.

## Scope correction

The earlier-stage implementation and verification below are historical.
The user's clarification restricts Return to the immediate previous stage,
not any ancestor. Current acceptance and verification are recorded in
[Workflow_Return_Continuation_Gate.md](Workflow_Return_Continuation_Gate.md).

## Earlier-stage restriction verification (superseded)

- Architecture and form-boundary checks passed for 1,300 source files.
- Focused destination selection, availability and transition validation tests
  passed: 24 tests across three files. The final transition validation rerun
  passed all six tests after correcting its cycle fixture's action configuration.
- PostgreSQL tests passed: 23 across destination selection, referral routing
  and retention. New cases cover indirect upstream paths, unvisited earlier
  stages, unrelated branches, downstream stages with completion history,
  misleading display order, control links and normal progression cycles.
- Changed-file ESLint passed. Full lint still reports six unrelated existing
  errors and 17 warnings.
- File-size checking reports only the unrelated 316-line application submission
  database test. Changed files remain within the gate limits.
- Final type checking reports only an unrelated incomplete `AuthenticatedUser`
  fixture in `WorkflowAssignedProgress.test.ts:23`.
- Production build passed in an isolated workspace snapshot. This verifies
  compilation and page generation without rebuilding or switching the local
  Docker application.
- Full serial suite completed: 1,936 passed, 156 skipped and five failed across
  four unchanged files (funding opportunity card/detail, workflow public status,
  and the API namespace architecture assertion). No changed-file tests failed.

## Local runtime status

The first local Docker image build completed, but predates the final ordinary
transition SQL correction. It was not started. The final image rebuild was
rejected by the user, so the running localhost application remains on its
existing image. Rebuilding the final workspace code is required before starting
an updated local container; restarting the existing image alone is insufficient.

Acceptance covers the source behavior verified above. Repository-wide gates
are not accepted as green while the unrelated failures remain. Live authenticated
browser execution has not been verified.
