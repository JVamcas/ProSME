# Phase 3 data projection and API contract

## Status

- Increment: P3.0
- State: Agreed
- Governing flow: `docs/architecture/CLIENT_DATA_ACCESS.md`

This contract fixes transport shapes and query discipline before persistence
implementation. It does not create database tables or routes in P3.0.

## Mandatory data flow

Interactive browser state follows:

```text
component -> TanStack Query hook -> client service -> API route
          -> backend service -> repository/integration -> PostgreSQL/external system
```

Server Components may call a backend query directly. Only repositories query
application tables. Every protected service performs capability and ownership
or assignment checks.

## Query rules

- Select only named projection columns; never select a full entity and remove
  sensitive fields in application code.
- Apply authorization scope, ownership, filtering, ordering, pagination,
  counts, and aggregation in PostgreSQL.
- Never issue a query from a record loop.
- Use joins, CTEs, lateral joins, window functions, and JSON aggregation for
  bounded related data.
- Use `count(*) over()` for list totals when it avoids an independent count
  query.
- Compose independent reads into one statement where practical. If one
  statement would harm clarity or plans, execute bounded independent reads
  concurrently and document the exception.
- Sequential queries are allowed only for genuine dependencies inside one
  transaction, such as a generated identifier or locked row version.
- Bulk commands use set-based SQL and a bounded transaction.
- List ordering always includes a unique tie-breaker.
- Work-queue, application-list, applicant-status, and assignment projections
  require representative-volume `EXPLAIN (ANALYZE, BUFFERS)` evidence before
  their delivery increment passes.

## Read models

### PortalContext

One server projection hydrates the shared shell:

```text
userId, displayName, email, status,
roleCodes[], capabilityCodes[], availableSpaces[], defaultSpace
```

It must not fetch the session and capabilities in separate browser requests.
The Firebase subject remains server-only because browser routing and rendering
do not require the authentication-provider identifier.

### ApplicantDashboard

```text
applicantId, displayName, profileCompleteness,
businessSummary,
applicationCards[{id, reference, callTitle, applicantStatus, label,
                  submittedAt, updatedAt, nextAction, actionDueAt}],
unreadNotificationCount, recentNotifications[], savedResourceCount
```

The projection is ownership-scoped in SQL and contains no internal workflow
stage, score, comment, assignment, recommendation, or decision deliberation.

### ApplicantStatusView

```text
applicationId, reference, applicantStatus, label, description,
nextAction, actionDueAt,
timeline[{code, label, state, occurredAt}],
openRequests[{id, subject, dueAt, responseState}]
```

### ApplicationListRow

```text
applicationId, reference, businessName, applicantName,
fundingCallTitle, requestedAmount, submittedAt,
internalStatus, applicantStatus, priority,
activeStageName, activeTaskCount, assignedRoleName,
assignedUserName, dueAt, rowVersion
```

### WorkQueueRow

```text
taskInstanceId, taskDefinitionCode, taskName, taskType,
applicationId, reference, businessName, applicantName,
stageName, priority, taskStatus,
assignedRoleId, assignedRoleName,
assignedUserId, assignedUserName,
dueAt, claimedAt, rowVersion
```

This is a task projection. It never loads the full application, documents,
audit history, or task result payload.

### OperationsApplicationWorkspace

```text
summary,
applicant,
business,
documentRegisterSummary,
workflowSummary,
activeTaskSummary,
communicationSummary,
historySummary,
allowedActions[]
```

Each section is an explicit safe projection. Large document metadata, task
payloads, communications, and history are paged through their own endpoints.

### WorkflowDefinitionEditor

```text
definition{id, code, name, description},
version{id, number, status, createdAt, publishedAt, rowVersion},
stages[{id, code, name, sequence, applicantStatus, defaultAssignment,
        tasks[{id, code, name, type, sequence, required,
               assignment, config}],
        transitions[]}],
validation{valid, errors[], warnings[]},
allowedActions[]
```

The repository returns this bounded graph using aggregation rather than one
query per stage or task.

## List contract

List requests use cursor pagination:

```text
limit, after, sort, direction, filters
```

- Default limit: 25.
- Maximum limit: 100.
- Cursors encode the sort value and unique ID tie-breaker.
- Filter and sort fields are allow-listed per endpoint.
- Responses return `items`, `page.nextCursor`, and `page.total` when the total
  is required by the screen.

## Response and error envelope

Success:

```json
{
  "data": {},
  "meta": { "correlationId": "uuid" }
}
```

List success:

```json
{
  "data": [],
  "page": { "nextCursor": null, "total": 0 },
  "meta": { "correlationId": "uuid" }
}
```

