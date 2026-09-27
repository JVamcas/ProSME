# SME Fund — Notification Engine Implementation Plan

## 1. Purpose

This document breaks the notification engine design into small, ordered,
testable implementation tasks. It must be read with
[`SME_Fund_Notification_Engine_Design.md`](SME_Fund_Notification_Engine_Design.md)
and the repository structure contract.

Every task must:

- implement one focused capability;
- be independently testable;
- leave the application working;
- preserve the single Next.js application architecture;
- include automated tests where practical;
- include manual verification where applicable; and
- record gate evidence before being reported complete.

## 2. Fixed decisions

| Area | Decision |
| --- | --- |
| Initial channel | Email only |
| Provider | Gmail SMTP using a Google application password |
| Runtime model | Transactional PostgreSQL outbox |
| Sender deployment | Existing `apps/platform`; no separate application or Docker image |
| Templates | Manually uploaded, validated, versioned, and published in PostgreSQL |
| Template source folder | `apps/platform/src/modules/notifications/templates/email` |
| Initial events | `application.submitted` and `workflow.task.assigned` |
| Initial recipients | `APPLICATION_OWNER` and `ASSIGNED_USER` |
| Subscriptions and other channels | Deferred |

## 3. Dependency chain

```text
Notification foundation and governance
        ↓
Email template lifecycle
        ↓
Transactional event capture
        ↓
Gmail SMTP delivery and outbox processing
        ↓
Administration and operational recovery
        ↓
Production readiness and rollout
```

## 4. Phase gates

Every phase ends with a written gate record containing:

- completed and deferred scope;
- migration evidence where applicable;
- automated and manual test evidence;
- architecture and file-size gate results;
- lint and type-check results;
- known limitations; and
- explicit phase acceptance.

The production build is mandatory in Phase 6 and whenever an earlier phase
changes routes, dependencies, or build-time configuration.

---

# Phase 1 — Notification Foundation and Governance

## 1.1 Domain contracts and catalogue

### Goal

Create provider-neutral notification concepts and stable identifiers.

### Scope

Implement:

- the `EMAIL` channel type;
- immutable event keys;
- the two initial recipient types;
- template, outbox, and delivery states;
- Zod context schemas for both initial events; and
- shared notification error codes.

### Out of Scope

- persistence;
- rendering;
- event capture;
- SMTP; and
- UI.

### Acceptance Criteria

1. Event keys have one authoritative catalogue.
2. Each event has a typed context and allowed recipient types.
3. Invalid contexts produce controlled validation errors.
4. Domain code has no React, Next.js, database, or SMTP dependency.

### Tests

- valid and invalid contexts;
- unknown events; and
- recipient compatibility.

### Done When

The notification vocabulary is stable, typed, and provider-neutral.

## 1.2 Database schema and migration

### Goal

Persist configuration, immutable occurrences, and delivery history.

### Scope

Add module-owned schema and a repeatable migration for:

- channels;
- events;
- event rules;
- templates and template versions;
- outbox occurrences; and
- recipient deliveries.

Add the constraints and indexes specified in the design.

### Acceptance Criteria

1. A clean database migrates successfully.
2. Duplicate event and occurrence keys are rejected.
3. Only one published version exists per template target.
4. Due-work and delivery-history queries have supporting indexes.
5. All tables use the `app_` prefix.

### Tests

- clean migration;
- constraints and foreign keys;
- unique occurrence behavior; and
- list projection shape.

### Done When

The complete persistence foundation is repeatably migratable.

## 1.3 Seed initial configuration

### Goal

Create deterministic starting configuration without manual SQL.

### Scope

Seed the email channel, both initial events, and their required recipient
rules. Use stable identifiers or conflict-safe keys.

### Acceptance Criteria

1. Seed execution is repeatable.
2. Re-running it creates no duplicates.
3. Event keys cannot be edited.
4. SMTP credentials are absent from seed data and tables.

