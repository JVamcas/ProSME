# SME Fund Notification Engine Design

Status: Proposed for review  
Initial channel: Email  
Email transport: Gmail SMTP with an application password  
Initial events: Application submitted and workflow task assigned

## 1. Purpose

This document defines the first implementation increment for the SME Fund
notification engine. It adapts the event, rule, recipient, template, and
dispatch concepts used by WorkflowHub to the SME Fund platform architecture.

The first increment provides reliable transactional email notifications while
preserving a path for additional events and delivery channels. It does not
create a second application or service. The notification engine remains a
module inside the single Next.js application at `apps/platform`.

## 2. Agreed decisions

The following decisions are approved for the initial implementation:

- Email is the only delivery channel.
- Email is sent through `smtp.gmail.com` using a Google application password.
- Notification events, recipient rules, template metadata, template versions,
  outbox records, and delivery history are stored in PostgreSQL.
- Email template files are uploaded manually by an authorized administrator.
- Uploaded template contents are persisted in PostgreSQL and are not read from
  the deployment filesystem during dispatch.
- Version-controlled template source files remain under
  `apps/platform/src/modules/notifications/templates/email`.
- The first business events are `application.submitted` and
  `workflow.task.assigned`.
- Email delivery uses a transactional outbox and an authenticated internal
  processor in the existing Next.js application.
- A separate notification application or Docker image will not be created.

## 3. Scope

### 3.1 Included

- An email notification channel registered in the database.
- An immutable event catalogue keyed by stable event keys.
- Database-managed required recipient rules.
- Database-managed, manually uploaded, versioned HTML templates.
- Channel-first global, catalog, and event template targets with deterministic
  event-to-catalog-to-global fallback.
- Template validation and an explicit allow-list of merge fields.
- Recipient resolution from immutable event context.
- Recipient deduplication.
- A transactional notification outbox.
- Retryable Gmail SMTP delivery.
- Idempotent event capture and delivery.
- Delivery status and failure history.
- Initial integration with successful application submission.
- Initial integration with creation of assigned workflow tasks.
- Authorization and audit records for configuration changes.
- Unit and integration tests for engine, persistence, authorization, and
  dispatch behavior.

### 3.2 Deferred

- SMS, push, webhook, and in-application delivery channels.
- Optional user subscriptions.
- Configurable static or dynamic audiences.
- Attachments.
- A visual email-template editor.
- Arbitrary administrator-authored JavaScript or template expressions.
- A separate notification microservice or worker deployment.
- Notifications for approval, rejection, correction, cancellation, reminders,
  or SLA breaches.

Deferred events can be added through the same event and outbox model after the
first two events are proven in production.

## 4. Architectural placement

The implementation follows the repository structure contract:

```text
apps/platform/src/modules/notifications/
├── domain/
│   ├── NotificationEvent.ts
│   ├── NotificationRecipient.ts
│   ├── NotificationTemplate.ts
│   ├── NotificationTemplateTarget.ts
│   └── NotificationDelivery.ts
├── application/
│   ├── ServerNotificationEventService.ts
│   ├── ServerNotificationDispatchService.ts
│   ├── ServerNotificationConfigurationService.ts
│   └── NotificationTemplateRenderer.ts
├── infrastructure/
│   ├── notification.schema.ts
│   ├── NotificationConfigurationRepository.ts
│   ├── NotificationOutboxRepository.ts
│   ├── NotificationDeliveryRepository.ts
│   └── GmailSmtpEmailSender.ts
├── api/
│   └── NotificationSchemas.ts
├── templates/
│   └── email/
│       ├── application-submitted.html
│       └── workflow-task-assigned.html
└── index.ts
```

Only folders required by the implementation should be created. File names may
be split further to remain within the repository's file and function limits.

Route handlers remain thin and live below `src/app/api`. They validate input,
authorize the actor or internal caller, invoke the appropriate notification
service, and translate the result to HTTP.

### 4.1 WorkflowHub implementation alignment contract

