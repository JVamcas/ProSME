# Workflow action notifications — local implementation gate

Date: 15 October 2026.

## Delivered behavior

The action wizard now follows Action details → Behaviour → Routing → Notifications → Review. Notifications use the shared DataTable and ActionMenu. Each row opens a dialog containing the shared workflow condition builder, a recipient selector, subject, and rich-text body. A null condition means always send. Every matching row is processed independently; conditions use the same saved application and stage-response context as action routing.

Recipients are the application owner, the action performer, assigned users in the source stage, a selected active user, or active members of a selected role. Subject and body parameter controls insert `{{fundingcalltitle}}`, `{{applicationreference}}`, `{{stagename}}`, `{{actionlabel}}`, `{{actorname}}`, and `{{recipientname}}`. The body insertion control uses the rich-text cursor position. Review includes the notification table.

Notification rows belong to the action on its exact workflow version. Existing draft-update authorization, revision checks, transaction, and audit apply. Publication validation also checks notification conditions and selected recipients. Rich text is sanitized on definition parsing; unsupported parameters, blank rich text, and multiline subjects are rejected.

The authenticated action execution service prepares notification content and resolves recipients after permission, assignment, routing, and readiness checks. It writes matching messages and recipient deliveries into the existing notification outbox in the action transaction. Rendering uses captured content and values. Existing queue retry and delivery logging apply. Occurrence keys combine action execution and notification row IDs; replaying an action cannot create another occurrence. Missing active recipients or unavailable email configuration fail the action transaction rather than silently losing a required notification.

## Persistence and migration

`0212_workflow_action_notifications.sql` adds the action notification JSON column with an empty-array default and registers the server-controlled `workflow.action.notification` event. Existing actions remain readable without notification rows. Whole-graph writes and version copies retain rows through the existing graph persistence path.

The migration was applied twice against temporary PostgreSQL tables. The repeat preserved configured rows and did not duplicate the event. No application database was migrated, and no deployment or production build was run.

## Verification evidence

- Full lint passed; focused lint covers the final changed files.
- Type checking passed for the implementation.
- The expanded unit/UI regression run covered 93 files and 531 tests: 530 passed initially; the remaining diagram action-editor navigation test was updated for the new wizard step and passed on its focused rerun. The notification table interaction test passed again on that rerun.
- Five additional publication validation tests passed for unavailable/available selected users and roles and invalid notification conditions. Total distinct unit/UI tests covered: 536.
- Twelve action-definition tests passed again after splitting their test groups to respect the function-size limit.
- Four disposable PostgreSQL tests passed: repeatable migration, recipient scope and projection, independent occurrence persistence with replay suppression, and transactional rollback of occurrences and deliveries.
- Architecture boundary, form architecture, and component reuse checks passed.
- Changed implementation/test files meet the existing 400/300-line gate, and changed-file functions meet the 200-line limit.
- `git diff --check` passed.

The repository-wide file-size gate remains blocked by these unchanged baseline files; their HEAD and working-tree line counts match:

| File | Existing size / gate limit |
| --- | ---: |
| `src/modules/forms/infrastructure/FormRepository.ts` | 422 / 400 |
| `tests/integration/FormDraftSyncPostgres.test.ts` | 392 / 300 |
| `tests/integration/WorkflowTemplateDeletionPostgres.test.ts` | 332 / 300 |
| `tests/unit/application-documents/ServerApplicationDocumentService.test.ts` | 400 / 300 |
| `tests/unit/forms/ServerFormsService.test.ts` | 363 / 300 |

Paths in this table are relative to `apps/platform`.

## Acceptance boundary

Local implementation is accepted against the automated evidence above. This is not browser, rebuilt-container, deployed-environment, SMTP-provider, or inbox acceptance. Those checks remain open. Database tests used an isolated temporary PostgreSQL container, which was removed after verification. Existing concurrent application-appeal edits were preserved.
