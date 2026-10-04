# Put on Hold implementation verification

Date: 2026-10-04

This records the agreed implementation and engineering checks. It does not claim deployment or client acceptance.

## Agreed behaviour

The reviewer chooses the scope at execution: **This task**, **This stage**, or **The application**. This task is the default when permitted. The UI offers only scopes authorized for that reviewer, and the server checks the selected scope against the actual workflow, stage and task context.

| Scope | Suspended processing | Staff display |
| --- | --- | --- |
| Task | The selected task; peer reviewers can continue | Task On hold; stage stays in progress with held-task context |
| Stage | All unfinished tasks in that stage | Stage and affected tasks On hold |
| Application | All active stages and unfinished tasks, including parallel branches; new stage activation is blocked | Application, active stages and affected tasks On hold |

Holds are separate records. They preserve task progress, captured responses, assignments, completed work and the application lifecycle. Completed/cancelled work and unstarted stages retain their existing statuses. Applicant/public status continues to use the configured stage-level applicant status.

The review-date field remains visible. It is mandatory only when **Require a review date** is enabled. With a date, the existing deadline processor ends that hold automatically and captures an email notification for the person who placed it. Without a date, an authorized user resumes it manually. Notes follow the action's existing required-reason setting.

Manual resume identifies a specific active hold and checks permission for that hold's original scope. Ending either a manual or scheduled hold preserves other holds and blockers. It does not complete tasks or advance stages. Task SLA projections merge overlapping pause periods without modifying the original stored deadline.

The resumption email uses the existing branded HTML structure: presentation tables, logo, orange accent, navy button, fallback URL and footer. Its wording distinguishes an ended hold from work still affected by another hold.

## Permissions and migration

The canonical permission catalogue now defines:

- `workflow.task.assigned.hold` and `workflow.task.assigned.resume`, with verified task assignment.
- `workflow.stage.all.hold` and `workflow.stage.all.resume`.
- `workflow.instance.all.hold` and `workflow.instance.all.resume`.

Migration `0159_workflow_hold_scopes.sql` installs scope constraints, per-scope active-hold uniqueness, context validation, permissions, the initiator notification relationship and the new email event/template. Existing task processors receive the narrow task controls; the existing full administrator role receives wider controls. Other wider grants remain explicit administrator choices. Scheduled processing retains `workflow.deadline.all.process` authorization.

The migration preserves existing administrator notification configuration and published workflow definitions. Its initial email template is installed only for an empty target. Migration execution was tested on a fresh isolated PostgreSQL database and repeated inside the integration fixture. The application database was not migrated by this work.

## Verification

- Architecture and form architecture: passed.
- Repository file-size checks and function-size inspection: passed.
- Lint: passed with 16 existing warnings and zero errors.
- Production build: passed, including TypeScript validation and all 86 static pages.
- Standalone type checking after the production build: passed.
- Hold/deadline PostgreSQL integration: **23 passed**, using synthetic data in an isolated PostgreSQL container.
- New permission, input, notification and dialog checks passed. Additional outcome/progress/dialog regressions: **16 passed**.
- Full suite: **2,158 passed, 185 skipped, one failed**. The remaining failure is `operations-list-screens.test.tsx`, whose application-list assertion expects a reference while a separate in-progress UI change displays the application UUID. That unrelated display change was preserved.
- `git diff --check`: passed.

Integration coverage includes task/stage/application isolation, parallel work, preserved progress and applicant mapping, staff application-list projection, blocked drafts/evaluation/stage activation, overlapping holds, initiator-only delivery, scheduled replay deduplication, legacy stage holds and scoped SLA accounting. This work also corrects an existing unmatched parenthesis in the shared deadline-notification snapshot query that the PostgreSQL tests exposed.

## Rollout

Apply migration 0159 to the target application database before running the new code. Deploy the application and its existing scheduler together. Wider hold/resume authority can then be assigned through the canonical role permissions. No application deployment or live email delivery was performed during verification.