WorkflowHub is the behavioral reference, not merely a visual reference. SME Fund
Fund adopts these implementation semantics:

- channel mechanisms are registered in source code while channel records,
  enabled state, and sort order are stored in PostgreSQL;
- catalogs own immutable event membership and provide the middle template
  fallback boundary;
- each event owns at most one rule aggregate;
- a rule owns one or more recipient entries, and each recipient entry owns its
  selected delivery-channel bindings;
- templates are channel-owned targets with global, catalog, or event scope;
- published template resolution is event, then catalog, then global;
- template versions are immutable after publication; and
- Channels, Event Catalogs, and Event Rules are separate administration
  concerns backed by the same notification domain.

The implementation is intentionally adapted rather than copied. Phase 1 does
not create WorkflowHub request-type template variants because SME Fund's two
initial event keys already identify their business context and no independent
request-type dimension exists. It also does not create audiences, profiles, or
subscriptions because those capabilities are explicitly deferred. If a real
SME Fund use case later requires either concept, it will be introduced as an
explicit model change rather than through unused compatibility columns.

## 5. Runtime flow

```text
Business command
    |
    | same PostgreSQL transaction
    v
Business state + notification occurrence
    |
    | transaction commits
    v
Notification outbox (PENDING)
    |
    | authenticated scheduled processor
    v
Resolve rule + captured recipients + event/catalog/global published template
    |
    v
Render and sanitize email
    |
    v
Gmail SMTP
    |
    +--> SENT delivery record
    |
    +--> retryable failure with backoff
    |
    +--> DEAD_LETTER record after five automatic attempts
```

The business operation must not call SMTP. Application submission or workflow
task creation and notification occurrence insertion commit atomically. SMTP
failure must never undo an already committed business transition.

## 6. Event catalogue

Event keys are immutable API-level identifiers. Labels and descriptions may be
edited, but a key must not be renamed after use.

Events belong to immutable catalogs used for template fallback. The initial
catalogs are `APPLICATIONS` and `WORKFLOW`. Catalog membership cannot be moved
after an event is created.

### 6.1 `application.submitted`

Meaning: an applicant successfully submitted an application and its workflow
instance was created.

Initial required rule:

| Channel | Recipient type      | Required | Enabled |
| ------- | ------------------- | -------: | ------: |
| Email   | `APPLICATION_OWNER` |      Yes |     Yes |

The event context captures:

- application ID;
- application reference;
- application owner user ID;
- owner display name and email snapshot;
- funding opportunity title;
- submission timestamp;
- workflow instance ID;
- correlation ID; and
- source idempotency key.

The event is inserted inside the existing application submission transaction.
An idempotent replay of the submission command must not create another event.

### 6.2 `workflow.task.assigned`

Meaning: one or more workflow task records were created for explicitly
assigned reviewers. This term does not mean assigning a workflow definition to
a funding opportunity.

Initial required rule:

| Channel | Recipient type  | Required | Enabled |
| ------- | --------------- | -------: | ------: |
| Email   | `ASSIGNED_USER` |      Yes |     Yes |

One occurrence may cover all tasks created by the same stage activation, but a
separate recipient delivery is created for each distinct assigned user. If one
user receives multiple tasks in the same activation, that user receives one
email containing the relevant task summary.

The event context captures:

- application ID and reference;
- workflow instance ID;
- stage instance ID and stage name;
- task IDs and task names;
- assigned user IDs;
- assignee display names and email snapshots;
- assignment timestamp;
- funding opportunity title;
- correlation ID; and
- the stage activation or transition idempotency key.

The event is inserted in the same transaction that creates the workflow tasks.

## 7. Recipient semantics

The first increment supports only these recipient types:

- `APPLICATION_OWNER`;
- `ASSIGNED_USER`.

Recipient rules are database-managed so an event can be enabled or disabled
without changing source code. Rules do not accept arbitrary SQL or executable
conditions.

Recipient identity is resolved and snapshotted when the occurrence is created.
This is important for workflow assignments: a later reassignment must not
change the historical recipient of an earlier assignment event.