### Tests

- first and repeated seed; and
- immutable-key enforcement.

### Done When

Every environment receives the same minimum configuration safely.

## 1.4 Permissions and audit actions

### Goal

Establish deny-by-default governance before exposing administration APIs.

### Scope

Add canonical permissions for configuration, template import/publication,
delivery history, and retry. Add audit actions for every notification
configuration mutation.

### Acceptance Criteria

1. Codes exist only in the canonical permissions directory.
2. Grants use the narrowest relevant permission.
3. Allowed and denied paths are tested.
4. Audit metadata excludes secrets and rendered bodies.

### Done When

Later notification APIs can be protected consistently.

## Phase 1 Exit Gate

Phase 1 is complete when domain contracts, migration, seed data, permissions,
and tests pass without implementing SMTP or business-event integration.

---

# Phase 2 — Email Template Lifecycle

## 2.1 Field catalogue and renderer

### Goal

Render safe subjects, HTML, and plain text from approved fields.

### Scope

Implement per-event field allow-lists, placeholder discovery, HTML escaping,
subject rendering, HTML rendering, plain-text rendering, and trusted URL
construction.

### Out of Scope

- loops or conditionals;
- property traversal;
- unescaped placeholders; and
- executable expressions.

### Acceptance Criteria

1. Supported fields render deterministically.
2. Unknown fields prevent import or publication.
3. Recipient values cannot inject HTML.
4. Subject newlines and missing required context are rejected.
5. URLs derive from server configuration.

### Tests

- supported and unsupported fields;
- HTML injection;
- subject injection;
- missing context; and
- URL construction.

### Done When

Templates render safely without database or SMTP coupling.

## 2.2 HTML import validation

### Goal

Turn a manual upload into safe, immutable draft content.

### Scope

Validate `.html`, `text/html`, a 256 KiB maximum, UTF-8 content, sanitization,
allowed placeholders, SHA-256 content digest, and optional/generated plain
text.

### Acceptance Criteria

1. Invalid type, size, encoding, or content is rejected.
2. Scripts, forms, event attributes, and executable content cannot persist.
3. Sanitized output is revalidated.
4. Identical content produces the same digest.

### Tests

- safe branded HTML;
- malicious fixtures;
- size and encoding boundaries;
- digest stability; and
- generated plain text.

### Done When

Uploaded files can be treated as validated notification content.

## 2.3 Versioning and publication

### Goal

Persist drafts and publish one immutable version per event and channel.

### Scope

Implement target lookup, version listing and allocation, draft import,
publication, prior-version retirement, and lifecycle audit.

### Acceptance Criteria

1. Imports receive unique increasing version numbers.
2. Imports start as `DRAFT`.
3. Publication and prior retirement are atomic.
4. Published content cannot be edited.
5. Concurrent imports cannot allocate the same version.
6. Import and publication are audited.

### Tests

- concurrent version allocation;
- publication transaction;
- immutability; and
- repository projections.

### Done When

Templates have an auditable, immutable lifecycle.

## 2.4 Template administration

### Goal

Let authorized staff upload, inspect, and publish without database access.

### Scope

Add thin API routes and UI for target listing, version history, multipart HTML
upload, subject/plain-text entry, validation feedback, and publication. Use
React Hook Form, Zod, TanStack Query hooks, and a client service.

### Acceptance Criteria

1. Authorized staff can import and publish valid content.
2. Import never publishes automatically.
3. Invalid uploads show actionable errors.
4. Unauthorized access is denied server-side.
5. Client components do not call `fetch` directly.

### Tests

- transport validation and authorization;
- lifecycle services;
- upload form; and
- query invalidation.

### Manual Verification

Upload and publish a version, then confirm the prior version is retired.

### Done When

Template management requires no direct database changes.

## 2.5 Initial template source files

### Goal

Provide maintainable source for both initial emails.

### Scope

