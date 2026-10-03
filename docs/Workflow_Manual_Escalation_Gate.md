# Manual escalation responsibility transfer

Date: 2026-10-03

## Accepted behavior

- The existing Escalate action transfers responsibility to a different named
  user or role and keeps the current workflow stage active.
- Share and Retain responsibility choices are removed. The action designer
  records escalation as a manual transfer without a trigger selector.
- A destination role uses the existing reviewer allocator to select one
  eligible user, excluding the previous assignee and other reviewers occupying
  the same task definition in the stage. An unavailable destination fails the
  transaction with an actionable message.
- The previous assignee loses task action access. Current assignment is the
  authoritative access relationship; historical escalation targets do not
  independently confer access to a task.
- The task becomes Pending for its new assignee. The transfer preserves the
  original assignment in the escalation record and writes a TASK_REASSIGNED
  event and audit entry. Assignment history projects Reassigned with the
  previous user and the destination user's and role's identifiers and names.
- The current assignee can complete transferred work. Completion resolves the
  active escalation and records the resolution atomically with task completion.
- The workflow.task.escalated notification event captures only the new assignee
  as its relationship recipient in the transfer transaction. The context includes
  the task, stage, application reference, reason, and trigger. Its occurrence
  key is derived from the escalation ID, and normal delivery processing handles
  retries and notification configuration.
- SLA breaches continue through the existing notification processor, but do not
  execute automatic escalation. A focused deadline test covers this restriction.
- Migration 0156 normalizes existing action configurations to manual transfer
  and transfers outstanding legacy escalation assignments with assignment audit
  records. It preserves the original escalation records, including their historic
  responsibility mode. Allocation is sequential because each transfer changes
  the workload and reviewer uniqueness constraints for the next transfer.
- Migration 0157 registers the configurable escalation event, an editable
  Assigned User/email default rule, and its template target. Existing edited
  notification configuration is preserved on reapplication.
- The branded workflow-task-escalated.html template is available for import
  and publication through Notifications. Existing published fallback templates
  can continue to resolve according to the standard template selection rules.

## Verification evidence

- Changed-file workflow and notification tests: 91 passed across 14 files.
  Coverage includes same-target rejection, destination role allocation, historic
  ownership denial, Pending and Reassigned records, manual event capture,
  notification failure propagation, completion resolution, assignment history,
  HTML import, and prevention of automatic SLA escalation.
- Full suite with two workers: 1,994 passed, 175 skipped, and 22 failed across
  eight unchanged test files. Failures concern existing API namespace and UI
  expectations in funding opportunity pages, portal navigation, work queue
  status, workflow progress, and workflow stage public status.
- Architecture and form boundary checks passed for 1,321 source files.
- Changed-file ESLint passed. Full lint reports six existing react-hooks/refs
  errors in WorkflowGraphViewport.tsx and 20 warnings.
- Workspace type checking reports the existing incomplete AuthenticatedUser
  fixture in WorkflowAssignedProgress.test.ts:23. No changed-source type error
  remains.
- The file-size gate reports only the unchanged 316-line application submission
  database integration test against its older 300-line gate limit. Changed
  implementation and test files meet both the repository instructions and gate
  limits.
- Production build passed on the earlier run. The final rerun compiled
  successfully but was interrupted during type checking while wrapping up;
  the final rerun is not recorded as passed.
- git diff --check passed.
- Database migrations are prepared and registered but have not been applied or
  exercised against a live PostgreSQL database in this change. Notification
  delivery and browser behavior have not been verified against a running app.

## Runtime destination override

The configured escalation user or role is an execution default. The assigned
reviewer can select another eligible user or role in the Escalate dialog without
changing the published workflow or funding call. The available destinations use
the existing reviewer allocation rules: active status, task permission grants,
application ownership, conflict-of-interest clearance, and distinct reviewers.
The runtime destination is revalidated on execution and used for the transfer,
assignment history and new-assignee notification. A stale or unavailable default
does not block an eligible runtime override. Omitting both runtime target fields
preserves compatibility with callers using the configured default; partial target
pairs are rejected.

