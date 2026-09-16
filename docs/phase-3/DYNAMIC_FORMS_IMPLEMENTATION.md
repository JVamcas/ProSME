# Dynamic forms and sequential workflow implementation contract

## Document control

| Field | Value |
| --- | --- |
| Status | Approved implementation specification |
| Date | 15 September 2026 |
| Scope | Operations form builder, form-backed workflow tasks, submissions, and sequential stage advancement |
| Application | The single Next.js application at `apps/platform` |

## 1. Purpose

This document is the implementation source of truth for reusable, versioned
dynamic forms and form-backed workflow tasks. It records the product decisions
made after the original Phase 3 typed-task and transition-graph contracts.

Where this document conflicts with the task-type registry, type-specific task
capabilities, or configurable transition graph in
[`WORKFLOW_CONTRACT.md`](./WORKFLOW_CONTRACT.md), this document supersedes those
sections. The implementation must update all affected architecture, API,
capability, gate, and source documentation so the repository does not retain
contradictory active contracts.

## 2. Non-negotiable product decisions

1. Forms are global operations configuration under **Settings > Forms**.
2. Forms are not owned by a workflow definition and may be reused by multiple
   workflow definitions.
3. Every new human workflow task references exactly one immutable, published
   form version.
4. Task types and type-specific JSON configuration are replaced by the
   assigned form version for new form-backed tasks.
5. A form name such as `Finance Review` is display text only. It confers no
   special domain behaviour, routing, or authorization.
6. Assignment authorizes task work. A user assignment authorizes that user; a
   role assignment authorizes an active member of that role to claim the task.
7. No form-specific or task-name-derived capability may be required.
   `application.finance_review` must not be inferred from a form or task named
   Finance Review.
8. Generic portal capabilities may gate access to task reading, claiming, and
   completion, but server-side assignment scope is the resource authorization
   rule.
9. A workflow advances sequentially by stage sequence. Form answers do not
   select transitions.
10. A task completes when its assigned form is validly submitted.
11. A stage completes when all required tasks in it are complete.
12. When a stage completes, unfinished optional tasks are cancelled, the next
    stage is activated, or the workflow completes if the stage was last.
13. Draft form submissions must be supported from the first release.
14. Completed submissions are immutable.
15. The rendered form uses at most two columns. A field may span one or both
    columns, and the layout collapses to one column on narrow screens.

## 3. Architecture and repository constraints

All work must comply strictly with the repository `AGENTS.md` and
[`PROJECT_STRUCTURE.md`](../architecture/PROJECT_STRUCTURE.md).

- Keep one deployable Next.js application at `apps/platform`.
- Put browser components under the correct operations audience path.
- Put reusable domain-neutral controls in `src/components/ui`.
- Put form-builder operations components under
  `src/components/admin/forms`.
- Put form business behaviour under `src/modules/forms`.
- Put PostgreSQL access only in `src/db/repositories`.
- Use the required browser flow: component -> TanStack Query hook ->
  `ClientFormsService` -> API route -> `ServerFormsService` -> repository.
- Server Components may call a server service directly but never a repository.
- Route handlers validate transport input and delegate; they do not implement
  workflows or query the database.
- Every handwritten non-Payload form uses React Hook Form, a Zod schema, and
  `zodResolver`.
- Client components do not call `fetch` directly.
- Keep every implementation file and function below the mandatory line limits.
- Reuse existing tables, dialogs, controls, action buttons, status badges,
  empty states, and query infrastructure before adding new primitives.
- Multi-record publication, draft saving, task completion, stage advancement,
  audit, and outbox work must use transactions where atomicity is required.

## 4. Domain model

### 4.1 Form definition

A form definition is the stable reusable identity.

| Property | Contract |
| --- | --- |
| `id` | UUID primary key |
| `code` | Unique stable machine code, uppercase snake case |
| `name` | Required display name, for example `Finance Review` |
| `description` | Optional administrator-facing description |
| `active` | Whether the form remains available for administration |
| audit fields | Creator and created/updated timestamps |

### 4.2 Form version

| Property | Contract |
| --- | --- |
| `id` | UUID primary key |
| `formDefinitionId` | Owning stable definition |
| `versionNumber` | Positive and unique within the form |
| `status` | `DRAFT`, `PUBLISHED`, or `RETIRED` |
| `instructions` | Optional text displayed above the runtime form |
| `submitLabel` | Required submit-button text |
| `rowVersion` | Optimistic concurrency token |
| audit fields | Creator, publisher, and lifecycle timestamps |

There may be at most one mutable draft per form definition. Published and
retired versions are immutable. Editing a published version creates the next
draft by copying its version data, fields, and options.

### 4.3 Form field

Each field is an ordinary database row, not a large embedded definition blob.

