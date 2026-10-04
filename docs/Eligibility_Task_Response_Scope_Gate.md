# Eligibility response selection for repeated workflow stages

Date: 2026-10-03

## Finding

The reported task belongs to the second, active iteration of a workflow stage.
The first iteration completed and retains its own verification form response.
Both responses are valid historical records for the same application and form.
The question evidence query previously read both, and the source adapter rejected
each question because more than one matching response existed.

## Acceptance

- A combined verification form/evaluation task supplies its verified task ID
  through the authoritative eligibility service and data resolver to the question
  evidence repository. The query selects only that task's response.
- The scope comes from the locked, authorized task, rather than a browser-supplied
  evidence identifier. Application, ruleset, form-version, response-status, and
  question-key checks remain enforced.
- A missing response, missing field, or wrong form version cannot silently reuse
  another task's evidence. Historical responses remain intact.
- Legacy evaluations without their own verification form retain their existing
  source behavior and ambiguity protection.

## Verification

- A read-only query of the reported task using the corrected scope found all 14
  question sources in exactly one response.
- Seven PostgreSQL assertions passed using the actual repository SQL, extracted
  into a temporary SQL function alongside the integration fixture. The tests used
  temporary tables in a transaction and rolled back. They cover current iteration
  selection, historical iteration preservation, missing task, application scope,
  legacy ambiguity, missing field, and incorrect form version.
- The repeatable Vitest database regression is stored in
  `tests/integration/workflow-eligibility-response-scope.test.ts`; it requires
  `RUN_ELIGIBILITY_RESPONSE_SCOPE_DATABASE_TESTS=true` and an authorized database
  connection. The direct Vitest database runs could not connect successfully.
  PostgreSQL evidence above came from the rollback-only psql execution.
- Automatic approval rejected reading the test container's password after an
  authentication failure. No password was retrieved. The successful psql check
  used existing local container access without credential extraction.
- Production build omitted at the user's request. The running Docker application
  has not been rebuilt or restarted and must load the corrected code before its
  behavior changes.
- Focused service and repository tests: 15 passed across three files.
- Focused ESLint and Git whitespace checks passed.
- Architecture and form-boundary checks passed for 1,305 source files.
- Full lint reports six existing `react-hooks/refs` errors in
  `WorkflowGraphViewport.tsx` and 17 warnings outside this change.
- Type checking reports only the existing incomplete `AuthenticatedUser` fixture
  in `WorkflowAssignedProgress.test.ts:23`.
- File-size checking reports the existing 316-line
  `application-submission-database.test.ts` against its 300-line gate limit.
  All files touched for this correction meet the limits.
- Full suite: 1,950 passed, 160 skipped, and seven failed in five files outside
  this correction: funding-opportunity card/detail UI, portal navigation, workflow
  public-status UI, and the existing API namespace architecture assertion. This
  is not a full-suite pass.
