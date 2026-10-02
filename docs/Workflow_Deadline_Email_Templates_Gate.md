# Workflow deadline email templates

Date: 2026-10-03

## Scope and review

Four importable HTML emails use the existing branded email layout, inline logo,
button styling and backup links. Subjects and message bodies explain the event
and next action in everyday language, without deadline-kind codes or internal
event names in the email copy.

| Event | HTML file | Subject |
| --- | --- | --- |
| Review overdue | `workflow-sla-breached.html` | Review overdue for application `{{applicationReference}}` |
| Information reminder | `information-request-reminder.html` | Reminder: information needed for application `{{applicationReference}}` |
| Hold review due | `workflow-hold-review-due.html` | Time to review application `{{applicationReference}}` on hold |
| Review resumed | `workflow-deferral-resumed.html` | Review resumed for application `{{applicationReference}}` |

Files are under `apps/platform/src/modules/notifications/templates/email`.
The hold email explicitly says the hold remains active until a decision is made.
The information reminder links to the applicant's information request; staff
review notifications link to the existing work queue.

Seeding and migration `0150_workflow_deadline_template_targets.sql` register
event-specific template targets. Existing targets, enable switches, and published
content remain under staff control. No automatic publication or delivery retry is
included. No template content is embedded in implementation files.

Delivery history now translates known failure codes and delivery outcomes into
readable text. Unknown failure codes receive a safe fallback. Internal codes
remain available to the processor and logs.

## Evidence

- Focused template import, seed, delivery message and history tests: 40 passed
  across four files.
- PostgreSQL migration check on the local container: first execution inserted
  four targets; the second inserted zero. The result had one target per event.
  The transaction was rolled back, leaving the running database unchanged.
- Architecture and form architecture checks passed for 1,257 source files.
- File-size check failed in the unrelated, concurrently edited
  `tests/unit/work-queue/ServerWorkflowTaskService.test.ts` (311/300).
- Remaining repository validation results are recorded after completion.

## Activation and acceptance

Apply the migration through the normal migration runner. In Notifications →
Channels → Email, import each HTML file into its matching event target, using the
subject above, then publish the imported draft. The importer generates the plain
text version. Staff can then retry the failed hold-review notification through
delivery history with the required reason and permission.

Scoped acceptance covers source template validation, readable delivery messages,
and repeatable target registration. Live publication, real email delivery,
deployment, and repository-wide green validation are not claimed.
