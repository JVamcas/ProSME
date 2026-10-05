# Workflow COI, RFI, and review readiness

Date: 5 October 2026

## Scope and behavior

Assigned tasks remain openable while application details are protected by the
existing COI gate. The queue distinguishes a declaration that is still required,
a disclosure awaiting independent review, recusal, and revoked clearance.
Declaring or reviewing COI invalidates task, queue, and application projections.
The independent-review queue continues to exclude the disclosing user's own
disclosure.

Stage decisions use the pinned definition's required contributing review groups:
`ALL`, `COUNT`, or `PERCENT` with ceiling rounding. Both completion progress and
decision prerequisites count current completed tasks with valid form evidence
and current COI clearance. Superseded tasks and other stage runs do not count;
optional groups do not block. A missing required group does block. Assignment
rows show the configured required count where a task has multiple reviewers.

The readiness banner uses server action availability together with unsaved local
work. It distinguishes blocked decisions, holds, and open information requests.
An open request prevents completion even when the review threshold is met.

Application RFI links open the selected request in the existing task workspace's
Information requests tab. Task context, assignment, configured view permission,
and COI clearance remain enforced by the server. Follow-up and closure controls
respect their canonical permissions and read-only task state. Request Information
is unavailable while an OPEN request exists, and repository creation checks this
again after acquiring the task lock. Existing idempotent replays remain supported.

## Verification

- Isolated PostgreSQL checks: seven passed, covering COUNT, ALL, PERCENT rounding,
  form evidence, revoked COI, supersession, stage-run isolation, missing required
  tasks, and optional groups. Tests execute the production prerequisite SQL and
  compare completion projections. Synthetic data used an isolated schema and
  disposable local PostgreSQL container.
- Type checking: passed (`npm run typecheck`).
- Lint: passed with zero errors and fourteen existing warnings (`npm run lint`).
- Architecture and form boundaries: passed, 1,431 sources
  (`npm run check:architecture`).
- File-size gate: passed, 2,093 handwritten files (`npm run check:files`).
- Full test suite: 2,371 passed and 216 skipped across 612 files, with no failures
  (`npm run test --workspace @prosme/platform -- --maxWorkers=2`). The separately
  executed PostgreSQL tests are opt-in and are included in the skip count here.
- Function-size audit: all 45 changed/new handwritten source and test files
  checked; no function exceeds 200 lines.
- Final production build: passed (`ENVIRONMENT=local scripts/container/build.sh`),
  including TypeScript, generation of all 86 static pages, and build traces.

No database schema or dependency changes are required. No migration is needed.
The GCP server has not been changed or deployed. Live browser acceptance remains
pending deployment; automated UI tests do not constitute live browser acceptance.

## Acceptance status

Local technical acceptance: passed against the final implementation, with the
existing lint warnings and skipped test coverage explicitly recorded above.
GCP delivery and live browser acceptance are not claimed by this record.