Current behavior disables the action when no eligible destinations are found.
The user's screenshot on 2026-10-03 shows this condition. Its live database cause
has not been established: a read-only diagnostic connection failed because the
configured database hostname db was unreachable from the agent session.

Validation for this extension:

- Focused tests: 51 passed across 11 files, covering runtime role/user overrides,
  default prefilling, stale defaults, input validation, eligibility projections,
  routing validation, transfer outcomes and unauthorized destination discovery.
- Full suite: 2,016 passed, 175 skipped, 22 failed in eight existing UI and
  architecture test files. The two routing tests were run separately afterward.
- Architecture and form boundary checks passed for 1,325 source files.
- Production build completed successfully, including TypeScript and route output.
- Full lint retains six existing refs errors and 20 warnings. The file-size gate
  retains the existing 316-line integration test violation.
- Browser acceptance and live database eligibility diagnosis remain unverified.

## Escalation tracking, chaining and cancellation

Accepted behavior on 2026-10-04:

- The sender retains a tracking entry in My tasks, labelled Escalated and showing
  the current assignee. It opens the same task URL with a tracking view.
- Cancel escalation appears in the existing Actions dropdown. All normal
  workflow actions are disabled for the sender, and the tracking view does not
  mount editable reviewer forms. Normal write services still enforce current
  assignment; tracking access does not extend those services.
- The current assignee can escalate onward. Each escalation preserves its own
  sender and parent escalation. The workflow task identity and saved work remain
  stable, with new assignment events recording each responsibility transfer.
- Cancelling B to C returns an unfinished task to B. Cancelling A to B in an
  A to B to C chain cancels both outstanding transfers and returns it to A.
- Cancellation resolves each affected escalation with a CANCELLED resolution
  audit/event, records reassignment and restores the selected escalation's
  sender user and role. The task becomes Pending. Drafts and evidence survive.
- Completed tasks, closed workflows/stages, resolved escalations and stale
  versions are rejected. A committed form response after the selected
  escalation also prevents cancellation, including intermediate committed work.
- Authorization requires workflow.escalation.own.cancel plus the active manual
  escalation's original assignee and creator context. Other historical owners
  and target-role members cannot cancel another user's escalation.
- Migration 0158 adds parent links, permits outstanding escalation chains and
  grants the contextual cancellation permission to existing task processor roles.
  It is prepared and registered, but not applied to the running application DB.

Verification and acceptance:

- Focused unit, route, repository and UI checks: 54 passed across 12 files.
- Isolated PostgreSQL checks: three passed. They execute migration 0158 twice,
  then verify A/B cancellation destinations, descendant resolution records,
  preservation of saved work, committed intermediate responses and grant
  idempotence. Temporary tables shadow application tables and every test rolls
  back; this evidence does not represent a live application migration.
- Architecture and form gates passed for 1,335 source files. Changed-file lint
  and git diff --check passed. All changed files meet the size gate limits.
- Full suite: 2,044 passed, 178 skipped, 26 failed across ten UI/architecture
  test files. The decision-dialog failures reproduce with unchanged Notes label
  expectations; a separate form-preview retry passes after its full-suite timeout.
- Full lint retains six refs errors in WorkflowGraphViewport.tsx and 17 warnings.
  Type checking retains the incomplete AuthenticatedUser fixture in
  WorkflowAssignedProgress.test.ts:23. The file-size gate retains the existing
  application-submission-database.test.ts 316/300 violation.
- Focused behavior and isolated migration checks are accepted as scoped evidence.
  The overall repository release gate remains unaccepted because the full gates
  are not clean. The production build passed, including TypeScript, static
  generation and route output. Browser acceptance and migration of the running
  application database remain outstanding.
