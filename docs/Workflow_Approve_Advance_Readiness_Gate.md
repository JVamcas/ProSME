# Approve and advance prerequisite consistency

Date: 2026-10-03

## Change and acceptance scope

The user authorized aligning workflow action availability with execution so that
blocked approval actions are disabled with an explanatory reason before submission.

Availability and execution now share checks for participation quorum, task work
readiness, open information requests, and approval stage completion thresholds.
The current task counts prospectively toward the stage threshold only when its
status, clearance, successor, and form evidence satisfy the existing completion
projection. Its work readiness and open requests are checked separately.

Task completion reuses the same readiness repository and retains its optimistic
version and open-RFI write guard. Submission runs the checks inside the existing
transaction. Quorum evaluation records are written during submission and are
not written when reading availability. Quorum participants are loaded in one
batched query and remain scoped to the applicable task definition/population.

The existing task action dropdown displays the returned reason and disables
unavailable actions. Request-information and suspension actions do not acquire
requirements to complete their source task.

This change covers the named readiness prerequisites. Input validation,
configured action/transition conditions, final stage exit evaluation, version
checks, and transactional completion remain enforced by their existing paths.
No schema, permission, or deployment changes are included.

## Verification evidence

- Focused service and repository regression tests: 31 passed across five files.
  These cover blocked/allowed approval availability, execution denials, audit
  behavior, stage thresholds, read-only quorum evaluation, population batching,
  SQL projection guards, missing tasks, and request-information behavior.
- Architecture and form boundary checks pass for 1,268 source files.
- File-size checks pass for 1,785 handwritten files.
- Type checking passes after the implementation changes.
- Whole-repository lint reports six existing `react-hooks/refs` errors in
  `WorkflowGraphViewport.tsx` and 17 existing warnings. The viewport is unchanged
  by this task. Focused lint on all files changed for this fix is tracked below.
- Final production build and full-suite results are pending.

## Written acceptance

Acceptance is pending final verification. This is source-level verification;
no authenticated browser or live PostgreSQL acceptance run has been performed.
