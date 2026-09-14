# Phase 3 configurable workflow contract

## Status and scope

- Increment: P3.0
- State: Agreed
- Workflow-definition persistence: P3.3, before submission instantiation

This is a configurable SME Fund workflow engine, not a general-purpose BPM
suite, script host, or unrestricted form builder. Unknown programme rules are
configuration and do not block the engine foundation.

## Aggregate model

```text
WorkflowDefinition
└── WorkflowDefinitionVersion
    ├── WorkflowStageDefinition
    │   └── StageTaskDefinition
    └── WorkflowTransitionDefinition

Application
└── WorkflowInstance -> WorkflowDefinitionVersion
    └── WorkflowStageInstance
        └── StageTaskInstance
```

Information requests, comments, audit events, notification outbox records, and
integration outbox records reference runtime records without rewriting their
history.

## Definition records

| Record                         | Required contract                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `WorkflowDefinition`           | Stable ID, unique code, name, description, active flag, timestamps                                                          |
| `WorkflowDefinitionVersion`    | Definition ID, positive version number, lifecycle status, timestamps, creator, publisher                                    |
| `WorkflowStageDefinition`      | Version ID, unique code within version, name, sequence, applicant-safe status and SLA configuration                         |
| `StageTaskDefinition`          | Stage ID, unique code within stage, name, registered type, sequence, required flag, role/user assignment, configuration JSON |
| `WorkflowTransitionDefinition` | Version ID, from stage, action code, to stage or terminal outcome, required capability, optional declarative condition      |

Definition codes are stable machine identifiers. Names and applicant-facing
labels are editable display values. Sequence values are unique within their
parent and normalized transactionally after reordering.

## Version lifecycle

```text
DRAFT -> PUBLISHED -> RETIRED
```

- A definition can have multiple versions and at most one mutable draft.
- Publishing validates the complete stage/task/transition graph in one service
  transaction.
- A version and all its child records remain editable until the first workflow
  instance is created from it.
- Creating a workflow instance makes its pinned definition version immutable.
- Editing an instance-backed version clones it to the next draft version.
- Retiring prevents new applications from selecting the version but does not
  affect existing workflow instances.
- An application pins one exact published version at submission.
- Draft or retired versions cannot be instantiated.
- Published versions cannot be deleted.

## Graph validation

Publication fails unless:

- the definition contains at least one stage and one terminal outcome;
- stage and task codes and sequences are unique in scope;
- every task type exists in the typed registry and its configuration validates;
- every non-terminal stage has at least one valid outgoing transition;
- all transition targets belong to the same version;
- the initial stage is unique and all stages are reachable;
- unintended cycles and transitions into the initial stage are rejected;
- required capabilities exist;
- assignment references point to active application roles or users;
- applicant labels contain no internal score, recommendation, assignment, or
  committee information.

Transition conditions are declarative data validated by a registered condition
handler. Database configuration cannot contain or execute code.

## Runtime records

| Record                  | Required contract                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkflowInstance`      | Application ID, pinned version ID, status, current stage ID, start/end timestamps                                                     |
| `WorkflowStageInstance` | Workflow instance ID, stage definition ID, status and start/end timestamps                                                               |
| `StageTaskInstance`     | Stage instance ID, task definition ID, type snapshot, status, assignment, due date, result payload, start/end timestamps, row version |

Runtime instances snapshot the definition references and assignment used when
created. Definition changes never mutate running applications.

## Runtime status vocabularies

| Aggregate             | Values                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Workflow              | `ACTIVE`, `COMPLETED`, `CANCELLED`                                                           |
| Stage                 | `NOT_STARTED`, `ACTIVE`, `BLOCKED`, `COMPLETED`, `CANCELLED`                                 |
| Task                  | `PENDING`, `READY`, `CLAIMED`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `SKIPPED`, `CANCELLED` |
| Information request   | `DRAFT`, `SENT`, `RESPONDED`, `ACCEPTED`, `CANCELLED`                                        |
| Notification delivery | `PENDING`, `SENDING`, `DELIVERED`, `FAILED`, `CANCELLED`                                     |

Applicant-safe application statuses are separate:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
ACTION_REQUIRED
OUTCOME_AVAILABLE
CLOSED
WITHDRAWN
```

The stage definition maps internal state to an applicant-safe status, label,
and description.