Before delivery, the engine:

1. removes recipients without a syntactically valid email address;
2. normalizes email addresses for comparison;
3. deduplicates by normalized email address within an occurrence and channel;
4. retains the database user ID when present; and
5. records why each recipient was selected.

The original display name and email snapshot are retained for auditability.

## 8. Database model

All tables use the `app_` prefix and belong to the notifications module's
infrastructure layer.

### 8.1 `app_notification_channels`

Stores delivery-channel metadata.

Required fields:

- `id` UUID primary key;
- `code` text unique (`EMAIL` initially);
- `display_name` text;
- `channel_type` text with an email-only constraint initially;
- `sort_order` integer;
- `is_enabled` boolean;
- `created_at` and `updated_at` timestamps.

SMTP credentials are never stored in this table.

### 8.2 `app_notification_catalogs`

Stores stable event groupings used for administration and template fallback.

Required fields:

- `id` UUID primary key;
- `catalog_key` text unique and immutable;
- `display_name` text;
- `description` text;
- `sort_order` integer;
- `is_enabled` boolean;
- `created_at` and `updated_at` timestamps.

### 8.3 `app_notification_events`

Stores the event catalogue.

Required fields:

- `id` UUID primary key;
- `catalog_id` foreign key with immutable membership;
- `event_key` text unique and immutable;
- `display_name` text;
- `description` text;
- `is_enabled` boolean;
- `created_at` and `updated_at` timestamps.

### 8.4 `app_notification_event_rules`

Stores the rule aggregate for an event. One event has at most one rule.

Required fields:

- `id` UUID primary key;
- `event_id` foreign key;
- `description` text;
- `is_enabled` boolean;
- `created_at` and `updated_at` timestamps.

A unique constraint on `event_id` enforces one aggregate per event.

### 8.4.1 `app_notification_event_rule_recipients`

Stores the recipient entries owned by an event rule.

Required fields:

- `id` UUID primary key;
- `rule_id` foreign key;
- `recipient_type` text;
- `is_required` boolean; and
- `created_at` and `updated_at` timestamps.

A uniqueness constraint on `rule_id` and `recipient_type` prevents duplicate
recipient definitions within a rule.

### 8.4.2 `app_notification_event_rule_channels`

Stores the channel selections owned by a rule recipient.

Required fields:

- `id` UUID primary key;
- `rule_recipient_id` foreign key;
- `channel_id` foreign key; and
- `created_at` timestamp.

A uniqueness constraint on `rule_recipient_id` and `channel_id` prevents the
same channel from being selected twice. Removing a rule cascades only through
its owned recipient and channel rows; deleting a referenced channel remains
restricted.

### 8.5 `app_notification_template_targets`

Identifies a global, catalog, or event template target for a channel.

Required fields:

- `id` UUID primary key;
- `channel_id` foreign key;
- `scope` with `GLOBAL`, `CATALOG`, and `EVENT` values;
- `catalog_id` nullable foreign key, required only for `CATALOG`;
- `event_id` nullable foreign key, required only for `EVENT`;
- `is_enabled` boolean;
- `created_at` and `updated_at` timestamps.

There is at most one global target per channel, one target per channel and
catalog, and one target per channel and event. Scope and foreign-key shape are
database-constrained. Channel, scope, catalog, and event identity are immutable.

### 8.6 `app_notification_template_versions`

Stores every uploaded template version.

Required fields:

- `id` UUID primary key;
- `template_target_id` foreign key;
- `version_number` positive integer;
- `source_file_name` text;
- `media_type` text constrained to `text/html` initially;
- `subject_template` text;
- `html_template` text;
- `plain_text_template` text;
- `content_sha256` text;
- `status` with `DRAFT`, `PUBLISHED`, and `RETIRED` values;
- `uploaded_by_user_id` UUID;
- `published_by_user_id` nullable UUID;
- `created_at` and `published_at` timestamps.

