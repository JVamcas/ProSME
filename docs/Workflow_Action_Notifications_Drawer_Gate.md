# Workflow action notifications drawer

Date: 2026-10-15

## Implemented behavior

- Action configuration now has four steps: Action details, Behaviour, Routing
  and Review. Notifications have been removed from both the stepper and its
  review content. Existing notifications remain part of the saved action data.
- The stage Actions table has a Notifications column immediately before Actions.
  It displays `View (count)` for configured notifications and `None` otherwise.
- Both `View (count)` and the row menu's Notifications item open the same shared
  RightDrawer. The menu remains available for actions without notifications.
- The drawer shows the action and its assigned task names, recipient, subject,
  condition and sanitized body. Add/Edit forms replace the list inside the same
  drawer. No notification dialog is nested over the drawer.
- Add, edit and delete change the drawer draft. Save notifications persists that
  draft; Close discards it. Cancel inside an individual form returns to the list
  without applying that form's changes. Users without edit access see read-only
  content, with no add/edit/delete/save controls.

## Contracts preserved

The existing notification form fields, parameter insertion, condition validation,
React Hook Form/Zod validation, rich text and recipient options are reused.
The former notification dialog and step component were replaced by focused form,
list and drawer components in the workflow definitions UI folder.

Saving uses the existing TanStack Query action-save hook, frontend client service
and protected action endpoint. The command preserves the action's other fields,
routes and task bindings. It keeps the opening workflow version and row version,
so concurrent edits produce a conflict instead of overwriting newer changes.
Errors retain the drawer draft for recovery. Successful saves update the existing
editor cache, which supplies the Notifications column's saved count.

The unchanged backend still requires `workflow.definition.update`, checks the
definition/version relationship, permits only draft versions, validates the
action/notifications and performs the write transactionally. No new permission,
API route, database schema change or migration was required.

## Validation

- **62 tests passed in 10 files**, covering table entry points, notification
  creation/editing/deletion, parameters, cancelled edits, view-only access,
  retained save errors, opening-version conflicts, four-step action editing,
  preserved notifications, action save authorization/routes, cache updates,
  notification validation/publication and stage/path action regressions.
- Type checking passed.
- Full lint passed with zero errors and 20 existing unrelated warnings.
- Architecture, form architecture and component reuse checks passed.
- `git diff --check` passed.
- The file-size gate still reports five pre-existing violations:
  `FormRepository.ts`, `FormDraftSyncPostgres.test.ts`,
  `WorkflowTemplateDeletionPostgres.test.ts`,
  `ServerApplicationDocumentService.test.ts` and `ServerFormsService.test.ts`.
  No file changed for this feature appears in that list.

## Acceptance remaining

These results establish local source and component/contract verification.
Browser appearance and keyboard behavior have not been accepted in a running
application. The earlier browser attempt in this session failed because the
installed Chromium lacks `libnspr4.so`; browser setup was not retried and no
browser/system dependencies were installed. No production build or deployment
was performed. Overall browser and release acceptance remain open.