Create `application-submitted.html` and `workflow-task-assigned.html` in the
approved module template folder. Files are source artifacts and are not read
from disk during dispatch.

### Acceptance Criteria

1. Both pass import validation.
2. Both render from representative fixtures.
3. Both are readable at common desktop and mobile widths.
4. Neither contains remote executable content.

### Done When

Both templates are ready for manual environment-specific upload.

## Phase 2 Exit Gate

Phase 2 is complete when staff can import and publish both templates, with no
email delivery enabled yet.

---

# Phase 3 — Transactional Event Capture

## 3.1 Occurrence writer

### Goal

Write validated and idempotent notification intent inside a caller's business
transaction.

### Scope

Implement a transaction-aware writer that validates context and recipients,
normalizes and deduplicates recipient snapshots, and inserts an outbox
occurrence with delivery intents.

### Acceptance Criteria

1. The writer uses the caller's transaction.
2. Invalid context rolls back the surrounding operation.
3. Replays return the existing occurrence without duplicate deliveries.
4. Recipient snapshots contain only approved fields.
5. SMTP is never called in the transaction.

### Tests

- successful write;
- rollback;
- replay;
- deduplication; and
- invalid context.

### Done When

Business modules can capture notification intent atomically.

## 3.2 Application-submitted integration

### Goal

Capture one applicant confirmation when a new submission commits.

### Scope

Integrate `application.submitted` into the existing submission transaction and
capture the trusted application-owner snapshot and approved context.

### Acceptance Criteria

1. A new successful submission creates one occurrence.
2. Submission and occurrence commit or roll back together.
3. Idempotent replay creates no duplicate occurrence.
4. Failed submission creates no occurrence.
5. Recipient data comes from server-side records.

### Tests

- successful submission;
- replay;
- readiness or eligibility failure; and
- rollback.

### Manual Verification

Submit a test application and inspect the pending occurrence without sending.

### Done When

Every new submission has exactly one durable applicant email intent.

## 3.3 Workflow-task-assigned integration

### Goal

Capture email intent when stage activation creates assigned tasks.

### Scope

Integrate `workflow.task.assigned` into the task-creation transaction. Group
tasks by user within one activation and store one delivery intent per assignee.

### Acceptance Criteria

1. Task creation and event capture are atomic.
2. Each distinct assignee receives one intent per activation.
3. Multiple tasks for one user appear in one summary.
4. Later reassignment cannot alter the snapshot.
5. Unassigned tasks do not create invalid intents.
6. Replays do not duplicate occurrences or recipients.

### Tests

- single and multiple tasks;
- single and multiple assignees;
- unassigned task;
- rollback; and
- replay.

### Manual Verification

Activate a test stage and inspect grouped pending deliveries.

### Done When

New task assignments create immutable, deduplicated email intents.

## Phase 3 Exit Gate

Phase 3 is complete when both events are captured transactionally and
idempotently while SMTP remains disabled.

---

# Phase 4 — Gmail SMTP Delivery and Outbox Processing

## 4.1 SMTP configuration and adapter

### Goal

Send through Gmail behind a provider-neutral server interface.

### Scope

Add exact-version Nodemailer, server-only environment validation, secure Gmail
transport, sender identity, HTML/plain-text alternatives, timeouts, message-ID
capture, and stable error classification. Update `.env.example` with empty
placeholders only.

### Acceptance Criteria

1. Browser code cannot access SMTP credentials.
2. Application services do not depend directly on Nodemailer.
3. Tests use a fake transport and never contact Gmail.
4. Authentication, address, timeout, and transient failures are distinct.
5. Secrets never appear in errors or logs.

### Tests

- valid and invalid configuration;
- fake success and message ID;
- failure classification; and
- secret redaction.

### Done When

One rendered message can be sent safely through the email-sender interface.

## 4.2 Concurrent-safe claiming

### Goal

Claim bounded due work without duplicate processor ownership.

### Scope