Only one published version may exist for a template target. Publishing a new
version retires the previous published version in one transaction. Existing
delivery records continue to reference the version actually used.

Template selection checks enabled targets with published versions in this exact
order: event, the event's catalog, then global. A disabled or unpublished
specific target does not prevent fallback.

Placeholder allow-lists follow the same ownership boundary. Global targets may
use only global fields, catalog targets may use that catalog's fields, and event
targets may use the event fields. This keeps fallback templates valid for every
event they can serve.

### 8.7 `app_notification_outbox`

Stores durable business-event occurrences.

Required fields:

- `id` UUID primary key;
- `event_id` foreign key;
- `event_key` text snapshot;
- `aggregate_type` text;
- `aggregate_id` UUID;
- `occurrence_key` text;
- `correlation_id` text;
- `context` JSONB containing only the approved event-context schema;
- `status` with `PENDING`, `PROCESSING`, `PARTIALLY_SENT`, `SENT`, and `FAILED`;
- `available_at` timestamp;
- `attempt_count` non-negative integer;
- `last_error_code` and redacted `last_error_message` nullable text;
- `locked_at` and `locked_by` nullable fields;
- `created_at`, `processed_at`, and `updated_at` timestamps.

A unique constraint on `event_key` and `occurrence_key` prevents duplicate
occurrences. The context must not contain secrets or unrestricted application
form answers.

### 8.8 `app_notification_deliveries`

Stores one delivery per resolved recipient.

Required fields:

- `id` UUID primary key;
- `outbox_id` foreign key;
- `channel_id` foreign key;
- `template_version_id` nullable foreign key until resolved;
- `recipient_user_id` nullable UUID;
- `recipient_name` text snapshot;
- `recipient_email` text snapshot;
- `recipient_type` text;
- `resolution_path` text;
- `status` with `PENDING`, `PROCESSING`, `SENT`, and `FAILED`;
- `attempt_count` non-negative integer;
- `provider_message_id` nullable text;
- `last_error_code` and redacted `last_error_message` nullable text;
- `next_attempt_at`, `sent_at`, `created_at`, and `updated_at` timestamps.

A unique constraint on `outbox_id`, `channel_id`, and normalized recipient email
prevents duplicate delivery within an occurrence.

## 9. Template source and upload lifecycle

Approved source templates remain in:

```text
apps/platform/src/modules/notifications/templates/email/
```

These files are version-controlled examples and the maintainable source used by
the team. They are not loaded directly when email is sent. This avoids runtime
dependence on a mutable container filesystem and ensures that every dispatched
email references an immutable database version.

An authorized administrator manually uploads an `.html` file for a specific
event. The upload form also captures the subject template and optional plain
text template. If plain text is omitted, the server generates and stores a
validated plain-text alternative during import.

Upload behavior:

1. accept only `.html` and `text/html`;
2. enforce a conservative file-size limit, initially 256 KiB;
3. decode as UTF-8;
4. reject scripts, executable content, remote forms, event-handler attributes,
   and unsupported merge fields;
5. sanitize HTML on import;
6. validate subject and body merge fields against the event allow-list;
7. compute a SHA-256 digest;
8. create a new immutable draft version; and
9. write an audit record.

Uploading does not publish automatically. Publication is a separate authorized
action and must fail if validation no longer succeeds.

## 10. Template syntax and fields

Templates use simple escaped placeholders:

```text
{{recipientName}}
{{applicationReference}}
```

No loops, evaluation, property traversal, function calls, or unescaped raw HTML
placeholders are permitted in the initial engine. Every placeholder must be in
the event's server-defined field catalogue. Values are HTML-escaped before
substitution.

Initial fields for `application.submitted`:

- `recipientName`;
- `applicationReference`;
- `fundingOpportunityTitle`;
- `submittedAt`;
- `applicationUrl`;
- `platformName`.

Initial fields for `workflow.task.assigned`:

- `recipientName`;
- `applicationReference`;
- `fundingOpportunityTitle`;
- `stageName`;
- `taskSummary`;
- `assignedAt`;
- `workQueueUrl`;
- `platformName`.

