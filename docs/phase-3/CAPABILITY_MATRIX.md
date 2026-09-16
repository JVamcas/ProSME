# Phase 3 capability catalogue and draft role matrix

## Status

- Increment: P3.0
- Capability catalogue: Agreed
- Role grants: Draft seed pending programme-owner approval before G3

Capabilities are stable machine codes owned by PostgreSQL. Routes, components,
services, repositories, exports, and storage adapters check capabilities rather
than display role names. Assignment scope is enforced in addition to a
capability.

## Applicant capabilities

```text
profile.read.own
profile.update.own
business.read.own
business.update.own
eligibility.create
eligibility.read.own
application.create
application.read.own
application.update.own
application.submit
document.read.own
document.upload.own
information_request.read.own
information_request.respond.own
message.read.own
notification.read.own
resource.save.own
```

## Operations capabilities

```text
admin.access
work_queue.read
workflow.task.read
workflow.task.claim
workflow.task.assign
workflow.task.complete
application.read.assigned
application.read.all
application.screen
application.assess
application.finance_review
application.comment
application.request_information
application.recommend
application.decide
application.override
application.bulk_update
communication.read
communication.send
communication.batch
application.export
workflow.definition.read
workflow.definition.create
workflow.definition.update
workflow.definition.publish
workflow.definition.retire
form.read
form.create
form.update
form.publish
form.retire
user.read
user.manage
role.read
role.manage
audit.read
integration.erp.enqueue
```

Existing `cms.*` capabilities remain governed by
`docs/architecture/CMS_CAPABILITY_MATRIX.md` and do not grant application or
workflow access.

## Capability semantics

| Capability                        | Authority                                                     |
| --------------------------------- | ------------------------------------------------------------- |
| `work_queue.read`                 | Read queue rows within assignment scope                       |
| `workflow.task.read`              | Read the active typed task payload within assignment scope    |
| `workflow.task.claim`             | Atomically claim an eligible role task                        |
| `workflow.task.assign`            | Assign or reassign a task with audit reason                   |
| `workflow.task.complete`          | Complete a task when its type-specific capability also passes |
| `application.read.assigned`       | Read an application connected to an assigned task             |
| `application.read.all`            | Read any application in the permitted programme scope         |
| `application.screen`              | Complete screening and document-review tasks                  |
| `application.assess`              | Complete technical assessment tasks                           |
| `application.finance_review`      | Complete finance-review tasks                                 |
| `application.comment`             | Add internal reviewer comments                                |
| `application.request_information` | Send and resolve applicant information requests               |
| `application.recommend`           | Record a recommendation and rationale                         |
| `application.decide`              | Record an authorized outcome decision                         |
| `application.override`            | Override an automated/manual recommendation with reason       |
| `application.bulk_update`         | Execute allow-listed bulk transitions                         |
| `communication.batch`             | Enqueue one communication to a bounded selected audience      |
| `application.export`              | Create an audited, projection-limited CSV/Excel export        |
| `workflow.definition.*`           | Read or manage the definition/version lifecycle action named  |
| `integration.erp.enqueue`         | Enqueue an approved versioned ERP event; no direct ERP access |

Form-backed tasks use `workflow.task.complete` plus assignment scope; they do
not require a legacy type-specific capability. The legacy typed task routes
retain the type-specific/action-specific checks until migrated.

`workflow.task.complete` alone grants no assessment, finance,
recommendation, or decision authority.

Form administration capabilities govern reusable operational form definitions
and versions. Form names, codes, field names, and task names never grant an
application capability. Assignment scope remains the resource authorization
rule for form-backed task work.

## Draft role grants

Legend: `R` read, `W` perform, `A` administer. This is the TOR-aligned seed for
client review, not a hard-coded policy.

| Area                              | Applicant | Programme Officer | Sector Specialist | Finance Officer | Approval Panel Member | System Administrator |
| --------------------------------- | --------- | ----------------- | ----------------- | --------------- | --------------------- | -------------------- |
| Own profile/business/applications | W         | —                 | —                 | —               | —                     | A                    |
| Operations portal and queue       | —         | W                 | W                 | W               | W                     | A                    |
| Assigned application/task read    | —         | W                 | W                 | W               | W                     | A                    |
| All application read              | —         | R                 | —                 | —               | R                     | A                    |
| Screening/document review         | —         | W                 | —                 | —               | —                     | A                    |
| Technical assessment              | —         | —                 | W                 | —               | —                     | A                    |
| Finance review                    | —         | —                 | —                 | W               | —                     | A                    |
| Internal comments                 | —         | W                 | W                 | W               | W                     | A                    |
| Information request               | —         | W                 | W                 | W               | —                     | A                    |
| Recommendation                    | —         | W                 | W                 | W               | —                     | A                    |
| Decision                          | —         | —                 | —                 | —               | W                     | A                    |
| Manual override                   | —         | —                 | —                 | —               | —                     | A                    |
| Bulk update/communication         | —         | W                 | —                 | —               | —                     | A                    |
| Export                            | —         | W                 | —                 | W               | R                     | A                    |
| Workflow definition lifecycle     | —         | R                 | —                 | —               | R                     | A                    |
| Form administration               | —         | R                 | —                 | —               | —                     | A                    |
| User/role administration          | —         | —                 | —                 | —               | —                     | A                    |
| Audit                             | —         | R                 | —                 | —               | R                     | A                    |
| ERP event enqueue                 | —         | —                 | —                 | W               | —                     | A                    |

Finance Officer is a proposed application role because the agreed reference
workflow contains finance review. The programme owner must confirm the role
name and delegated authority before publishing the production workflow.

## Route visibility

| Route                   | Required capability                                       |
| ----------------------- | --------------------------------------------------------- |
| `/portal`               | any applicant own-scope capability                        |
| `/admin`                | `admin.access`                                            |
| `/admin/work-queue`     | `work_queue.read`                                         |
| `/admin/applications`   | `application.read.assigned` or `application.read.all`     |
| `/admin/communications` | `communication.read`, `send`, or `batch`                  |
| `/admin/reports`        | `application.export` or an approved reporting capability  |
| `/admin/workflows`      | any `workflow.definition.*` capability                    |
| `/admin/settings/forms` | `form.read`                                               |
| `/admin/users`          | `user.read`, `user.manage`, `role.read`, or `role.manage` |
| `/admin/audit-log`      | `audit.read`                                              |

Navigation filtering does not replace server checks.

## Approval items retained as configuration

Before G3, the programme owner must confirm:

- whether Programme Officers can read all applications or only assigned ones;
- the Finance Officer role name and finance decision boundary;
- which Approval Panel Members can decide and whether quorum is required;
- who can publish and retire workflow versions;
- who can bulk update, batch communicate, export, and enqueue ERP events;
- which actions, if any, can be delegated temporarily.

Until approved, P3.1 seeds these grants as draft data and decision/publication
actions remain disabled.