| Property | Contract |
| --- | --- |
| `id` | UUID primary key |
| `formVersionId` | Owning form version |
| `code` | Stable machine key, unique within the version |
| `label` | Required display label |
| `inputType` | Registry-backed supported renderer |
| `dataType` | Registry-backed stored value type |
| `rowIndex` | Positive layout row |
| `columnIndex` | `1` or `2` |
| `columnSpan` | `1` or `2` |
| `required` | Completion validation flag |
| `placeholder` | Optional short input hint |
| `helpText` | Optional explanatory text |
| `validation` | Bounded declarative JSON; never executable code |

The pair `(formVersionId, rowIndex, columnIndex)` is unique. A two-column span
must begin in column 1 and must not collide with another field in that row.

Initial supported combinations are:

| Input type | Data type |
| --- | --- |
| `TEXT` | `TEXT` |
| `TEXTAREA` | `TEXT` |
| `NUMBER` | `INTEGER` or `DECIMAL` |
| `MONEY` | `MONEY` |
| `DATE` | `DATE` |
| `SELECT` | `TEXT` |
| `RADIO` | `TEXT` |
| `CHECKBOX` | `BOOLEAN` |

Do not support arbitrary HTML, JavaScript, SQL, remote components, nested
forms, repeating groups, or file uploads in this increment.

### 4.4 Field option

`SELECT` and `RADIO` fields have ordered option rows with a stable code and a
display label. Option codes are unique within the field. Other input types may
not have options.

### 4.5 Task assignment

The target task definition contract for new tasks is:

```ts
type WorkflowTaskInput = {
  id?: string;
  code: string;
  name: string;
  sequence: number;
  required: boolean;
  formVersionId: string;
  assignmentRoleId?: string | null;
  assignmentUserId?: string | null;
};
```

Exactly one assignment target and exactly one form version are required. New
task creation must not expose task type or raw configuration JSON.

The task instance pins or snapshots the selected `formVersionId`. A later form
publication never alters a published workflow version or running task.

### 4.6 Form submission

Store one submission record per task instance:

| Property | Contract |
| --- | --- |
| `id` | UUID primary key |
| `taskInstanceId` | Unique owning task instance |
| `formVersionId` | Exact rendered version |
| `status` | `DRAFT` or `COMPLETED` |
| `values` | JSONB object keyed only by stable field codes |
| `rowVersion` | Optimistic concurrency token |
| audit fields | Creator/updater and timestamps |
| `completedAt` | Set once on completion |

Draft saves may contain incomplete values but must reject unknown field codes,
invalid primitive types, and invalid option codes. Completion applies all
required and declarative validation. Completed submissions cannot be updated.

## 5. Form lifecycle rules

- A form begins with version 1 as `DRAFT`.
- Draft versions allow field and option creation, editing, ordering, and
  deletion.
- Publication requires at least one field, valid layout, unique field codes,
  valid type combinations, valid options, and a non-empty submit label.
- Only published form versions may be assigned to new workflow tasks.
- A referenced published version may be retired; retirement hides it from new
  selection but never breaks existing workflow definitions or task instances.
- Referenced forms and versions are never physically deleted.
- Only unreferenced drafts may be deleted.
- Form-definition deletion is allowed only when it has no versions referenced
  by workflow tasks or submissions; otherwise administrators retire it.

## 6. Operations user interface

### 6.1 Navigation and routes

Add an operations sidebar group or parent labelled `Settings` with a `Forms`
child routed under `/admin/settings/forms`. Add only the minimum route hierarchy
needed for the list and editor while preserving the `(operations)` route owner.

### 6.2 Forms list

Use the shared `DataTable`. Required columns are Name, Code, Latest version,
Status, Fields, Used by, Updated, and Actions. Include loading, empty, error,
pagination/search where consistent with existing administration tables, and
capability-aware action visibility.

### 6.3 Form editor

Show stable form details, current version status, version history, lifecycle
actions, and a field-definition table. Required field columns are Label, Code,
Input type, Data type, Position, Span, Required, and Actions.

Add/edit uses the shared draggable dialog and an RHF/Zod form. The dialog owns
type-dependent option editing and validation controls. Delete uses the shared
confirmation dialog. Published/retired versions render read-only.

### 6.4 Workflow task editor

Remove the task-type selector and raw JSON configuration editor for new tasks.
Replace them with a required published-form-version selector. Display both form
name and version. Preserve task name/code, required flag, and role/user
assignment.

### 6.5 Runtime renderer

The task workspace displays task/application context followed by a generic
dynamic form renderer. It must:

- order fields by row then column;
- use a maximum two-column CSS grid and one column on small screens;
- honour one- or two-column span;
- render only allow-listed registry components;
- restore a saved draft;
- provide Save draft and the configured submit button;
- disable mutation after completion and render completed values read-only;
- provide accessible labels, required indicators, help/error associations,
  keyboard operation, and focus management;