URLs are constructed by the server from a configured public application base
URL. URLs are not accepted from an uploaded template or client request.

## 11. SMTP integration

The email adapter uses Nodemailer with an exact dependency version. It remains
behind an application-owned interface so the provider can be replaced without
changing event, rule, template, or outbox code.

Required server-only environment variables:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=SME Fund
APP_PUBLIC_URL=
```

`SMTP_APP_PASSWORD` is a Google application password, not the account's normal
password. The Google account must have two-step verification enabled. Secrets
must be supplied by the deployment secret store and must not be committed to
Git, stored in PostgreSQL, returned through an API, or written to logs.

The sender validates that `SMTP_FROM_EMAIL` is compatible with the authenticated
Gmail account. Reply-to support is deferred unless a verified operational
mailbox is supplied.

## 12. Processor and deployment model

The sender is part of the existing Next.js application. It is not a separate
Docker application.

An internal route invokes one bounded processing batch. A scheduler calls this
route at a configured interval. The route must use deployment-grade service
authentication; it must not rely on a public shared query parameter. The final
authentication mechanism will match the deployed scheduler platform. Local and
test environments may use a server-only bearer secret.

Processing behavior:

1. atomically claim a bounded batch using row locks and skip already locked
   rows;
2. release stale locks after a defined timeout;
3. resolve the enabled event rule and current published template;
4. create or load idempotent recipient delivery records;
5. render and send each pending delivery;
6. record the SMTP message identifier when available;
7. update aggregate outbox status; and
8. stop after the configured batch or execution-time limit.

The default retry policy is proposed as five attempts with exponential backoff
and jitter. Authentication failures, invalid sender configuration, missing
published templates, and invalid recipient addresses are classified explicitly
instead of being retried indefinitely.

Running multiple processor calls concurrently must be safe. PostgreSQL claims
ensure that a delivery is owned by only one processor at a time. This provides
application-level idempotency; SMTP itself cannot guarantee exactly-once
delivery after an ambiguous network failure.

## 13. Authorization

New fine-grained permissions will be added to the canonical permissions
directory. Proposed permissions are:

- `notifications.configuration.read`;
- `notifications.configuration.update`;
- `notifications.template.import`;
- `notifications.template.publish`;
- `notifications.delivery.read`;
- `notifications.delivery.retry`.

The exact codes must follow existing catalogue conventions during
implementation. Every configuration, import, publication, inspection, or retry
operation performs a server-side permission check. Internal dispatch uses
service authentication rather than a staff role.

Template upload, publication, event/rule changes, and manual retries generate
audit entries containing actor, action, target, timestamp, and correlation ID.
Secrets and complete rendered email bodies are excluded from audit metadata.

## 14. Administration surface

The initial administration surface should provide:

- a channel list at `/admin/notifications/channels`;
- a channel detail at `/admin/notifications/channels/[channelCode]` grouping
  global, catalog, and event template targets;
- template version management at
  `/admin/notifications/channels/[channelCode]/templates/[targetId]`;
- an Event Catalogs sidebar entry at
  `/admin/notifications/event-catalogs` with detail at
  `/admin/notifications/event-catalogs/[catalogKey]`;
- an Event Rules sidebar entry at `/admin/notifications/event-rules`;
- event rule detail at `/admin/notifications/event-rules/[eventKey]`, showing
  channel bindings and required/enabled recipient rules grouped by catalog;
- event list and enabled state;
- required recipient rule list and enabled state;
- template version history;
- manual HTML upload;
- validation errors and detected placeholders;
- explicit publish action;
- delivery list with event, recipient, status, attempts, and timestamps; and
- authorized retry for failed deliveries.

Forms must use React Hook Form, Zod, and `zodResolver`. Client components use
TanStack Query hooks and a `ClientNotificationService`; they must not call
`fetch` or SMTP directly.

If the administration surface is split into a later delivery milestone, the
first increment must still provide a secure, repeatable seed/import path for the
two initial event rules and templates. Direct manual database edits are not an
accepted configuration workflow.

## 15. Failure and security behavior

- A missing or unpublished template records a configuration failure without
  rolling back the business action.
- A disabled event or rule records that no delivery was required and completes
  the occurrence without SMTP activity.
- One invalid recipient does not prevent other recipients from being sent.
- SMTP responses are mapped to stable internal error codes.
- Logs contain event IDs, occurrence IDs, delivery IDs, and correlation IDs,
  but never the SMTP password or rendered body.
- Recipient addresses are treated as personal information and shown only to
  appropriately authorized staff.
- Uploaded HTML is sanitized and cannot execute server-side code.
- Template fields cannot expose arbitrary database columns or application form
  responses.
- Processing endpoints are deny-by-default and are not callable by ordinary
  authenticated users.

## 16. Seed data

A repeatable migration or seed operation creates:

- the `EMAIL` channel;
- the `APPLICATIONS` and `WORKFLOW` catalogs;
- the `application.submitted` event;
- its required `APPLICATION_OWNER` email rule;
- the `workflow.task.assigned` event; and
- its required `ASSIGNED_USER` email rule;
- one global Email template target;
- one Email target for each initial catalog; and
- one Email target for each initial event.

Seed operations use stable identifiers or conflict-safe keys and can be rerun
without creating duplicates. Template versions remain explicit manual imports;
the presence of version-controlled HTML source files does not silently publish
them.

## 17. Testing requirements

### 17.1 Unit tests

- event-context validation;
- recipient resolution and deduplication;
- template placeholder validation;
- HTML escaping and sanitization;
- subject and plain-text rendering;
- retry classification and backoff;
- aggregate outbox status calculation; and
- SMTP configuration validation.

### 17.2 Repository and integration tests

- migration and constraints;
- idempotent occurrence insertion;
- task-assignment recipient snapshots;
- concurrent outbox claiming;
- stale-lock recovery;
- published-template selection;
- template version publication transaction;
- filtering, ordering, and pagination for delivery history; and
- allowed, denied, and context-mismatch authorization cases.

### 17.3 SMTP adapter tests

Automated tests use an injected fake transport or a local test SMTP server. They
must not send email through the real Gmail account. A separately invoked smoke
test may send to an approved test mailbox when deployment secrets are present.

### 17.4 Required repository gates

Before implementation is reported complete, run and record evidence for:

- architecture boundary checks;
- file-size checks;
- lint;
- type checking;
- tests; and
- the production build.

## 18. Initial acceptance criteria

The first increment is accepted when all of the following are true:

1. A successful new application submission creates exactly one durable
   `application.submitted` occurrence in the submission transaction.
2. An idempotent submission replay creates no duplicate occurrence or email.
3. Creating assigned workflow tasks creates one durable
   `workflow.task.assigned` occurrence with immutable assignee snapshots.
4. Duplicate assignments for one user within an activation produce one email
   to that user.
5. An authorized administrator can upload, validate, version, and publish an
   HTML template without editing the database directly.
6. The processor sends through configured Gmail SMTP and records the result.
7. Temporary SMTP failures retry without repeating successful recipient
   deliveries.
8. Missing configuration produces an inspectable failure while leaving the
   application or workflow transaction committed.
9. Unauthorized users cannot manage templates, rules, delivery records, or
   retries.
10. No SMTP secret or rendered email body appears in client bundles, API
    responses, audit metadata, or logs.
11. All required repository quality gates pass with written evidence.

## 19. Implementation sequence

After this design is approved, implementation should proceed in these slices:

1. notification domain contracts, schema, migration, and repeatable seed data;
2. event capture API and transactional integration with submission and task
   creation;
3. template upload, validation, versioning, publication, and source templates;
4. outbox processor, Gmail SMTP adapter, retry handling, and internal endpoint;
5. administration UI and delivery visibility;
6. full gate execution and operational SMTP smoke-test instructions.

Each slice must preserve the single-application architecture and may be
reviewed independently.