## Task-type registry

Each registry entry supplies a type code, configuration schema, result schema,
renderer key, server handler, allowed actions, required capabilities, and test
contract. Adding configured tasks of an existing type requires no deployment.
A new behaviour requires a new typed registry entry and deployment.

| Type                   | Configuration contract                                          | Result contract                                |
| ---------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| `AUTOMATED_RULE_CHECK` | Versioned ruleset, inputs, categories, explanation rules        | Category, score if used, reasons, rule version |
| `CHECKLIST`            | Stable item codes, labels, required flags                       | Item decisions and comments                    |
| `DOCUMENT_REVIEW`      | Document categories and allowed review outcomes                 | Decision per document/category and comments    |
| `STRUCTURED_FORM`      | Bounded supported fields, validation and conditional visibility | Validated field values                         |
| `ASSESSMENT_FORM`      | Criteria, maximum scores, weights, comment requirements         | Criterion scores, weighted total, comments     |
| `FINANCE_REVIEW`       | Approved finance fields and recommendation options              | Validated finance values and recommendation    |
| `INFORMATION_REQUEST`  | Categories, response requirements and template reference        | Request reference and resolution outcome       |
| `RECOMMENDATION`       | Configured options and required rationale                       | Selected recommendation and rationale          |
| `DECISION`             | Outcomes, authority capability and rationale requirements       | Decision, rationale and authority snapshot     |
| `COMMUNICATION`        | Template, channel, audience and trigger                         | Outbox reference and delivery state            |

`STRUCTURED_FORM` initially supports text, textarea, integer, decimal, currency,
date, single-select, multi-select, checkbox, and read-only calculated display.
It does not support arbitrary HTML, JavaScript, SQL, or remote component URLs.

## Assignment contract

- A stage definition does not assign work.
- A task definition owns its assignment and targets either a configured role or
  a named user.
- Assignment controls queue ownership; capability controls authority.
- A user must satisfy both assignment scope and required capability.
- Claiming a role task is an atomic compare-and-set operation.
- Reassignment records previous assignee, new assignee, actor, time, and reason.
- Bulk assignment is a single bounded transaction, never a per-row command loop.

## Task and transition actions

The controlled action vocabulary is:

```text
CLAIM, ASSIGN, START, SAVE, COMPLETE, SKIP,
REQUEST_INFORMATION, ACCEPT_INFORMATION,
RECOMMEND_PROCEED, RECOMMEND_REJECT,
APPROVE, DECLINE, RETURN, OVERRIDE, CANCEL
```

Task completion validates the task result schema and allowed action. A stage
completes only when all required tasks meet their completion rule. The workflow
service then resolves exactly one allowed transition and creates the next stage
and tasks in the same transaction.

Manual override requires an explicit capability, reason, prior state, new
state, actor, and timestamp. It cannot erase the original recommendation or
decision.

## Information-request contract

An information request is a first-class record attached to the originating
task. Sending it blocks that task and exposes only the request text, due date,
allowed upload categories, and response state to the applicant. An applicant
response appends data and documents; it never edits the submitted application.
Acceptance returns the originating task to the work queue. This is not modeled
as a stage loop.

## Automated pre-screening

Automated pre-screening applies a versioned ruleset, records inputs, category,
score when applicable, and human-readable reasons. It can categorize,
prioritize, or shortlist. It cannot silently issue the final funding decision.
An authorized user can override the recommendation with a recorded reason.

## Reference workflow

The P3.3 seed is editable draft configuration:

1. Submission and automated pre-screening.
2. Completeness screening.
3. Technical assessment.
4. Finance review.
5. Committee decision.
6. Outcome communication.

This seed assists the client; it is not approved programme policy. Exact
criteria, weights, document limits, templates, role labels, and delegated
authority remain draft until the programme owner approves a publishable
version.

## Atomicity and audit invariants

- Submission creates the application reference, workflow instance, initial
  stage/tasks, audit event, and confirmation outbox record atomically.
- A transition updates the current task/stage, creates the next stage/tasks,
  appends audit events, and enqueues notifications atomically.
- Commands carry an idempotency key and task row version.
- Audit events are append-only and contain actor, action, target, correlation
  ID, time, and safe before/after metadata.
- ERP integration uses a transactional outbox with a versioned payload; a
  workflow transaction never calls the ERP synchronously.
