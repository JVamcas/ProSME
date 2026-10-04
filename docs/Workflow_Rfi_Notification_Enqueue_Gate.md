# Information request notification enqueue verification

Date: 3 October 2026

## Scope

All five configured information request notification events have an enqueue
path in the workflow application layer:

| Event | Capture point |
| --- | --- |
| `workflow.information-request.created` | Staff request creation and automatic stage activation |
| `workflow.information-request.responded` | Applicant response transaction |
| `workflow.information-request.closed` | Assigned staff closure transaction |
| `workflow.information-request.expired` | Existing deadline processor transaction |
| `workflow.information-request.reminder` | Existing deadline processor transaction |

Creation, response, and closure capture now run in the same transaction as
their lifecycle writes. Capture failures propagate to the transaction caller.
Persisted timestamps, application context, and recipient snapshots form the
notification context. Capture verifies that the application and recipient match
the information request. Stable event-specific occurrence identities prevent
duplicate queue records when a command is replayed.

Long instructions are bounded to the notification context's 2,000-character
question summary for all five events. The full request instructions remain
available in the request itself. Existing notification rules determine delivery
recipients and channels; disabled rules remain respected.

## Verification evidence

- Focused workflow notification and lifecycle tests: 31 passed across six files.
- PostgreSQL regression tests: two passed against a temporary PostgreSQL 16
  container with all repeatable migrations applied. They verify the source
  projection, missing-request rejection, all five persisted occurrences and
  configured deliveries, owner/staff recipients, long instructions, and replay
  deduplication. Fixtures roll back; no email dispatch runs in these tests.
- Architecture and form boundaries passed for 1,291 source files.
- Focused lint, final type checking, and the production build passed.
- Full suite: 1,878 passed, 129 skipped, four failures in the unchanged
  funding-opportunity card, funding-opportunity detail, and workflow stage public
  status UI tests.
- Full lint reported seven errors outside this change: six ref-access errors in
  `WorkflowGraphViewport.tsx` and one purity error in `WorkflowRfiTaskStatus.tsx`.
  Other concurrent workspace edits may change these findings.
- File-size gate remains blocked by the existing
  `application-submission-database.test.ts` at 316 lines against that gate's
  300-line limit. The notification files do not exceed their limits.

## Written acceptance

The enqueue behavior is accepted at source and isolated-database level for all
five events. The repository-wide gate is not accepted while the unrelated
failures above remain. Deployment, email delivery, and backfilling historical
requests are outside this verification; existing missed notifications have not
been resent.