- format money and dates consistently with existing UI utilities.

Runtime RHF validation may be built dynamically, but server validation using
the pinned form version is authoritative.

## 7. Sequential workflow runtime

Configurable transition definitions and field-based routing are not used by
the new model. Stages advance only by ascending unique sequence.

When a task is submitted, one transaction must:

1. lock and verify the task, assignment, status, and expected row versions;
2. validate the submitted values against the pinned form version;
3. complete the form submission and task;
4. append the required audit/workflow event;
5. determine whether all required tasks in the active stage are complete;
6. if not, leave the stage active;
7. if yes, complete the stage and cancel its unfinished optional tasks;
8. create or activate the next sequential stage and its task instances; or
9. complete the workflow when no next stage exists;
10. write any required outbox records atomically.

Completion commands remain idempotent; draft saves use optimistic row-version
concurrency. Form values do not choose, skip, or branch stages.

## 8. Authorization

- Form administration requires dedicated server-enforced form read/create,
  update, publish, and retire capabilities following existing workflow
  definition capability patterns.
- Task work authorization is assignment-based.
- A specifically assigned user must match the authenticated actor.
- An unclaimed role task may be claimed only by an active member of that role.
- Save and complete require the actor to be the current assignee.
- Generic `workflow.task.*` capabilities may remain as portal-operation gates.
- Do not inspect form names, field names, task names, or form codes to make an
  authorization decision.
- Do not require `application.finance_review` or any other domain capability
  based on the assigned form.

## 9. Persistence and migration safety

Provide a repeatable Drizzle migration for all schema changes and update schema
exports. Never delete existing workflow definitions, instances, task results,
or audit history merely to simplify migration.

The repository already contains typed tasks and transitions. Use an explicit
compatibility strategy:

- add the new form tables, references, and submission tables first;
- keep legacy columns/tables temporarily when dropping them would destroy
  existing records or make a safe automatic conversion impossible;
- make the new UI and new definitions use form versions exclusively;
- isolate legacy reads behind clearly named compatibility code;
- document remaining legacy columns and a safe removal prerequisite;
- do not claim the legacy model has been removed if compatibility remains.

Seed/reference workflow updates must use reusable published form versions and
must not derive authorization or routing from form names.

## 10. APIs and services

Provide focused route families under `/api/admin/forms` for list/create,
details/update, draft version creation, field/option mutation, publication,
retirement, and safe deletion as required by the UI. Task APIs must expose the
pinned form schema and draft/completed submission without leaking internal-only
data.

Use transport schemas for every request. Server services enforce lifecycle,
authorization, concurrency, and multi-record invariants. Repositories alone
issue SQL. Client services own HTTP and response parsing. TanStack Query hooks
own keys, caching, invalidation, and mutation state.

## 11. Tests

At minimum, add or update tests covering:

- form and field transport/domain schemas;
- valid and invalid input/data-type combinations;
- layout collision and span validation;
- option validation;
- form draft, publication, version cloning, retirement, and deletion rules;
- immutable published versions and completed submissions;
- reusable form versions across workflow definitions;
- rejection of draft/retired versions for new task assignment;
- assignment-scoped read, claim, draft save, and completion;
- absence of form-name/type-specific authorization;
- dynamic value validation on draft save and completion;
- idempotent completion commands and draft row-version conflicts;
- sequential stage advancement and final workflow completion;
- cancellation of unfinished optional tasks;
- API capability and assignment enforcement;
- builder and runtime rendering, including two-column spans and mobile order;
- navigation visibility and accessible dialog/form behaviour.

Update existing typed-task and transition tests to reflect the superseding
contract without weakening unrelated security, audit, or concurrency coverage.

## 12. Documentation and gate evidence

Update at least:

- `docs/architecture/PROJECT_STRUCTURE.md` when adding the forms module/routes;
- `docs/phase-3/WORKFLOW_CONTRACT.md`;
- `docs/phase-3/CAPABILITY_MATRIX.md`;
- `docs/phase-3/DATA_API_CONTRACT.md`;
- the relevant P3 workflow/work-queue gate records.

Record actual command evidence. A gate must not be marked passed without its
required written acceptance.

## 13. Completion checks

Before reporting implementation complete, run all repository-required gates:

```text
npm run check:architecture
npm run check:files
npm run lint
npm run typecheck
npm run test
npm run build
```

Fix failures caused by this change. Report unrelated pre-existing failures
accurately with evidence. Do not skip the production build or architecture
boundary gate.

## 14. Explicitly out of scope

- Conditional visibility or branching based on answers.
- Arbitrary scripts or calculated expressions.
- Nested/repeating form groups.
- File-upload fields.
- Applicant-authored forms.
- Editing completed submissions.
- A general-purpose BPM engine.
- Form-name-derived authorization or behaviour.