Implement indexed due-work selection, PostgreSQL row locking with skip-locked
behavior, processing owner/time, stale-lock recovery, batch limits, and
deterministic order.

### Acceptance Criteria

1. Concurrent claimers never own the same live delivery.
2. Stale work becomes claimable after timeout.
3. Sent work is never reclaimed.
4. Queries are bounded and avoid N+1 loading.

### Tests

- concurrent claims;
- batch limits;
- stale locks;
- no due work; and
- ordering.

### Done When

Pending deliveries can be claimed safely under concurrency.

## 4.3 Dispatch and retry service

### Goal

Render, send, and persist truthful delivery outcomes.

### Scope

Implement published-template resolution, rendering, result persistence, five
attempts with exponential backoff and jitter, terminal-failure handling,
partial success, aggregate status updates, and redacted logging.

### Acceptance Criteria

1. Success records the template version, provider ID, and sent time.
2. Transient failures receive a future retry time.
3. Terminal failures stop retrying.
4. A successful recipient is not resent because another failed.
5. Missing templates produce inspectable configuration failures.
6. SMTP failure cannot alter committed business state.

### Tests

- full and partial success;
- retry schedule and limit;
- terminal failure; and
- missing template.

### Done When

Each delivery progresses to a truthful, auditable state.

## 4.4 Authenticated processor endpoint

### Goal

Expose one bounded dispatch invocation to the approved scheduler.

### Scope

Add a thin internal route with service authentication, batch and execution-time
limits, safe counts, and operational logging. Production authentication must
match the deployment scheduler platform.

### Acceptance Criteria

1. Anonymous and ordinary user calls are denied.
2. An authenticated call processes at most one batch.
3. Responses contain no recipient or rendered content.
4. Concurrent calls remain safe.
5. Route code contains no repository or SMTP workflow logic.

### Tests

- missing, invalid, and valid authentication;
- empty and populated batches; and
- response redaction.

### Manual Verification

Invoke the endpoint with a fake transport and confirm one batch reaches
`SENT`.

### Done When

The scheduler has a safe application entry point for delivery.

## Phase 4 Exit Gate

Phase 4 is complete when both event types process end-to-end through a fake
transport and the internal endpoint is deny-by-default.

---

# Phase 5 — Administration and Operational Recovery

## 5.1 Event and rule configuration

### Goal

Let authorized staff inspect and enable or disable initial events and rules.

### Scope

Add list and optimistic-concurrency update operations. Event keys, channel
types, and recipient types remain immutable.

### Acceptance Criteria

1. Authorized staff can inspect both events and rules.
2. Enabled state can be changed safely.
3. Immutable identifiers cannot be edited.
4. Every mutation is authorized and audited.

### Tests

- list projection;
- allowed and denied update;
- stale update conflict; and
- audit record.

### Done When

Required notification behavior can be controlled without SQL.

## 5.2 Delivery history

### Goal

Make outcomes inspectable by authorized operations staff.

### Scope

Add an SQL-filtered, sorted, paginated delivery view for event, status,
application reference, date range, and authorized recipient search. Show
attempts, template version, timestamps, and redacted failure details.

### Acceptance Criteria

1. Filtering, sorting, and pagination execute in SQL.
2. Queries select only the required projection.
3. Recipient information is permission-protected.
4. Bodies and credentials are never returned.
5. Empty, loading, and error states are clear.

### Tests

- filters and pagination boundaries;
- projection shape;
- authorization; and
- UI states.

### Done When

Staff can diagnose delivery state without database or log access.

## 5.3 Manual retry

### Goal

Let authorized operations staff safely retry an eligible failed delivery.

### Scope

Implement retry policy, an idempotent command, audit record, and UI action.
Retry schedules work for processing and never sends synchronously.

### Acceptance Criteria

1. Only eligible failed deliveries can be retried.
2. Sent deliveries cannot be reset.
3. Concurrent retry commands are idempotent.
4. Actor, reason, and time are audited.
5. The request does not call SMTP.