Failure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Safe user-facing message",
    "fields": {}
  },
  "meta": { "correlationId": "uuid" }
}
```

Error codes are `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`,
`VALIDATION_ERROR`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, and
`INTERNAL_ERROR`. Internal details are logged, not returned.

## Applicant API surface

| Method and route                                      | Contract                        | Capability                                        |
| ----------------------------------------------------- | ------------------------------- | ------------------------------------------------- |
| `GET /api/portal/context`                             | `PortalContext`                 | active user with any applicant own-scope capability |
| `GET/PATCH /api/portal/profile`                       | Own applicant profile           | `profile.read.own` / `profile.update.own`         |
| `GET/POST /api/portal/businesses`                     | Own business collection         | `business.read.own` / `business.update.own`       |
| `GET/PATCH/DELETE /api/portal/businesses/{id}`        | Own business detail             | `business.read.own` / `business.update.own`       |
| `GET /api/portal/funding-opportunities`               | Published funding-call projection | active applicant portal access                  |
| `GET /api/portal/funding-opportunities/{slug}`        | Published funding-call detail   | active applicant portal access                    |
| `GET/POST /api/portal/eligibility-assessments`        | Own versioned results           | `eligibility.read.own` / `eligibility.create`     |
| `GET/POST /api/portal/applications`                   | Own list/create                 | `application.read.own` / `application.create`     |
| `GET/PATCH /api/portal/applications/{id}`             | Own workspace/draft update      | `application.read.own` / `application.update.own` |
| `POST /api/portal/applications/{id}/submit`           | Idempotent submission           | `application.submit`                              |
| `GET/POST /api/portal/applications/{id}/documents`    | Own document list/upload intent | `document.read.own` / `document.upload.own`       |
| `GET /api/portal/applications/{id}/status`            | `ApplicantStatusView`           | `application.read.own`                            |
| `GET /api/portal/information-requests`                | Own requests                    | `information_request.read.own`                    |
| `POST /api/portal/information-requests/{id}/response` | Append response                 | `information_request.respond.own`                 |
| `GET /api/portal/notifications`                       | Own notifications               | `notification.read.own`                           |

## Operations API surface

Dynamic form administration and runtime endpoints are:

| Method and route | Contract | Capability |
| --- | --- | --- |
| `GET/POST /api/admin/forms` | Form definition list/create | `form.read` / `form.create` |
| `GET/PATCH /api/admin/forms/{id}` | Form editor projection/draft update | `form.read` / `form.update` |
| `GET /api/admin/forms/published` | Published form-version selector options | `form.read` or workflow definition read |
| `POST /api/admin/forms/{id}/publish` | Publish immutable version | `form.publish` |
| `POST /api/admin/forms/{id}/retire` | Retire version | `form.retire` |
| `GET /api/admin/tasks/{id}/form` | Assignment-scoped pinned runtime schema and submission | `workflow.task.read` |
| `PATCH /api/admin/tasks/{id}/form` | Assignment-scoped draft save | `workflow.task.complete` |
| `POST /api/admin/tasks/{id}/form` | Validate, complete, and sequentially advance a pinned form task | `workflow.task.complete` plus assignment scope |

The form-backed PATCH uses the submitted task and submission row versions for
optimistic concurrency. The POST completion command uses an Idempotency-Key;
legacy typed task routes below retain their type-specific/action-specific
capability terminology until those records are migrated.

| Method and route                                       | Contract                             | Capability                            |
| ------------------------------------------------------ | ------------------------------------ | ------------------------------------- |
| `GET /api/admin/work-queue`                            | Paged `WorkQueueRow`                 | `work_queue.read`                     |
| `GET /api/admin/applications`                          | Paged `ApplicationListRow`           | `application.read.assigned` or `.all` |
| `GET /api/admin/applications/{id}`                     | Operations workspace                 | `application.read.assigned` or `.all` |
| `GET /api/admin/tasks/{id}`                            | Typed task projection                | task read capability plus assignment  |
| `POST /api/admin/tasks/{id}/claim`                     | Atomic claim                         | `workflow.task.claim`                 |
| `POST /api/admin/tasks/{id}/assign`                    | Audited assignment                   | `workflow.task.assign`                |
| `PATCH /api/admin/tasks/{id}`                          | Save validated legacy typed task result | type-specific capability (legacy)  |
| `POST /api/admin/tasks/{id}/actions`                   | Complete/transition/request/decision for legacy tasks | action-specific capability (legacy) |
| `POST /api/admin/applications/bulk-actions`            | Set-based bounded update             | `application.bulk_update`             |
| `POST /api/admin/communications/batches`               | Batch outbox command                 | `communication.batch`                 |
| `POST /api/admin/exports`                              | Audited export job                   | `application.export`                  |
| `GET/POST /api/admin/workflow-definitions`             | List/create definition               | `workflow.definition.read/create`     |
| `GET/PATCH /api/admin/workflow-definitions/{id}/draft` | Editor projection/update             | `workflow.definition.read/update`     |
| `POST /api/admin/workflow-definitions/{id}/validate`   | Validation result                    | `workflow.definition.update`          |
| `POST /api/admin/workflow-definitions/{id}/publish`    | Publish immutable version            | `workflow.definition.publish`         |
| `POST /api/admin/workflow-definitions/{id}/retire`     | Retire version                       | `workflow.definition.retire`          |

## Command contract

- Submission, task action, assignment, bulk update, batch communication, export,
  and publication commands require `Idempotency-Key`.
- Mutable task and workflow-definition commands require an expected row version.
- A stale version returns `409 CONFLICT` with no partial write.
- Bulk requests contain at most 100 IDs and return one atomic result unless the
  endpoint explicitly defines per-item validation before execution.
- API routes validate transport data with Zod and do not duplicate domain
  validation.

## Communication and integration hooks

Notifications and future ERP integration use transactional outbox records.
The outbox includes event code, aggregate ID, schema version, payload,
correlation ID, attempt state, and timestamps. Adapters translate the versioned
internal event to provider-specific formats. Domain transactions never call
email, storage scanning, exports, or ERP systems synchronously.