### Tests

- eligible and ineligible retry;
- unauthorized access;
- concurrency; and
- audit record.

### Manual Verification

Force a failure, correct it, retry it, and confirm one successful delivery.

### Done When

Supported failures can be recovered without unsafe data changes.

## 5.4 Operational summary

### Goal

Expose safe backlog and processor-health indicators.

### Scope

Return aggregate pending, processing, retrying, sent, and failed counts, the
oldest pending time, and a stale-lock indicator. General health output contains
no personal information.

### Acceptance Criteria

1. Aggregation executes in SQL.
2. Output contains no recipient information.
3. Backlog and stale processing are distinguishable.
4. Access follows established operational policy.

### Done When

Operators can detect delivery degradation promptly.

## Phase 5 Exit Gate

Phase 5 is complete when staff can configure, inspect, and recover notifications
without database access and all mutations are audited.

---

# Phase 6 — Production Readiness and Rollout

## 6.1 Scheduler and secrets

### Goal

Configure production delivery without embedding secrets in source or images.

### Scope

Document and configure Gmail prerequisites, app-password rotation, secret-store
mappings, scheduler authentication, processor interval, batch/timeout settings,
sender identity, and the disable/rollback procedure.

### Acceptance Criteria

1. Secrets come only from the approved secret store.
2. Scheduler authentication works in the target environment.
3. Disabling the channel preserves queued occurrences.
4. Credential rotation requires no source change.
5. No credential exists in tracked files or build output.

### Done When

Production can invoke the sender securely and repeatedly.

## 6.2 Gmail smoke tests

### Goal

Prove real delivery to approved test mailboxes.

### Scope

Deliver one controlled occurrence for each initial event with the published
templates. This is an explicit operational test, not part of automated suites.

### Acceptance Criteria

1. Both messages arrive with correct sender, subject, HTML, and plain text.
2. Links target the correct deployed routes.
3. Delivery records contain provider IDs and sent times.
4. Logs contain no secret or rendered body.

### Done When

The target environment proves Gmail delivery for both events.

## 6.3 Failure and recovery exercise

### Goal

Prove operational failure handling before release.

### Scope

Exercise temporary SMTP failure, missing published template, invalid recipient,
stale processor lock, and manual retry after correction.

### Acceptance Criteria

1. Every failure is classified correctly.
2. Temporary failures retry with backoff.
3. Terminal failures stop retrying.
4. Stale locks recover.
5. Recovery does not duplicate a successful recipient.

### Done When

All documented recovery paths work in a safe environment.

## 6.4 Full quality gate

### Goal

Produce final evidence for production acceptance.

### Scope

Run architecture boundaries, file limits, lint, type checking, unit and
integration tests, relevant end-to-end tests, and the production build. Review
migrations, permissions, queries, logs, API responses, and tracked files for
secret or personal-information leakage.

### Acceptance Criteria

1. Every mandatory gate passes with captured evidence.
2. File and function limits are respected.
3. Protected operations enforce server-side permissions.
4. Client code imports no SMTP, database, repository, or server-only modules.
5. No notification change contains a secret.
6. Known limitations are documented and accepted.

### Done When

The engine is approved for production for both initial events.

## Phase 6 Exit Gate

Phase 6 is complete when real-provider tests, recovery exercises, full quality
gates, operational documentation, and production acceptance are recorded.

---

# 5. Deferred roadmap

Future approved phases may add:

- approval, rejection, correction, cancellation, reminder, and SLA events;
- optional subscriptions and audiences;
- attachments and reply-to policies;
- SMS, push, and webhook channels;
- preview email delivery;
- bulk replay tools; and
- a separately scaled process using the same application image if measured
  volume requires it.

Deferred work must reuse the initial event, rule, template, outbox, and delivery
model rather than create channel-specific engines.
