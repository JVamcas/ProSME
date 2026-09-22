# SME Fund — Implementation Plan

## 1. Purpose

This document defines what must be built, the dependency order, and how implementation must be broken into small, testable Codex tasks.

Every Codex task must:
- implement one focused capability;
- be independently testable;
- leave the application working;
- define Goal and Scope;
- include Acceptance Criteria;
- include automated tests where practical;
- include a manual verification scenario where applicable.

---

# Below are the libraries to use to simplify this implementation

| Area | Library / Approach | Purpose |
| --- | --- | --- |
| Dynamic Form Rendering | `@rjsf/core` | Render configurable forms from JSON Schema instead of hard-coding fields in React. |
| Form Validation | `ajv` / AJV 8 | Validate dynamic form schemas and submitted values, including server-side validation. |
| Form Builder UI | Custom builder around RJSF + `dnd-kit` | Build sections/fields visually while keeping our own Form Definition model. |
| Workflow Designer | `@xyflow/react` | Visual Stage/Transition designer using nodes and edges. |
| Conditions / Rules Builder | `react-querybuilder` | Build entry, exit, transition, eligibility and visibility conditions visually. |
| Conditions Evaluation | Own persisted Conditions model + evaluator | Evaluate the same Conditions across Workflow, Eligibility and Form visibility. |
| Standard Admin Forms | `react-hook-form` + `zod` | Create/edit Workflow metadata, Funding Calls, roles, assignments, dialogs, etc. |
| Server State | `@tanstack/react-query` | Fetch/mutate workflows, forms, tasks, applications, assignments and related data. |
| Tables / Lists | `@tanstack/react-table` | Applications, Work Queue, users, reviewers, workflow versions, audit history. |
| Drag / Drop | `dnd-kit` | Reorder form sections/fields, workflow items, checklist items and similar configurable lists. |
| Rich Text | `@tiptap/react` | Descriptions, instructions, help text, Funding Call content and other formatted content. |

---

# 2. High-Level Architecture

The platform is built from these configurable capabilities:

```text
Workflow Engine
Generic Form Engine
Generic Conditions Engine
Eligibility Engine
Funding Call
Funding Application Runtime
```

A Funding Call brings the main design-time components together:

```text
Funding Call
├── Application Form Version
├── Eligibility Ruleset Version
└── Workflow Template Version
```

An applicant then submits an Application against that Funding Call:

```text
Funding Call
    ↓
Application
    ↓
Workflow Instance
    ↓
Stage Instances
    ↓
Workflow Tasks
```

---

# 3. Design-Time vs Runtime

## Design-Time

Administrators configure:

```text
Workflow Template
Workflow Template Version
Workflow Stages
Workflow Task Definitions
Actions
Transitions
Conditions
Form Definitions
Form Versions
Form Bindings
Eligibility Rulesets
Funding Calls
```

## Runtime

Actual processing creates:

```text
Application
Workflow Instance
Stage Instance
Workflow Task
Form Response
Checklist Response
Document Version
Decision
Audit History
```

Design-time defines behaviour. Runtime records actual work.

---

# 4. Core Dependency Chain

```text
Workflow Definition Foundation
        ↓
Generic Form Engine
        ↓
Generic Conditions Engine
        ↓
Complete Workflow Configuration
        ↓
Eligibility Engine
        ↓
Funding Call
        ↓
Funding Call Application Form
        ↓
Workflow Runtime
        ↓
Application Submission
        ↓
Advanced Workflow Runtime
        ↓
Standard Client Seed
```

---

# 5. High-Level Build Order

## Step 1 — Workflow Definition Foundation

We must be able to:
- create a Workflow Template;
- version it;
- add Stages;
- add Task Definitions to a Stage;
- assign responsibility/roles to Tasks;
- add Actions;
- add Transitions;
- clone/version Workflow Templates.

No runtime execution yet.

## Step 2 — Generic Form Engine

Build one reusable Form Engine for:
- Funding Call Application Forms;
- Technical Review Forms;
- Financial Review Forms;
- Due Diligence Forms;
- Committee Forms;
- post-award Forms;
- other Workflow Task Forms.

We must be able to:
- create Form Definitions;
- version/publish Forms;
- add Sections;
- add Fields;
- configure validation;
- preview/render;
- reuse Form Versions.

## Step 3 — Generic Conditions Engine

We must be able to:
- create a Condition;
- choose field/operator/value;
- create AND/OR groups;
- create nested groups;
- save/reload;
- validate;
- preview;
- evaluate.

The same engine is reused by:
- Form visibility;
- Stage Entry Conditions;
- Stage Exit Conditions;
- Transition Conditions;
- Eligibility Rules.

## Step 4 — Complete Workflow Configuration

Return to Workflow configuration once Forms and Conditions exist.

For each Stage configure:
- Task Definitions;
- Form bindings;
- context bindings;
- Actions;
- Transitions;
- Entry Conditions;
- Exit Conditions;
- Transition Conditions;
- Checklists;
- Document Requirements;
- Scoring;
- Comments/Recommendations;
- Permissions;
- Public Status Mapping.

Task Form model:

```text
Technical Assessment Stage
└── Technical Reviewer Task
    ├── Form: Technical Review Form v1
    └── Context
        ├── application.project_title
        ├── application.requested_amount
        └── application.entity_type
```

The Form captures assignee input. The Workflow binding supplies context.

## Step 5 — Eligibility Engine

Build Eligibility on top of the Generic Conditions Engine.

Support:
- Ruleset versioning;
- Hard Fail;
- Soft Fail;
- Warning;
- reason codes;
- applicant messages;
- self-check;
- authoritative screening.

## Step 6 — Funding Call

Funding Call binds:

```text
Funding Call
├── Published Application Form Version
├── Published Eligibility Ruleset Version
└── Published Workflow Template Version
```

Funding Calls live in the SME Fund Admin Portal, not Payload CMS.

## Step 7 — Funding Call Application Form

Use the Generic Form Engine to create the applicant-facing Funding Application Form.

Do not hard-code application fields directly into React pages.

## Step 8 — Workflow Runtime

Implement:

```text
WorkflowInstance
└── StageInstance
    └── WorkflowTask
```

Support:
- Stage activation;
- Task creation;
- Task assignment;
- Task completion;
- Stage completion;
- Action execution;
- Transition execution;
- audit history.

## Step 9 — Application Submission

```text
Applicant
    ↓
Funding Call
    ↓
Application Form
    ↓
Draft / Autosave
    ↓
Submit
    ↓
Validation
    ↓
Immutable Submission Snapshot
    ↓
Eligibility Evaluation
    ↓
Workflow Instance
    ↓
Initial Stage
    ↓
Workflow Tasks
```

## Step 10 — Advanced Workflow Runtime

After sequential runtime works:
- multiple reviewers;
- completion thresholds;
- quorum;
- COI;
- reassignment;
- delegation by configured authority/value bands;
- parallel branches;
- joins;
- RFI;
- SLA;
- repeatable stages;
- automatic transitions.

## Step 11 — Standard Client Seed

The client specification describes 14 end-to-end business stages, but only
12 are Application Workflow Stages. Call Setup and Publication belongs to the
Funding Call lifecycle, and Application Submission belongs to the applicant
Application lifecycle. Submission creates the Workflow Instance directly at
Administrative and Eligibility Screening.

Seed the client configuration using the same engines and builders:
- roles;
- 12 Application Workflow Stages, from Administrative and Eligibility
  Screening through Evaluation and Close-out;
- Funding Call setup/publication lifecycle configuration;
- applicant Application submission lifecycle configuration;
- Forms;
- Task Definitions;
- bindings;
- context;
- checklists;
- documents;
- scoring;
- Actions;
- Transitions;
- Conditions;
- COI;
- public statuses;
- notification hooks;
- reason codes.

No hard-coded runtime logic for the seeded workflow.

---

# 6. Detailed Implementation Phases

# Phase 1 — Workflow Definitions & Governance

## 1.1 Workflow Template Storage

### Goal

Create reusable, versioned Workflow Templates.

### Scope

Implement:
- `WorkflowTemplate`;
- `WorkflowTemplateVersion`;
- version numbering;
- Draft / PendingApproval / Approved / Published / Retired;
- repository/application service;
- migration;
- lifecycle audit;
- Published-version immutability.

**Rules**

- Creating a Template creates Version 1 as Draft.
- Draft is editable.
- PendingApproval is not freely editable.
- Approval and publication are separate.
- Published is immutable.
- Retired remains queryable.
- Future Funding Calls and Workflow Instances bind by exact `WorkflowTemplateVersionId`.

**Out of Scope**

- Stages;
- Task Definitions;
- Actions;
- Transitions;
- Conditions;
- runtime execution.

### Acceptance Criteria

1. Template can be created.
2. Version 1 starts as Draft.
3. Version numbers are unique per Template.
4. Draft can be edited.
5. Draft can be submitted for approval.
6. PendingApproval can return to Draft with reason.
7. PendingApproval can be approved.
8. Approved can be published.
9. Published cannot be modified.
10. Published can be retired.
11. Retired remains retrievable.
12. Lifecycle changes are audited.

### Done When

Workflow Templates have a complete, auditable lifecycle and Published versions are immutable.
## 1.2 Workflow Template Admin List

### Goal

Provide `/admin/workflows` with: - list; - create; - current version; - status; - navigation to details.

### Scope

Provide `/admin/workflows` with:
- list;
- create;
- current version;
- status;
- navigation to details.

### Acceptance Criteria

1. Workflow Templates can be created and inspected from the Admin Portal.

### Done When

Workflow Templates can be created and inspected from the Admin Portal.
## 1.3 Workflow Stage Definitions

### Goal

Support: - stable key; - name; - description; - enabled; - optional; - display order; - public status mapping; - repeatable flag; - COI-gated flag where applicable.

### Scope

Support:
- stable key;
- name;
- description;
- enabled;
- optional;
- display order;
- public status mapping;
- repeatable flag;
- COI-gated flag where applicable.

### Acceptance Criteria

1. Draft Workflows can contain configurable Stages without hard-coded Stage classes.

### Done When

Draft Workflows can contain configurable Stages without hard-coded Stage classes.
## 1.4 Workflow Task Definitions

### Goal

Support: - key; - name; - description; - role; - named-user override where configured; - assignment mode; - reviewer count; - required completion count; - quorum; - COI requirement; - display order.

### Scope

Support:
- key;
- name;
- description;
- role;
- named-user override where configured;
- assignment mode;
- reviewer count;
- required completion count;
- quorum;
- COI requirement;
- display order.

A Stage may contain multiple Task Definitions.

### Acceptance Criteria

1. A Stage can define the units of work that later create runtime Workflow Tasks.

### Done When

A Stage can define the units of work that later create runtime Workflow Tasks.
## 1.5 Workflow Actions

### Goal

Standard Action types: - Approve / Advance; - Reject; - Request Information; - Return; - Refer; - Escalate; - Put on Hold; - Withdraw; - Defer.

### Scope

Standard Action types:
- Approve / Advance;
- Reject;
- Request Information;
- Return;
- Refer;
- Escalate;
- Put on Hold;
- Withdraw;
- Defer.

Common properties:
- stable key;
- label;
- action type;
- enabled;
- reason-code requirement;
- display order.

### Acceptance Criteria

1. Actions can be attached to Draft Stages as configuration records.

### Done When

Actions can be attached to Draft Stages as configuration records.
## 1.6 Action-Specific Configuration

### Goal

Configure: - Approve: target Stage(s); - Reject: reason codes, terminal outcome; - RFI: deadline, editable fields, reminders, expiry; - Return: target Stage, retain/clear data, mandatory reason; - Refer: target Stage, return-to-referrer; - Escalate: target role/user, trigger; - Hold: reason, review date; - Withdraw: allowed Stages, resubmission rule; - Defer: target date/call.

### Scope

Configure:
- Approve: target Stage(s);
- Reject: reason codes, terminal outcome;
- RFI: deadline, editable fields, reminders, expiry;
- Return: target Stage, retain/clear data, mandatory reason;
- Refer: target Stage, return-to-referrer;
- Escalate: target role/user, trigger;
- Hold: reason, review date;
- Withdraw: allowed Stages, resubmission rule;
- Defer: target date/call.

### Acceptance Criteria

1. Each Action type has a persisted configuration contract.

### Done When

Each Action type has a persisted configuration contract.

## 1.7 Action Presentation in Task UI

### Goal

Make the relationship between Workflow Tasks, Forms, and Workflow Actions explicit.

### Scope

For an active Workflow Task:

- the bound Form captures the user's work/data;
- configured Workflow Actions are presented as action buttons where applicable;
- only Actions valid for the current Stage, Task, actor, permissions, and Conditions are shown/enabled;
- executing an Action calls the Workflow runtime;
- the backend re-validates the Action before execution.

Example:

```text
Technical Review Task

[ Technical Review Form ]

Technical Score:      [    ]
Recommended Amount:   [    ]
Comments:             [    ]

[ Save Draft ]

Workflow Actions:
[ Recommend ]
[ Recommend with Conditions ]
[ Do Not Recommend ]
[ Request Clarification ]
[ Escalate ]
```

--

## 1.8 Workflow Transitions

### Goal

Define how a Workflow moves from one Stage to another when a configured Workflow Action is executed.

### Scope

A Workflow Transition links:

- source Stage;
- Workflow Action;
- target Stage or Stage(s);
- priority where multiple transitions may apply.

Example:

```text
Administrative Screening
    |
    | Action: Approve / Advance
    v
Technical Assessment
```

A Stage may have multiple Actions leading to different transitions:

```text
Administrative Screening
├── Eligible
│   └── → Technical Assessment / Financial Review
│
├── Reject
│   └── → Terminal Rejected Outcome
│
└── Request Information
    └── → handled by RFI behaviour
```

Transitions must reference configured Stage and Action identifiers.

Transitions must not depend on Stage display order.

Transition Conditions are added later once the Generic Conditions Engine exists.

Runtime execution of the Transition is also implemented later.

### Acceptance Criteria

1. A Transition can reference a source Stage.
2. A Transition can reference a configured Workflow Action.
3. A Transition can reference one or more target Stages.
4. A Stage may have multiple Actions with different transitions.
5. Transition configuration does not depend on Stage display order.
6. Invalid Stage or Action references are rejected.
7. Published Workflow transitions are immutable.

### Done When

A Draft Workflow can define how configured Actions connect Stages into a directed workflow graph.

## 1.8 Structural Workflow Validation

### Goal

Validate: - duplicate Stage keys; - invalid source/target; - invalid Action references; - unreachable Stages; - missing responsibility; - terminal Stage without terminal decision; - invalid repeatable references; - invalid fork/join references.

### Scope

Validate:
- duplicate Stage keys;
- invalid source/target;
- invalid Action references;
- unreachable Stages;
- missing responsibility;
- terminal Stage without terminal decision;
- invalid repeatable references;
- invalid fork/join references.

### Acceptance Criteria

1. Structurally invalid Workflows cannot be approved/published.

### Done When

Structurally invalid Workflows cannot be approved/published.
## 1.9 Workflow Cloning

### Goal

Clone: - Stages; - Task Definitions; - responsibility; - Actions; - Action config; - Transitions; - public status mappings.

### Scope

Clone:
- Stages;
- Task Definitions;
- responsibility;
- Actions;
- Action config;
- Transitions;
- public status mappings.

Later phases extend cloning with Conditions/Form bindings.

### Acceptance Criteria

1. Administrators can clone and adapt a Workflow.

### Done When

Administrators can clone and adapt a Workflow.
## 1.10 Approval to Publish

### Goal

Support: - submit Draft; - approve; - return for amendment; - publish only Approved versions; - audit actor/time/reason.

### Scope

Support:
- submit Draft;
- approve;
- return for amendment;
- publish only Approved versions;
- audit actor/time/reason.

### Acceptance Criteria

1. Workflow governance is auditable.

---.

### Done When

Workflow governance is auditable.

---
# Phase 2 — Generic Form Engine

## 2.1 Form Definitions & Versioning

### Goal

Support: - `FormDefinition`; - `FormVersion`; - Draft / Published / Retired; - immutable Published versions.

### Scope

Support:
- `FormDefinition`;
- `FormVersion`;
- Draft / Published / Retired;
- immutable Published versions.

### Acceptance Criteria

1. Generic Forms are independently versioned and publishable.

### Done When

Generic Forms are independently versioned and publishable.
## 2.2 Form Sections

### Goal

Support: - key; - title; - description; - order.

### Scope

Support:
- key;
- title;
- description;
- order.

### Acceptance Criteria

1. Forms can contain ordered Sections.

### Done When

Forms can contain ordered Sections.
## 2.3 Basic Field Types

### Goal

Start with: - Text; - Textarea; - Number; - Date; - Yes/No; - Select.

### Scope

Start with:
- Text;
- Textarea;
- Number;
- Date;
- Yes/No;
- Select.

Field properties:
- stable key;
- label;
- type;
- required;
- help text;
- order.

### Acceptance Criteria

1. A basic Generic Form can be defined.

### Done When

A basic Generic Form can be defined.
## 2.4 Form Parser / Renderer

### Goal

Render saved Form Versions without hard-coded JSX.

### Scope

Render saved Form Versions without hard-coded JSX.

### Acceptance Criteria

1. Form Definition -> Renderer works end-to-end.

### Done When

Form Definition -> Renderer works end-to-end.
## 2.5 Form Validation

### Goal

Initial: - required; - minimum; - maximum; - minLength; - maxLength.

### Scope

Initial:
- required;
- minimum;
- maximum;
- minLength;
- maxLength.

Validate client-side and server-side.

### Acceptance Criteria

1. Dynamic validation works.

### Done When

Dynamic validation works.
## 2.6 Additional Field Types

### Goal

Add: - Currency; - Single Select; - Multi Select; - Percentage; - Document.

### Scope

Add:
- Currency;
- Single Select;
- Multi Select;
- Percentage;
- Document.

### Acceptance Criteria

1. Required configurable field types are supported.

### Done When

Required configurable field types are supported.
## 2.7 Form Runtime Context Contract

### Goal

Forms own captured fields.

### Scope

Forms own captured fields.

Bindings own:
- where Form is used;
- who uses it;
- context exposed;
- context references allowed in visibility/validation.

Default:
- context is read-only;
- context is not duplicated into Form response.

### Acceptance Criteria

1. One published Form Version can be reused in multiple contexts.

### Done When

One published Form Version can be reused in multiple contexts.
## 2.8 Draft Form Response Persistence

### Goal

Support: - partial values; - reload; - autosave; - exact Form Version.

### Scope

Support:
- partial values;
- reload;
- autosave;
- exact Form Version.

### Acceptance Criteria

1. Forms support resumable drafts.

### Done When

Forms support resumable drafts.
## 2.9 Form Completeness

### Goal

Support: - section completeness; - overall completeness; - required-field calculation.

### Scope

Support:
- section completeness;
- overall completeness;
- required-field calculation.

### Acceptance Criteria

1. Applicants can see whether a Form is complete.

### Done When

Applicants can see whether a Form is complete.
## 2.10 Submitted Form Snapshot

### Goal

Persist: - exact FormVersionId; - submitted values; - immutable snapshot.

### Scope

Persist:
- exact FormVersionId;
- submitted values;
- immutable snapshot.

### Acceptance Criteria

1. Submitted Forms remain reproducible as lodged.

---.

### Done When

Submitted Forms remain reproducible as lodged.

---
# Phase 3 — Generic Conditions Engine

## 3.1 Condition Domain Model

### Goal

Create: - `Condition`; - `ConditionGroup`; - `Operand`; - `Operator`.

### Scope

Create:
- `Condition`;
- `ConditionGroup`;
- `Operand`;
- `Operator`.

Initial operands:
- field;
- constant.

### Acceptance Criteria

1. Create: - `Condition`; - `ConditionGroup`; - `Operand`; - `Operator`.

### Done When

Create: - `Condition`; - `ConditionGroup`; - `Operand`; - `Operator`.
## 3.2 Persistence & Serialization

### Goal

Conditions/groups must save and reload without structural loss.

### Scope

Conditions/groups must save and reload without structural loss.

### Acceptance Criteria

1. Conditions/groups must save and reload without structural loss.

### Done When

Conditions/groups must save and reload without structural loss.
## 3.3 Field & Constant Operands

### Goal

Resolve fields by stable key and constants by configured value.

### Scope

Resolve fields by stable key and constants by configured value.

### Acceptance Criteria

1. Resolve fields by stable key and constants by configured value.

### Done When

Resolve fields by stable key and constants by configured value.
## 3.4 Basic Operators

### Goal

- equals; - not equals; - greater than; - less than; - greater/less than or equal.

### Scope

- equals;
- not equals;
- greater than;
- less than;
- greater/less than or equal.

### Acceptance Criteria

1. - equals; - not equals; - greater than; - less than; - greater/less than or equal.

### Done When

- equals; - not equals; - greater than; - less than; - greater/less than or equal.
## 3.5 Condition Evaluator

### Goal

Return: - pass/fail; - resolved operands; - operator; - controlled error.

### Scope

Return:
- pass/fail;
- resolved operands;
- operator;
- controlled error.

### Acceptance Criteria

1. Return: - pass/fail; - resolved operands; - operator; - controlled error.

### Done When

Return: - pass/fail; - resolved operands; - operator; - controlled error.
## 3.6 AND Groups

### Goal

All-child evaluation.

### Scope

All-child evaluation.

### Acceptance Criteria

1. All-child evaluation.

### Done When

All-child evaluation.
## 3.7 OR Groups

### Goal

Any-child evaluation.

### Scope

Any-child evaluation.

### Acceptance Criteria

1. Any-child evaluation.

### Done When

Any-child evaluation.
## 3.8 Nested Groups

### Goal

Nested AND/OR.

### Scope

Nested AND/OR.

### Acceptance Criteria

1. Nested AND/OR.

### Done When

Nested AND/OR.
## 3.9 Additional Operators

### Goal

- in; - not in; - between; - before; - after; - is empty; - is not empty; - within last N months.

### Scope

- in;
- not in;
- between;
- before;
- after;
- is empty;
- is not empty;
- within last N months.

### Acceptance Criteria

1. - in; - not in; - between; - before; - after; - is empty; - is not empty; - within last N months.

### Done When

- in; - not in; - between; - before; - after; - is empty; - is not empty; - within last N months.
## 3.10 Computed Operands

### Goal

Example: `requested_amount / annual_turnover` No arbitrary JavaScript.

### Scope

Example:
`requested_amount / annual_turnover`

No arbitrary JavaScript.

### Acceptance Criteria

1. Example: `requested_amount / annual_turnover` No arbitrary JavaScript.

### Done When

Example: `requested_amount / annual_turnover` No arbitrary JavaScript.
## 3.11 Generic Condition Builder UI

### Goal

Support: - field; - operator; - value; - AND/OR; - groups; - nested groups; - edit/reload.

### Scope

Support:
- field;
- operator;
- value;
- AND/OR;
- groups;
- nested groups;
- edit/reload.

### Acceptance Criteria

1. Support: - field; - operator; - value; - AND/OR; - groups; - nested groups; - edit/reload.

### Done When

Support: - field; - operator; - value; - AND/OR; - groups; - nested groups; - edit/reload.
## 3.12 Validation & Human-Readable Preview

### Goal

Validate: - field reference; - operator compatibility; - value; - group structure.

### Scope

Validate:
- field reference;
- operator compatibility;
- value;
- group structure.

### Acceptance Criteria

1. Validate: - field reference; - operator compatibility; - value; - group structure.

### Done When

Validate: - field reference; - operator compatibility; - value; - group structure.
## 3.13 Workflow Data Resolver

### Goal

Resolve stable paths such as: ```text application.requested_amount fundingCall.maximum_grant_amount stage.financial_review.recommended_amount stage.due_diligence.risk_rating ``` Never resolve by Stage position.

### Scope

Resolve stable paths such as:

```text
application.requested_amount
fundingCall.maximum_grant_amount
stage.financial_review.recommended_amount
stage.due_diligence.risk_rating
```

Never resolve by Stage position.

### Acceptance Criteria

1. Resolve stable paths such as: ```text application.requested_amount fundingCall.maximum_grant_amount stage.financial_review.recommended_amount stage.due_diligence.risk_rating ``` Never resolve by Stage position.

### Done When

Resolve stable paths such as: ```text application.requested_amount fundingCall.maximum_grant_amount stage.financial_review.recommended_amount stage.due_diligence.risk_rating ``` Never resolve by Stage position.
## 3.14 Conditional Form Visibility Integration

### Goal

Use the Generic Conditions Engine for Form visibility.

### Scope

Use the Generic Conditions Engine for Form visibility.

### Acceptance Criteria

1. The Conditions Engine is reusable by Forms, Workflow and Eligibility.

---.

### Done When

The Conditions Engine is reusable by Forms, Workflow and Eligibility.

---
# Phase 4 — Complete Workflow Configuration

## 4.1 Stage Entry Conditions

### Goal

Attach Generic Conditions to Stage activation.

### Scope

Attach Generic Conditions to Stage activation.

### Acceptance Criteria

1. Attach Generic Conditions to Stage activation.

### Done When

Attach Generic Conditions to Stage activation.
## 4.2 Stage Exit Conditions

### Goal

Examples: - required fields complete; - documents verified; - reviewer threshold; - quorum.

### Scope

Examples:
- required fields complete;
- documents verified;
- reviewer threshold;
- quorum.

### Acceptance Criteria

1. Examples: - required fields complete; - documents verified; - reviewer threshold; - quorum.

### Done When

Examples: - required fields complete; - documents verified; - reviewer threshold; - quorum.
## 4.3 Transition Conditions

### Goal

Attach Generic Conditions to Action/Transition availability.

### Scope

Attach Generic Conditions to Action/Transition availability.

### Acceptance Criteria

1. Attach Generic Conditions to Action/Transition availability.

### Done When

Attach Generic Conditions to Action/Transition availability.
## 4.4 Condition-Aware Workflow Validation

### Goal

Block publication for invalid Conditions.

### Scope

Block publication for invalid Conditions.

### Acceptance Criteria

1. Block publication for invalid Conditions.

### Done When

Block publication for invalid Conditions.
## 4.5 Clone Workflow Conditions

### Goal

Cloned Workflows preserve Conditions.

### Scope

Cloned Workflows preserve Conditions.

### Acceptance Criteria

1. Cloned Workflows preserve Conditions.

### Done When

Cloned Workflows preserve Conditions.
## 4.6 Stage / Task Form Binding

### Goal

Model: ```text Stage Definition ↓ Task Definition ↓ Form Binding ↓ Published Form Version ``` Store exact FormVersionId.

### Scope

Model:

```text
Stage Definition
    ↓
Task Definition
    ↓
Form Binding
    ↓
Published Form Version
```

Store exact FormVersionId.

### Acceptance Criteria

1. Model: ```text Stage Definition ↓ Task Definition ↓ Form Binding ↓ Published Form Version ``` Store exact FormVersionId.

### Done When

Model: ```text Stage Definition ↓ Task Definition ↓ Form Binding ↓ Published Form Version ``` Store exact FormVersionId.
## 4.7 Runtime Context Binding

### Goal

Expose selected: - application; - Funding Call; - workflow; - Stage; - Task; - prior Stage values.

### Scope

Expose selected:
- application;
- Funding Call;
- workflow;
- Stage;
- Task;
- prior Stage values.

Context is read-only by default.

### Acceptance Criteria

1. Expose selected: - application; - Funding Call; - workflow; - Stage; - Task; - prior Stage values.

### Done When

Expose selected: - application; - Funding Call; - workflow; - Stage; - Task; - prior Stage values.
## 4.8 Stage Checklists

### Goal

Configure: - key; - text; - mandatory; - response type; - evidence requirement; - notes; - order.

### Scope

Configure:
- key;
- text;
- mandatory;
- response type;
- evidence requirement;
- notes;
- order.

### Acceptance Criteria

1. Configure: - key; - text; - mandatory; - response type; - evidence requirement; - notes; - order.

### Done When

Configure: - key; - text; - mandatory; - response type; - evidence requirement; - notes; - order.
## 4.9 Stage Document Requirements

### Goal

Configure: - name; - mandatory; - accepted file types; - max size; - expiry; - uploader/verifier; - template.

### Scope

Configure:
- name;
- mandatory;
- accepted file types;
- max size;
- expiry;
- uploader/verifier;
- template.

### Acceptance Criteria

1. Configure: - name; - mandatory; - accepted file types; - max size; - expiry; - uploader/verifier; - template.

### Done When

Configure: - name; - mandatory; - accepted file types; - max size; - expiry; - uploader/verifier; - template.

Document requirements are design-time configuration. Runtime document
replacement, version history, verification status per version, expiry and
re-verification are implemented as cross-cutting capabilities in Phase 16.
## 4.10 Stage Scoring

### Goal

Configure: - criterion; - description; - weight; - scale; - threshold; - mandatory comment; - aggregation.

### Scope

Configure:
- criterion;
- description;
- weight;
- scale;
- threshold;
- mandatory comment;
- aggregation.

### Acceptance Criteria

1. Configure: - criterion; - description; - weight; - scale; - threshold; - mandatory comment; - aggregation.

### Done When

Configure: - criterion; - description; - weight; - scale; - threshold; - mandatory comment; - aggregation.
## 4.11 Comments & Recommendations

### Goal

Configure: - key; - label; - help; - mandatory; - applicant-visible/internal-only; - order.

### Scope

Configure:
- key;
- label;
- help;
- mandatory;
- applicant-visible/internal-only;
- order.

### Acceptance Criteria

1. Configure: - key; - label; - help; - mandatory; - applicant-visible/internal-only; - order.

### Done When

Configure: - key; - label; - help; - mandatory; - applicant-visible/internal-only; - order.
## 4.12 Element-Level Permissions

### Goal

Support: - View; - Edit; - Decide; - applicant-visible/internal-only.

### Scope

Support:
- View;
- Edit;
- Decide;
- applicant-visible/internal-only.

### Acceptance Criteria

1. A Workflow Version can be fully configured using reusable Forms and Conditions.

---.

### Done When

A Workflow Version can be fully configured using reusable Forms and Conditions.

---
# Phase 5 — Eligibility Engine

Eligibility is a specialised consumer of the Generic Conditions Engine. It must not implement its own operators, grouping, or field-resolution logic.

## 5.1 Eligibility Ruleset Storage

### Goal

Create reusable, versioned Eligibility Rulesets.

### Scope

- `EligibilityRuleSet`;
- `EligibilityRuleSetVersion`;
- Draft / Published / Retired;
- exact version references;
- Published-version immutability.

### Acceptance Criteria

1. Ruleset can be created.
2. Version 1 starts as Draft.
3. Draft version can be edited.
4. Published version cannot be modified.
5. Retired version remains queryable.
6. Exact Ruleset Version can later be bound to a Funding Call.

### Done When

Eligibility Rulesets are independently versioned and immutable once Published.
## 5.2 Eligibility Rule

### Goal

Wrap a Generic Condition with eligibility-specific outcome behaviour.

### Scope

Each rule stores:
- Condition / Condition Group reference;
- failure type:
  - Hard Fail;
  - Soft Fail;
  - Warning;
- reason code;
- applicant-facing message;
- execution mode:
  - Self Check;
  - Screening;
  - Both.

### Acceptance Criteria

1. Eligibility Rule reuses the Generic Conditions model.
2. Rule can be configured for Self Check, Screening, or Both.
3. Failure type, reason code and applicant message persist.
4. No eligibility-specific duplicate condition engine is introduced.

### Done When

A Generic Condition can be given eligibility-specific outcome behaviour.
## 5.3 Eligibility Evaluator

### Goal

Evaluate a published Eligibility Ruleset against supplied data.

### Scope

**Result**

Return:
- overall eligible/not eligible;
- hard failures;
- soft failures;
- warnings;
- reason codes;
- applicant-facing messages where appropriate.

**Rules**

- Hard Fail makes the result ineligible.
- Soft Fail is flagged for manual screening decision.
- Warning records the issue but does not fail eligibility.
- Evaluation uses the shared Conditions Engine and Data Resolver.

### Acceptance Criteria

1. Hard Fail produces an ineligible result.
2. Soft Fail is returned separately.
3. Warning does not make the result ineligible.
4. Multiple rules can be evaluated in one Ruleset.
5. Evaluation result identifies the exact Ruleset Version used.

### Done When

Eligibility can be evaluated deterministically using the shared Conditions Engine.
## 5.4 Eligibility Builder

### Goal

Allow administrators to create Eligibility Rules without editing JSON.

### Scope

Reuse the Generic Condition Builder and add:
- failure type;
- reason code;
- applicant-facing message;
- execution mode.

The Builder's field catalogue is binding-driven:
- `fundingCall.*` fields come from a Draft Funding Call bound to the Ruleset Version;
- `application.*` fields come from that Funding Call's bound Form Version using
  the Form fields' stable keys;
- when a Ruleset Version is bound to multiple Funding Calls, only compatible
  application fields common to every bound Form Version are configurable.

### Acceptance Criteria

1. Admin can create/edit Rules in a Draft Ruleset.
2. Generic Condition Builder is reused.
3. Rules can be grouped through the shared Conditions model.
4. Published Rulesets cannot be edited.
5. A Draft Ruleset can be bound to a Draft Funding Call for configuration and
   non-authoritative testing.
6. Contextual field references are validated against the bound Funding Call and
   Form Versions.

### Done When

Eligibility can be configured visually without introducing a second rule builder.
## 5.5 Eligibility Test Screen

### Goal

Allow a Ruleset to be tested before it is used by a Funding Call.

### Scope

- select Draft/Published Ruleset Version;
- enter sample values;
- run evaluation;
- display hard failures, soft failures and warnings.

### Acceptance Criteria

1. Sample input can be evaluated without creating an Application.
2. Results show which rules passed/failed.
3. Applicant-facing messages can be previewed.
4. Test execution does not create an authoritative eligibility outcome.

### Done When

An administrator can verify a Ruleset before binding it to a Funding Call.
## 5.6 Authoritative Eligibility Outcome

### Goal

Persist the authoritative Screening evaluation against an Application.

### Scope

Persist:
- ApplicationId;
- EligibilityRuleSetVersionId;
- evaluated values/context reference;
- evaluation timestamp;
- hard failures;
- soft failures;
- warnings;
- final screening outcome where determined.

**Rules**

- Authoritative Screening uses the same Ruleset Version bound to the Funding Call.
- The evaluation result must be auditable.
- Workflow may consume the outcome through stable runtime context.

### Acceptance Criteria

1. Exact Ruleset Version is persisted.
2. Evaluation timestamp is stored.
3. Rule outcomes are retrievable.
4. Later Ruleset changes do not change the stored evaluation.
5. Workflow can resolve authoritative eligibility result through the Data Resolver.

### Done When

An Application can retain a complete, version-bound, auditable eligibility evaluation.

---
# Phase 6 — Funding Call

The Funding Call is the business configuration that ties together the Application Form, Eligibility Ruleset, and Workflow Template.

## 6.1 Funding Call Entity

### Goal

Move Funding Calls into the SME Fund business domain.

### Scope

Store at minimum:
- reference;
- title;
- description;
- funding instrument / thematic area where configured;
- total budget envelope;
- minimum grant amount;
- maximum grant amount;
- opening date/time;
- closing date/time;
- status;
- public contact where configured.

### Acceptance Criteria

1. Admin can create a Draft Funding Call.
2. Draft call can be edited.
3. Funding Call persists independently of Payload CMS.
4. Opening/closing dates use server-authoritative time.
5. Funding Call is queryable by internal identifier and public identifier/slug.

### Done When

Funding Calls exist as first-class SME Fund business entities.
## 6.2 Create Funding Call Application Form

### Goal

Create the applicant-facing Funding Application Form using the Generic Form Engine.

### Scope

Create/publish a reusable Form Version containing configured applicant inputs such as:
- entity details;
- registration/tax information;
- project title and abstract;
- objectives;
- duration;
- requested amount;
- budget breakdown;
- co-funding;
- team/CV inputs where required;
- indicators, baselines and targets;
- declarations;
- consent.

**Rules**

- stable field keys are required;
- the Form is not hard-coded into applicant React pages;
- the Form remains independently versioned.

### Acceptance Criteria

1. Admin can build the Form using the Generic Form Builder.
2. Form can be previewed.
3. Form can be Published.
4. Published Form Version is immutable.
5. The Form can be reused by more than one Funding Call where appropriate.

### Done When

A real Funding Application Form exists as a published Generic Form Version.
## 6.3 Bind Application Form Version

### Goal

Bind the Funding Call to the exact published Form Version applicants must complete.

### Scope

- Implement the Bind Application Form Version capability described by this phase.
- A Draft Funding Call may bind a Draft or Published Form Version for
  configuration and testing.
- Publishing the Funding Call requires the bound Form Version to be Published.

### Acceptance Criteria

1. Draft or Published Form Versions can be selected for a Draft Funding Call;
   only Published Form Versions can be used by a published/live call.
2. `FormVersionId` persists on the Funding Call.
3. Applicant application creation resolves that exact version.
4. A newer Form Version does not silently change existing Applications.

### Done When

Funding Call -> Application Form binding is stable and version-specific.
## 6.4 Bind Eligibility Ruleset Version

### Goal

Bind the Funding Call to the exact published Eligibility Ruleset Version used for both Self Check and authoritative Screening.

### Scope

- Implement the Bind Eligibility Ruleset Version capability described by this phase.
- A Draft Funding Call may bind a Draft or Published Eligibility Ruleset Version
  for configuration and non-authoritative testing.
- Publishing the Funding Call requires the bound Eligibility Ruleset Version to
  be Published.

### Acceptance Criteria

1. Draft or Published Ruleset Versions can be selected for a Draft Funding Call;
   only Published Ruleset Versions can be used by a published/live call.
2. `EligibilityRuleSetVersionId` persists.
3. Public Self Check resolves the bound version.
4. Authoritative Screening resolves the same bound version.
5. Existing submitted Applications retain their original Ruleset Version reference.

### Done When

Funding Call -> Eligibility binding works consistently for Self Check and Screening.
## 6.5 Bind Workflow Template Version

### Goal

Bind the Funding Call to the exact published Workflow Template Version used for submitted Applications.

### Scope

- Implement the Bind Workflow Template Version capability described by this phase.

### Acceptance Criteria

1. Only Published Workflow Template Versions can be selected.
2. `WorkflowTemplateVersionId` persists.
3. Application submission resolves the bound version.
4. WorkflowInstance stores the exact version.
5. Publishing a newer Workflow Version does not alter existing Workflow Instances.

### Done When

Funding Call -> Workflow binding is exact and immutable for runtime Applications.
## 6.6 Public Funding Call Read Model

### Goal

Expose a safe public Funding Call contract to the public website.

### Scope

**Public Data**

Include only public-facing fields such as:
- reference;
- title;
- description;
- funding amounts;
- opening/closing dates;
- public status;
- eligibility summary;
- public contact;
- public documents;
- slug;
- whether Self Check is available;
- whether Applications are currently open.

**Rules**

Do not expose:
- internal Workflow configuration;
- reviewer information;
- internal Eligibility Rules;
- internal notes;
- unpublished documents.

### Acceptance Criteria

1. Draft calls are not returned publicly.
2. Live calls are visible.
3. Closed/Archived calls can remain available as archive records.
4. Public data comes from SME Fund API, not Payload FundingCalls.
5. Open/closed state uses server time.

### Done When

The public website can list and display Funding Calls entirely from the SME Fund API.
## 6.7 Public Eligibility Self-Check

### Goal

Allow a prospective applicant to run an advisory Self Check before creating/submitting an Application.

### Scope

- resolve the Funding Call's bound Ruleset Version;
- execute only rules configured for Self Check/Both;
- collect only values required by those rules;
- return applicant-facing guidance;
- do not create an authoritative Screening result.

### Acceptance Criteria

1. Self Check works without creating an Application.
2. Exact bound Ruleset Version is used.
3. Hard Fail/Soft Fail/Warning messages are handled appropriately for public guidance.
4. Internal rule details are not exposed.
5. Self Check result is clearly non-authoritative.
6. No authoritative Eligibility Assessment is created.

### Done When

A public user can run an advisory Eligibility Self Check using the same Ruleset Version later used during Screening.

---
# Phase 7 — Workflow Runtime Core

This phase turns a published Workflow Template Version into live processing for one Application.

## 7.1 Workflow Instance

### Goal

Create the runtime Workflow for one Application.

### Scope

Store:
- ApplicationId;
- WorkflowTemplateVersionId;
- runtime status;
- created/started/completed timestamps.

**Rules**

- exact Workflow Template Version is frozen at creation;
- later Template changes do not affect the instance.

### Acceptance Criteria

1. One Application can create its Workflow Instance.
2. Exact `WorkflowTemplateVersionId` is stored.
3. Published newer Workflow Versions do not alter the instance.

### Done When

An Application has a version-frozen runtime Workflow Instance.
## 7.2 Stage Instance

### Goal

Represent one configured Stage as it occurs during one Workflow Instance.

### Scope

Store:
- WorkflowInstanceId;
- WorkflowStageDefinitionId;
- status;
- activated/completed timestamps;
- iteration number where repeatable;
- referral/return context where applicable.

### Acceptance Criteria

1. Stage Instance is separate from Stage Definition.
2. Multiple Stage Instances may exist for one Workflow Instance.
3. Repeatable Stages can later create multiple iterations.

### Done When

Runtime Stage state is independently persisted.
## 7.3 Workflow Task

### Goal

Represent a unit of work assigned within a Stage Instance.

### Scope

Store:
- StageInstanceId;
- WorkflowTaskDefinitionId;
- assigned role;
- assigned user where allocated;
- status;
- created/started/completed timestamps;
- due date where configured.

**Rules**

- Task Definition is design-time;
- Workflow Task is runtime;
- one Stage may create multiple Workflow Tasks.

### Acceptance Criteria

1. Runtime work is independently trackable per Task.

### Done When

Runtime work is independently trackable per Task.
## 7.4 Stage Activation

### Goal

Activate a Stage only when its Entry Conditions pass.

### Scope

**Runtime Behaviour**

1. Resolve target Stage Definition.
2. Evaluate Entry Conditions.
3. If conditions pass, create/activate Stage Instance.
4. Create required Workflow Tasks from Task Definitions.
5. Audit activation.

### Acceptance Criteria

1. Failed Entry Condition prevents activation.
2. Successful activation creates Stage Instance once.
3. Required Tasks are created.
4. Activation is auditable.

### Done When

Stage activation is deterministic and condition-gated.
## 7.5 Task Lifecycle

### Goal

**States** - Pending; - Assigned / Claimed; - InProgress; - Completed; - Cancelled.

### Scope

**States**

- Pending;
- Assigned / Claimed;
- InProgress;
- Completed;
- Cancelled.

### Acceptance Criteria

1. Task state changes are persisted.
2. Invalid state changes are rejected.
3. Completion timestamp is stored.
4. Task lifecycle is auditable.

### Done When

A Workflow Task can move safely through its lifecycle.
## 7.6 Stage / Task Form Responses

### Goal

Persist assignee inputs captured through the Form bound to the Task.

### Scope

**Rules**

- response stores exact FormVersionId;
- response belongs to WorkflowTask where task-specific;
- multiple reviewers have separate responses;
- context displayed by the binding is not duplicated into the response.

### Acceptance Criteria

1. Task response persists.
2. Multiple reviewers cannot overwrite one another.
3. Response survives refresh.
4. Later stages can resolve values through stable context paths.

### Done When

Assignee Form responses are independent, version-bound and auditable.
## 7.7 Stage Completion

### Goal

Complete a Stage only when its configured completion requirements pass.

### Scope

**Runtime Behaviour**

1. Evaluate Exit Conditions.
2. Evaluate required Task completion count.
3. Evaluate checklist/document/scoring requirements exposed through Conditions.
4. Complete Stage.
5. Audit completion.

### Acceptance Criteria

1. Stage cannot complete while Exit Conditions fail.
2. Completion timestamp is stored.
3. Stage completes only once.
4. Completion is auditable.

### Done When

Stage completion is controlled entirely by configuration and runtime state.
## 7.8 Sequential Transition Execution

### Goal

Move from the completed Stage to the configured target Stage.

### Scope

**Runtime Behaviour**

1. Validate selected Action.
2. Evaluate Transition Conditions.
3. Complete source Stage if not already completed by the Action flow.
4. Record Transition Execution.
5. Resolve target Stage(s).
6. Evaluate target Entry Conditions.
7. Activate valid target Stage(s).

### Acceptance Criteria

1. Target comes from configured Transition, never display order.
2. Failed Transition Condition blocks movement.
3. Target Entry Conditions are evaluated.
4. Transition is recorded.
5. Duplicate execution does not create duplicate Stage Instances.

### Done When

A configured sequential Workflow can move safely from one Stage to the next.
## 7.9 Runtime Audit Trail

### Goal

**Minimum Events** - Workflow Created; - Stage Activated; - Task Created; - Task Assigned; - Task Started; - Task Completed; - Action Executed; - Stage Completed; - Transition Executed.

### Scope

**Minimum Events**

- Workflow Created;
- Stage Activated;
- Task Created;
- Task Assigned;
- Task Started;
- Task Completed;
- Action Executed;
- Stage Completed;
- Transition Executed.

**Audit Data**

Record:
- actor;
- timestamp;
- WorkflowInstanceId;
- StageInstanceId where applicable;
- TaskId where applicable;
- action/reason where applicable;
- before/after values where applicable.

### Acceptance Criteria

1. The runtime path of an Application can be reconstructed from immutable audit history.

---.

### Done When

The runtime path of an Application can be reconstructed from immutable audit history.

---
# Phase 8 — Workflow Action Semantics

This phase gives each configured Workflow Action a deterministic runtime
meaning. It builds on the sequential runtime from Phase 7. Assignment and
quorum remain in Phase 9, parallel fork/join behavior remains in Phase 10, the
full RFI lifecycle remains in Phase 11, and SLA timing remains in Phase 12.

An Action is always executed against a specific active Stage Instance and,
where the Action is task-scoped, a specific Workflow Task. The runtime must
never infer the source Stage from a single `currentStageId` or infer a target
from display order.

## 8.1 Common Action Execution Contract

### Goal

Provide one server-side execution path for every manual and automatic Workflow
Action.

### Scope

The execution request identifies:
- Workflow Instance;
- source Stage Instance;
- Workflow Task where task-scoped;
- configured Action key;
- expected runtime version or equivalent concurrency token;
- action-specific input validated by a discriminated Zod schema;
- idempotency key for retry-safe command handling.

The server resolves the immutable Workflow Template Version and validates:
- the Stage Instance belongs to the Workflow Instance;
- the Task belongs to the Stage Instance where supplied;
- the Action is configured on the source Stage/Task;
- the Action type and payload match its published configuration;
- the Stage, Task and Workflow are in states that permit the Action;
- the actor has the narrowest required canonical permission;
- ownership, assignment, delegation or other resource context matches where
  required;
- Action Conditions and Transition Conditions pass against one consistent
  runtime context snapshot;
- required Form, checklist, document, score, reason and comment inputs are
  present;
- every configured target reference is valid.

Client-side visibility is advisory. A hidden, disabled, stale or directly
submitted Action receives the same server-side validation.

### Transaction and Persistence Rules

Within one database transaction:
1. lock or concurrency-check the affected runtime records;
2. create one immutable Action Execution record;
3. apply the action-specific Stage, Task and Workflow state changes;
4. create any Decision, referral, hold, deferral or escalation record required
   by the Action type;
5. complete or cancel affected Tasks only where the configured semantics
   require it;
6. execute or schedule the configured Transition behavior;
7. append immutable audit events;
8. commit all changes together.

Persist at minimum:
- Action Execution identifier;
- configured Action definition/key and Action type;
- actor type and actor identifier, including a system actor for automation;
- Workflow, source Stage Instance and optional Task identifiers;
- action-specific reason code and comment where applicable;
- normalized action-specific input;
- resolved target Stage definition identifiers or terminal outcome;
- condition-evaluation result references or snapshot metadata;
- execution time;
- idempotency key;
- resulting runtime state/version.

Sensitive values must not be copied into audit payloads when stable references
or appropriately redacted before/after values are sufficient.

### Acceptance Criteria

1. Every Action type uses the same server-side command boundary.
2. An Action cannot execute against an unrelated Workflow, Stage or Task.
3. Permission and resource-context mismatches are denied before mutation.
4. Invalid state, stale version, invalid payload and failed Conditions produce
   explicit domain errors.
5. State changes, Action Execution, Decision/semantic records, Transition
   effects and audit events commit atomically.
6. Repeating the same idempotency key returns the original result without
   creating duplicate records, transitions or Stage Instances.
7. Two conflicting executions cannot both succeed against the same runtime
   version.
8. Action execution never depends on Stage display order or a singleton current
   Stage.

### Done When

All Workflow Actions enter through one authorized, condition-aware,
transactional and retry-safe runtime command.

## 8.2 Action Availability Read Model

### Goal

Expose the Actions currently available to an actor without treating UI
availability as authorization.

### Scope

For a Stage Instance or Workflow Task, return configured Actions with:
- stable Action key and type;
- label and presentation metadata;
- whether the Action is currently available;
- a safe, user-facing unavailable reason where disclosure is appropriate;
- required input metadata such as reason, comment, target, review date or due
  date;
- confirmation requirements.

Availability uses the same state, permission, context and Condition policies as
execution. The execution command re-evaluates all rules to handle stale pages
and concurrent changes.

### Acceptance Criteria

1. The UI does not hard-code Action buttons by Stage name.
2. Different actors can receive different availability for the same Stage
   Instance.
3. Availability does not expose internal Condition details or unauthorized
   data.
4. An Action becoming invalid after the read is rejected during execution.
5. Availability and execution share policy/evaluator logic rather than
   duplicating business rules.

### Done When

Task and Stage screens can render configuration-driven Action controls while
the server remains authoritative.

## 8.3 Approve / Advance

### Goal

Record a positive decision and advance through its configured Transition.

### Scope

**Runtime Behaviour**

1. Validate required work, Stage Exit Conditions and any decision inputs.
2. Persist the actor's Decision where the Action is decision-bearing.
3. Complete the acting Task when configured.
4. Complete the source Stage only when its configured completion rule is met.
5. Execute the Transition configured for this Action.
6. Activate only the configured target Stage or Stages whose Entry Conditions
   pass.

Approving one reviewer Task does not imply Stage approval when later quorum or
completion-threshold configuration requires additional Tasks. Phase 9 adds
that aggregation behavior.

### Acceptance Criteria

1. Approve cannot bypass incomplete required work or failed Exit Conditions.
2. A Decision retains actor, time, input and exact Action configuration
   references.
3. The source Stage advances only when its completion rule is satisfied.
4. The resolved target comes from the configured Transition.
5. Retried approval does not create a second Decision or Transition execution.

### Done When

A valid positive Action records the decision and advances exactly as configured.

## 8.4 Reject

### Goal

Record a negative decision and apply the configured terminal or non-terminal
rejection outcome.

### Scope

Reject configuration determines:
- whether a reason code, comment or both are mandatory;
- whether the outcome terminates the Workflow or follows a configured
  Transition;
- which open Tasks and Stage Instances are cancelled for a terminal outcome;
- the internal outcome and safe public-status mapping;
- whether rejection is reversible through a separately configured Action.

For a terminal rejection, persist the Decision before setting the Workflow to
its rejected terminal state. Do not delete Stage Instances, Tasks, responses or
documents.

### Acceptance Criteria

1. Required rejection reasons are validated server-side.
2. Terminal and non-terminal rejection behavior comes from published
   configuration.
3. Terminal rejection prevents further ordinary work and cancels configured
   open Tasks atomically.
4. Existing runtime history and captured responses remain available for audit.
5. Internal rejection detail is not leaked through the public-status mapping.

### Done When

Rejection produces one auditable Decision and the configured terminal or
transition outcome.

## 8.5 Return / Rework

### Goal

Send work to an explicitly configured earlier or corrective Stage without
rewinding or overwriting history.

### Scope

**Rules**

- target a stable Stage definition identifier from Action/Transition
  configuration;
- require the configured reason/comment;
- close or cancel source work according to configuration;
- create a new target Stage Instance with the next iteration number;
- preserve prior Stage Instances, Tasks, Form Responses and Decisions;
- record the returning Stage/Task and the Stage Instance to which processing
  should later return where configured;
- carry forward, copy or clear editable working data only through an explicit
  data-retention policy; immutable submitted responses are never overwritten.

A Return is not implemented by changing an old completed Stage back to Active.

### Acceptance Criteria

1. Return uses a configured target and cannot accept an arbitrary Stage.
2. The prior target-stage iteration remains immutable and auditable.
3. A new target Stage Instance receives a unique iteration number and its own
   Tasks/responses.
4. Return context identifies origin, reason and intended continuation behavior.
5. Data retention follows configuration and never destroys prior submitted
   evidence.
6. Return loops remain valid when Stage display order changes.

### Done When

Rework creates a traceable new Stage iteration without rewriting Workflow
history.

## 8.6 Refer

### Goal

Route a bounded question or specialist review to a configured Stage or Task and
return control to the referrer when complete.

### Scope

Refer differs from Return/Rework: the original work is not invalidated. Persist
a referral context containing:
- referring Stage Instance and Task;
- configured referral target;
- reason/question and permitted context;
- referral status;
- return-to-referrer behavior.

The configured policy determines whether the referring Task remains blocked or
open while the referred work is active. Referral completion resumes or creates
the configured continuation; it must not rediscover the referrer from display
order.

### Acceptance Criteria

1. Referral targets are restricted to published configuration.
2. Referred work has independent Task state and responses.
3. The referrer and return path are persisted explicitly.
4. Completion returns control at most once.
5. Referral does not overwrite the referrer's work or masquerade as rework.

### Done When

A configured specialist referral can leave and return to its exact origin with
complete history.

## 8.7 Hold / Resume

### Goal

Pause permitted Workflow processing without completing, rejecting or rewinding
the active work.

### Scope

Hold records:
- hold reason code/comment;
- actor and start time;
- optional configured review date;
- scope: Workflow Instance, Stage Instance or Task as supported by
  configuration;
- prior runtime state needed for valid resumption.

While held, ordinary Actions and automatic transitions inside the hold scope
are blocked except explicitly permitted Actions such as Resume or Withdraw.
Resume closes the active hold period and restores the persisted prior state; it
does not guess the state from current configuration.

Phase 12 uses hold periods to pause and recalculate SLA clocks. This phase must
emit stable hold-started and hold-ended facts but does not implement SLA
calculation.

### Acceptance Criteria

1. Only configured scopes can be held by an authorized actor.
2. A duplicate Hold cannot create overlapping active hold periods for the same
   scope.
3. Blocked Actions and automation cannot progress held work.
4. Resume requires an active hold and restores the valid prior state once.
5. Hold duration can be derived from immutable start/end timestamps.
6. Hold and Resume are audited with actor and reason.

### Done When

Configured work can pause and resume without losing state or allowing hidden
progression.

## 8.8 Withdraw

### Goal

End processing through an authorized withdrawal while retaining the full
Application and Workflow record.

### Scope

Validate:
- the Action is allowed from the current runtime state;
- the actor has the applicable own/all contextual permission;
- any ownership or representative relationship matches the Application;
- the configured reason and confirmation are present;
- the configured resubmission or reinstatement rule.

On success:
- persist the withdrawal record;
- set the Workflow to its withdrawn terminal state;
- cancel configured open Stage Instances and Tasks;
- prevent automatic transitions and ordinary Actions;
- emit an integration result for the Application lifecycle and public-status
  projection.

Phase 14 exposes the applicant-facing Application withdrawal flow. It must call
this same semantic operation rather than implement a second withdrawal path.

### Acceptance Criteria

1. An unrelated applicant cannot withdraw another applicant's Workflow.
2. Withdrawal is rejected from disallowed or already terminal states.
3. Open runtime work is closed consistently in the same transaction.
4. No Workflow data, responses, documents or audit events are deleted.
5. Resubmission/reinstatement is possible only when explicitly configured.
6. Applicant-facing and staff-initiated withdrawal use the same domain
   semantics with their respective permissions.

### Done When

Withdrawal terminates processing safely without erasing the record or creating
an authorization bypass.

## 8.9 Defer

### Goal

Suspend a decision until a configured date, event or Funding Call destination.

### Scope

Persist a deferral record containing:
- reason;
- actor and time;
- deferral mode;
- resume/review date when date-based;
- configured target Funding Call or Stage when applicable;
- source Stage Instance and pending continuation.

Deferral is distinct from Hold: it records a deliberate processing outcome and
its future continuation rule. A deferral must not silently clone or move an
Application to another Funding Call. Any future-call transfer requires an
explicit configured operation that preserves source and destination links.

### Acceptance Criteria

1. Deferral mode and destination conform to published configuration.
2. Deferred work cannot continue through ordinary or automatic Actions.
3. Resume/review behavior is explicit and auditable.
4. Repeated scheduler/event delivery cannot resume a deferral twice.
5. Cross-call deferral preserves the original Application and creates explicit
   linkage rather than changing its Funding Call identifier in place.

### Done When

Deferred work has a durable reason, destination/trigger and single auditable
continuation path.

## 8.10 Escalate

### Goal

Raise active work to configured authority without pretending that the current
Stage has completed.

### Scope

Escalation configuration identifies:
- manual and/or automatic trigger;
- target role, capability, assignment strategy or escalation Stage;
- reason/comment requirements;
- whether existing assignees retain, share or lose responsibility;
- whether work is blocked pending escalation resolution.

This phase records and routes the escalation intent. Phase 9 resolves advanced
assignment, workload and delegated-authority behavior. Phase 12 supplies SLA
breach triggers.

### Acceptance Criteria

1. Escalation destinations come from configuration, not role names embedded in
   code.
2. Escalation does not complete the source Stage unless a configured Transition
   explicitly does so.
3. Responsibility changes preserve assignment history.
4. An escalation cannot target an unauthorized or structurally invalid
   destination.
5. Duplicate trigger delivery does not create duplicate active escalations.
6. Resolution is linked to the escalation that caused it.

### Done When

Manual escalation is auditable and the runtime contract is ready for later
assignment and SLA-driven triggers.

## 8.11 Request Information Hook

### Goal

Define the Action-to-RFI integration boundary without duplicating the RFI
lifecycle implemented in Phase 11.

### Scope

The Request Information Action validates and emits one transactional RFI
creation request containing:
- Application, Workflow, Stage and Task references;
- requester;
- configured recipient/participant scope;
- question/instructions;
- editable-field whitelist;
- requested document categories;
- response deadline/expiry configuration;
- continuation behavior after response or expiry.

Until Phase 11 supplies the lifecycle handler, the Action cannot report success
or partially change Workflow state. Once integrated, RFI creation and the
Workflow state change commit atomically.

### Acceptance Criteria

1. RFI input conforms to the published Action configuration.
2. Editable fields use stable field paths and cannot broaden beyond the
   configured whitelist.
3. The hook carries stable source and continuation references.
4. Missing RFI lifecycle support fails explicitly without partial mutation.
5. Retrying the Action cannot create duplicate RFI conversations.
6. Phase 11 can implement creation, response, expiry and correspondence without
   changing the common Action execution contract.

### Done When

Request Information has a stable, atomic integration contract for the Phase 11
RFI lifecycle.

## 8.12 Automatic Transition Framework

### Goal

Execute configured Actions or Transitions from trusted system events when no
human choice is required.

### Scope

Support an automation definition containing:
- stable trigger key and trigger type;
- source Stage/Workflow state;
- configured Action or Transition reference;
- Conditions;
- action-specific input/defaults;
- idempotency-key derivation;
- enabled/disabled state;
- execution priority where multiple automations may react to one event.

Initial trigger types may include:
- Stage activated;
- Task/Stage completed;
- Condition became satisfied from a committed domain event;
- explicit internal domain event.

Time/SLA/RFI-expiry triggers integrate in later phases. Automation executes as
an identifiable system actor through the same validation, transaction and
audit path as manual Actions, except for human-assignment checks that the
Action explicitly declares inapplicable.

**Safety Rules**

- process only committed events through an outbox or equivalent reliable event
  boundary;
- deduplicate by automation definition and triggering event;
- re-read current runtime state before execution;
- do not bypass Conditions, state validation or target validation;
- enforce a bounded execution chain and detect non-waiting automatic cycles;
- route repeated failures to observable operational status rather than
  silently dropping them;
- do not activate a target more than once for the same semantic execution.

### Acceptance Criteria

1. An automatic Action produces the same semantic and audit records as its
   manual equivalent.
2. Audit identifies the system actor, trigger event and automation definition.
3. Duplicate event delivery produces one outcome.
4. A stale trigger cannot progress a Workflow whose state has changed.
5. Invalid automatic cycles fail Workflow publication validation or stop at the
   runtime execution bound.
6. Failed automation is observable and retryable without duplicating effects.
7. No timer, Stage-name or display-order-specific behavior is hard-coded.

### Done When

Committed domain events can drive safe, configuration-defined and auditable
Workflow progression.

## 8.13 Action Audit, Errors and Test Matrix

### Goal

Make Action behavior supportable and prove every semantic path at the domain,
repository, API and end-to-end boundaries.

### Scope

Define stable domain error categories for at least:
- Action not configured;
- Action unavailable in current state;
- permission denied;
- resource-context mismatch;
- validation/reason required;
- Condition failed;
- completion requirement failed;
- stale runtime version/conflict;
- duplicate request with mismatched payload;
- invalid target/configuration;
- unsupported dependent lifecycle.

Audit every attempted execution that reaches the domain boundary as permitted
by the security/audit policy, while keeping rejected requests free of sensitive
payload values. Successful audit records include before/after state references,
semantic record identifiers and Transition/target results.

Automated tests cover, for each Action type:
- allowed execution;
- permission denial;
- contextual authorization mismatch;
- invalid state;
- invalid payload or missing reason;
- failed Conditions;
- stale-version conflict;
- identical retry;
- conflicting retry using the same idempotency key;
- transaction rollback after an injected downstream failure;
- immutable audit reconstruction.

Add focused scenarios for Return iteration preservation, Refer return routing,
Hold/Resume blocking, terminal Reject/Withdraw cancellation, Defer continuation,
Escalate routing, RFI integration failure and automatic-event deduplication.

### Acceptance Criteria

1. API responses map domain failures consistently without exposing internals.
2. Tests prove no partial state remains after a failed Action.
3. Tests prove Action and Transition history reconstructs the runtime path.
4. Protected Action routes test allowed, denied and context-mismatch cases.
5. Runtime Action tests are separated from definition, task, parallel and RFI
   lifecycle tests in accordance with the Project Structure Contract.

### Done When

Every Phase 8 Action semantic is explicit, observable and protected by a shared
negative/positive test matrix.

## Phase 8 Done When

Approve/Advance, Reject, Return/Rework, Refer, Hold/Resume, Withdraw, Defer and
Escalate execute through the common Action contract; Request Information has an
atomic integration hook; automatic transitions are retry-safe; and all paths
are server-authorized, configuration-driven, concurrency-safe and auditable.

---

# Phase 9 — Workflow Tasks, Assignment & Quorum

This phase turns configured Task responsibility into secure runtime ownership.
It builds on the Task lifecycle and Action execution contracts from Phases 7
and 8. Assignment selects who may perform work; it never replaces the
server-side permission and resource-context checks required when that work is
read, saved, completed or used for a Workflow Action.

Workflow Task assignment remains owned by the `workflows` module. PostgreSQL is
the source of truth for users, roles, permission grants, authority and
assignment history. Firebase identity proves who the actor is but does not
decide what the actor may do.

## 9.1 Assignment Model and Candidate Eligibility

### Goal

Define one assignment contract used by manual allocation, automatic allocation,
reassignment and self-claim.

### Scope

Separate these concepts:
- Task Definition responsibility: the published design-time role, assignment
  mode and constraints;
- Workflow Task: one runtime unit of work;
- Task Assignment: one auditable period during which a user owns or
  participates in that Task;
- candidate: a user who currently satisfies every eligibility rule but is not
  assigned until an allocation command succeeds.

Persist for each Task Assignment:
- Workflow Task identifier;
- assigned user and responsibility/role under which the assignment was made;
- assignment mode and strategy;
- assignment status;
- assigned by and assigned at;
- accepted/claimed, started and ended timestamps where applicable;
- end reason and superseding assignment where applicable;
- strategy decision metadata sufficient to explain the allocation without
  copying sensitive profile data;
- runtime version/concurrency token.

A candidate must satisfy all configured requirements at assignment time:
- active PostgreSQL application-user status;
- required role/responsibility and canonical permission grant;
- required organisational, Funding Call, programme, region or other configured
  scope;
- expertise and authority requirements where applicable;
- no disqualifying conflict or segregation-of-duties relationship known at
  allocation time;
- availability for the applicable assignment mode;
- not already assigned to the same independent-review slot.

The same eligibility policy is reused by all allocation strategies and is
revalidated when a candidate accepts/claims work and when protected operations
are performed. Candidate queries must filter, sort and limit in PostgreSQL and
must not load all users for in-memory allocation.

### Acceptance Criteria

1. Task Definition responsibility, Workflow Task and Task Assignment are
   independently identifiable.
2. Assignment history is append-only; changing ownership ends one assignment
   and creates another.
3. Every allocation mode uses the same deny-by-default candidate-eligibility
   policy.
4. Inactive, out-of-scope or insufficiently permitted users cannot be assigned.
5. Candidate reads select only the fields required for allocation and do not
   expose sensitive user or conflict data.
6. Assignment and Task projections can identify one current owner without
   losing prior ownership periods.
7. Concurrent allocation commands cannot create two current assignments for
   one single-owner Task.

### Done When

Every Task allocation is based on one contextual eligibility policy and creates
a durable ownership record.

## 9.2 Manual and Named-User Assignment

### Goal

Allow an authorized allocator to assign an eligible user explicitly.

### Scope

Manual assignment supports:
- selection from a server-filtered eligible candidate list;
- an optional design-time named-user override where published configuration
  permits it;
- a required reason when overriding the normal role-based strategy;
- an optional due date only within configured limits;
- optimistic concurrency and an idempotency key.

The allocator must have the narrow canonical permission for the Task scope.
Possessing assignment authority does not allow the allocator to assign an
otherwise ineligible user. A named-user override changes selection priority,
not authorization, COI, scope or delegated-authority rules.

### Acceptance Criteria

1. Only an authorized allocator can view candidates and submit an assignment.
2. Candidate eligibility is revalidated after selection and before commit.
3. A configured named-user override fails safely if the user is no longer
   eligible.
4. Override reason, allocator and configuration reference are audited.
5. Retrying the command does not create another current assignment.
6. A stale Task version returns a conflict rather than overwriting a newer
   assignment.

### Done When

Authorized staff can assign a Task deliberately without bypassing its published
responsibility or contextual controls.

## 9.3 Role-Based Assignment

### Goal

Resolve Task responsibility from configured business roles and scopes rather
than hard-coded user or Stage names.

### Scope

At Task creation or allocation time:
1. resolve the Task Definition's stable responsibility/role reference;
2. query active users with the required effective permission and scope;
3. apply COI, segregation-of-duties, expertise, authority and availability
   filters required by the Task;
4. apply the configured selection strategy;
5. assign one or more eligible candidates or leave the Task visibly
   Unassigned when no permitted fallback exists.

Role membership alone is insufficient. The actor must also hold the required
canonical permission, and contextual scope must match the target resource.
Absence of an eligible candidate must create an observable allocation outcome;
it must not broaden the candidate set silently.

### Acceptance Criteria

1. Role resolution uses PostgreSQL application roles and permission grants.
2. A matching role without the required permission or scope is excluded.
3. Empty candidate results leave work safely unassigned and observable.
4. Fallback roles/users are used only when explicitly configured and validated.
5. Role labels can change without breaking stable responsibility references.
6. Task creation and later allocation use the same candidate semantics.

### Done When

Configured role responsibility produces an eligible candidate pool without
embedding client role names in runtime code.

## 9.4 Multiple Reviewer Tasks and Isolation

### Goal

Create independent work for the configured number of reviewers without shared
responses or accidental identity disclosure.

### Scope

For a Task Definition with multiple reviewers:
- create one Workflow Task per reviewer slot;
- give each Task its own assignment, lifecycle, Form Response, comments,
  recommendation and Action/Decision records;
- prevent the same user filling more than one independent slot unless a
  published exception explicitly allows it;
- prevent one reviewer from editing another reviewer's Task or response;
- hide peer identities, draft responses, scores and recommendations until the
  configured release/consolidation point;
- expose only the minimum peer-completion metadata needed by the use case;
- preserve slot identity when a reviewer is replaced so counts remain stable.

Aggregate/consolidated results are computed from submitted eligible responses;
they are not written back into individual reviewer responses. Phase 10 governs
parallel Stage branches; multiple Tasks inside one Stage are not modeled as a
fork.

### Acceptance Criteria

1. Configured reviewer count creates the same number of independent Task slots.
2. Each reviewer can access only Tasks permitted by assignment and contextual
   authorization.
3. Draft and submitted responses cannot overwrite or mutate another slot.
4. Peer identities and work remain hidden until configuration allows release.
5. Replacement does not inflate the reviewer count or lose the slot's history.
6. Aggregation includes only valid submitted responses from eligible slots.
7. Adding a reviewer is an assignment operation, not a new Workflow Action
   type.

### Done When

Multiple reviewers can work independently and confidentially while the Stage
retains a stable review structure.

## 9.5 Completion Threshold

### Goal

Complete multi-reviewer work only after the configured number or proportion of
eligible reviewer Tasks is complete.

### Scope

Support published threshold modes such as:
- all required slots;
- fixed completed count;
- configured percentage, with an explicit rounding rule.

Threshold evaluation defines which Task terminal states count. By default,
only valid Completed Tasks with submitted required responses count; Cancelled,
recused, rejected-assignment, superseded and incomplete Tasks do not. Replacement
slots preserve the configured denominator unless the Task Definition is
explicitly amended through a permitted runtime operation.

Evaluate the threshold in the same transaction that completes a reviewer Task
or changes slot eligibility. Satisfying the threshold makes the Stage eligible
for its remaining Exit Conditions and Action semantics; it does not bypass
them.

### Acceptance Criteria

1. Count, percentage and all-required rules have deterministic rounding and
   denominator behavior.
2. Ineligible or cancelled work cannot satisfy the threshold.
3. Concurrent final completions activate the threshold result once.
4. A threshold does not itself complete a Stage whose other Exit Conditions
   fail.
5. Evaluation records the rule/version and contributing Task identifiers.
6. Reassignment or recusal cannot double-count a reviewer slot.

### Done When

Reviewer completion requirements are deterministic, concurrency-safe and
explainable from contributing Tasks.

## 9.6 Quorum

### Goal

Represent and enforce participation quorum separately from reviewer-completion
thresholds.

### Scope

Quorum configuration defines:
- eligible participant population or configured seats;
- minimum count and/or percentage;
- rounding rule;
- whether the chair or specified responsibility is mandatory;
- which attendance/participation states count;
- whether abstentions count toward presence but not a decision majority;
- COI/recusal treatment;
- the point at which quorum is frozen or re-evaluated.

Persist a quorum evaluation snapshot containing:
- configuration/version reference;
- evaluation time;
- eligible denominator;
- present, cleared, recused and absent participant references;
- calculated result;
- actor/system trigger that confirmed the result.

Quorum confirms that a body may act. It is not the same as vote outcome,
reviewer threshold or delegated approval authority. Decision Actions revalidate
the current or frozen quorum rule as configured.

### Acceptance Criteria

1. Quorum and completion threshold use separate configuration and evaluation
   records.
2. COI-disqualified participants are treated according to an explicit
   denominator policy.
3. Required-chair and attendance rules are enforced server-side.
4. A decision cannot execute when its required quorum is absent.
5. The exact participants and calculation used for a quorum result are
   auditable.
6. Concurrent attendance changes cannot produce two incompatible accepted
   decisions.

### Done When

Committee or panel Actions can rely on an auditable, configuration-defined
quorum result rather than a manually asserted boolean.

## 9.7 Conflict-of-Interest Gate

### Goal

Prevent a reviewer or decision participant from viewing or acting on protected
Application content until conflict-of-interest requirements are cleared.

### Scope

Conflict of interest is a gate, not an ordinary Form field. Support states such
as:
- declaration required;
- no conflict declared and cleared;
- potential conflict disclosed, pending independent review;
- conflict confirmed / recused;
- clearance revoked.

Before clearance, expose only the minimum metadata necessary to identify and
respond to the assignment without revealing protected Application content.
Users cannot approve their own disclosed conflict. Confirmed conflict or
recusal ends the assignment, prevents the Task from contributing to threshold
or quorum results, and invokes the configured replacement policy.

Store declarations and clearance decisions as restricted audit records. Do not
copy sensitive disclosure text into general Workflow audit payloads.

### Acceptance Criteria

1. COI-gated content reads, Form loads, saves, Task completion and Actions all
   enforce clearance server-side.
2. A user cannot self-clear a disclosure that requires independent review.
3. Recused work does not count toward completion threshold, quorum decision or
   aggregated scoring.
4. Revoked clearance immediately prevents further protected access.
5. Replacement preserves the recused assignment and declaration history.
6. Non-gated Tasks do not acquire unnecessary COI steps.
7. Tests cover no-conflict, pending, confirmed-conflict, revoked and attempted
   bypass cases.

### Done When

Protected work remains inaccessible until COI clearance, and recusals cannot
influence the Workflow outcome.

## 9.8 Reassignment and Replacement

### Goal

Change Task ownership without rewriting history, leaking reviewer data or
double-counting work.

### Scope

Reassignment requires:
- an authorized actor or configured automatic trigger;
- a reason;
- a currently eligible replacement;
- concurrency validation;
- an explicit policy for work already started or submitted.

**Default Rules**

- an unstarted Task may end its current assignment and assign a new user;
- a Task with a draft response must not expose that draft to the replacement
  unless an explicit handover policy permits it;
- a submitted independent review remains immutable and attributed to its
  author; replacement creates or reopens the slot according to configuration;
- completed Tasks cannot have their author changed;
- assignment history, response ownership and threshold contribution remain
  separately traceable.

Automatic replacement after rejection, expiry, deactivation or COI recusal
uses the same command and policies as manual reassignment. Phase 12 supplies
SLA-expiry triggers.

### Acceptance Criteria

1. Reassignment ends rather than overwrites the prior Assignment.
2. Required reason, old/new owner, actor and timestamps are audited.
3. Draft and submitted response visibility follows the configured handover
   policy.
4. Completed work is never silently reattributed.
5. Replacement preserves reviewer-slot and threshold integrity.
6. The old assignee loses protected access when the reassignment commits.
7. Concurrent complete/reassign attempts yield one consistent result.

### Done When

Ownership can change safely while authorship, confidentiality and counting
remain correct.

## 9.9 Delegated Authority and Value Bands

### Goal

Resolve the required approver from the decision amount and prevent an actor
from deciding outside their effective authority.

### Scope

Define versioned authority-band configuration with:
- stable band key;
- currency;
- inclusive/exclusive lower and upper boundaries;
- permitted decision/action types;
- applicable Funding Call, programme or organisational scope;
- required responsibility/role and optional named holder;
- effective start/end dates;
- required evidence/reference;
- priority and validation rules that reject unintended gaps or overlaps.

The Task Definition identifies the stable context path for the authoritative
decision amount. Amount resolution must use a validated decimal/currency value
from the committed runtime context, not client input supplied only to the
Action request.

At allocation time:
1. resolve the amount and applicable authority configuration version;
2. select the one matching band;
3. restrict candidates to users with effective authority for that band, scope,
   decision type and date;
4. record the resolved band and amount snapshot on the approval Task.

At decision time, Phase 8 Action execution re-resolves or verifies the current
committed decision amount and validates the acting approver's effective band.
Assignment to the Task is necessary but not sufficient authority to approve.

Temporary/person-to-person delegation must be explicit, time-bounded,
scope-bounded and non-transitive unless configuration expressly permits it. A
delegate cannot receive a higher ceiling or broader decision scope than the
delegator holds. Splitting one decision into smaller amounts must not be used
to evade the applicable band.

Currency conversion is allowed only when an approved conversion policy and
rate snapshot are configured and audited; otherwise currencies must match.

### Acceptance Criteria

1. Boundary values resolve deterministically to exactly one authority band.
2. Invalid gaps, overlaps, currencies and effective-date ranges block
   publication or activation of authority configuration.
3. The approval Task records the amount, currency and band/configuration
   version used for allocation.
4. An assigned actor outside the applicable band is denied at Action execution.
5. A changed decision amount triggers revalidation and, where required,
   reassignment before decision.
6. Expired, revoked, out-of-scope or excessive temporary delegation is denied.
7. Delegation cannot expand authority beyond the delegator's effective grant.
8. Reduced/partial approval validates the configured governing amount rule and
   cannot be used to bypass authority.
9. Allowed, denied, exact-boundary, gap, overlap, currency, expiry and changed-
   amount cases are tested.

### Done When

The required approver is selected from the authoritative amount and no decision
can complete outside the actor's effective value band.

## 9.10 Round-Robin Allocation

### Goal

Distribute eligible Tasks fairly using a deterministic, concurrency-safe
rotation.

### Scope

Maintain a rotation cursor per configured allocation pool/scope. Allocation:
1. resolves the eligible candidate set;
2. orders candidates by stable rotation sequence and deterministic tie-breaker;
3. selects the next eligible candidate after the cursor;
4. creates the Assignment and advances the cursor atomically.

Skipping an ineligible/unavailable user does not make that user eligible, and
an empty pool leaves the Task Unassigned. Reassignment does not alter rotation
unless the published strategy explicitly says it should.

### Acceptance Criteria

1. Concurrent allocations cannot select the same next slot because of a lost
   cursor update.
2. Rotation is scoped to the configured pool and does not leak across Funding
   Calls/programmes where scopes differ.
3. Ineligible users are skipped without corrupting the cursor.
4. Tie-breaking is deterministic and testable.
5. Strategy metadata explains the pool, prior cursor and selected candidate.
6. An empty eligible pool produces an observable Unassigned result.

### Done When

Round-robin allocation is fair, scoped and safe under concurrent Task creation.

## 9.11 Expertise-Based Allocation

### Goal

Match work to eligible reviewers using controlled expertise requirements.

### Scope

Use stable expertise/taxonomy identifiers rather than free-text matching.
Configuration defines:
- required and preferred expertise;
- match mode for multiple requirements;
- proficiency or accreditation threshold where applicable;
- expiry/effective-date rules;
- deterministic ranking and tie-breaker;
- permitted fallback strategy.

Expertise narrows or ranks candidates after permission, scope, COI and authority
eligibility filters. It cannot make an otherwise unauthorized user eligible.
Candidate matching and ranking occur in the repository query or a bounded
set-based projection.

### Acceptance Criteria

1. Required expertise excludes candidates who do not satisfy it.
2. Preferred expertise affects ranking without bypassing required controls.
3. Expired or unverified expertise is treated according to configuration.
4. Fallback occurs only when explicitly configured and is visible in the
   Assignment decision metadata.
5. Matching is deterministic for the same candidate/context snapshot.
6. No per-candidate/N+1 expertise query is used.

### Done When

Expertise allocation selects a qualified, authorized reviewer through an
explainable configured rule.

## 9.12 Workload-Based Allocation

### Goal

Allocate to the least-loaded eligible candidate using a defined and auditable
workload measure.

### Scope

Configuration defines which work contributes to load, for example:
- active assigned Tasks;
- weighted Task complexity/effort;
- overdue or near-due work;
- maximum concurrent assignments;
- configured availability/capacity.

Calculate workload with a set-based aggregate over the eligible candidate
pool. Select using the calculated score plus a deterministic tie-breaker.
Allocation and capacity enforcement must be concurrency-safe so simultaneous
commands cannot both consume the final capacity slot.

### Acceptance Criteria

1. The workload formula and contributing states are explicit and versioned.
2. Completed, cancelled or otherwise excluded work does not add load.
3. Maximum capacity is enforced atomically.
4. Equal-load candidates use a deterministic tie-breaker or configured
   secondary strategy.
5. Assignment records enough score metadata to explain the choice.
6. Workload is calculated without N+1 queries or unbounded in-memory grouping.

### Done When

Workload allocation chooses an eligible candidate consistently without
oversubscribing configured capacity.

## 9.13 Self-Assignment Pool

### Goal

Allow an eligible user to claim available work from a controlled pool.

### Scope

The pool read model returns only Tasks the current user is eligible to claim
and only the minimum metadata they may see before assignment and COI clearance.
It supports database-level filtering, stable ordering and bounded pagination.

Claim execution:
1. identifies the Task and expected runtime version;
2. revalidates user, permission, role, scope, capacity, segregation, authority
   and pool eligibility;
3. applies the COI pre-access policy;
4. creates the Assignment and moves the Task to its configured claimed state in
   one transaction;
5. removes the Task from other users' pool results through committed state.

Claiming does not by itself clear COI or reveal protected Application content.
Release/unclaim is allowed only within configured rules and produces Assignment
history rather than deleting the claim.

### Acceptance Criteria

1. Users cannot list or claim out-of-scope pool Tasks.
2. Two simultaneous claims yield one owner and one conflict response.
3. Eligibility and capacity are revalidated at claim time.
4. Pre-claim metadata does not leak protected Application or reviewer data.
5. Claim, release and subsequent claim preserve complete Assignment history.
6. Pool filtering, ordering and pagination occur in PostgreSQL.
7. A direct API request cannot bypass COI or contextual authorization.

### Done When

Eligible users can claim work atomically without exposing or stealing Tasks.

## 9.14 Assignment Audit, Read Models and Test Matrix

### Goal

Make Task ownership, allocation decisions and aggregate completion behavior
observable and verifiable.

### Scope

Provide audience-appropriate read models for:
- My Tasks/current assignments;
- unassigned Tasks requiring allocation;
- self-assignment pools;
- Stage reviewer-slot/completion progress;
- restricted assignment history;
- quorum status;
- authority-band resolution;
- allocation failure/exception queues;
- workload data required by later reporting.

Use explicit SQL projections with filtering, ordering and pagination. Reviewer
identity, COI disclosure, authority evidence and strategy metadata are exposed
only to actors with the applicable contextual permissions.

Audit at minimum:
- Task allocated, claimed, accepted, released, reassigned and ended;
- candidate strategy/fallback outcome;
- COI declaration, clearance, revocation and recusal using restricted detail;
- reviewer threshold satisfied;
- quorum evaluated/satisfied/lost;
- authority band resolved, re-resolved and denied;
- automatic allocation failure.

Automated tests cover allowed, denied and context-mismatch cases for every
protected route/command, plus:
- no eligible candidate;
- identical retry and stale version;
- concurrent assignment, claim, completion and reassignment;
- reviewer response isolation;
- threshold denominator and rounding boundaries;
- quorum attendance/COI combinations;
- authority-band boundaries and changed amounts;
- round-robin cursor contention;
- expertise ranking/fallback;
- workload ties/capacity contention;
- audit reconstruction and rollback after injected failure.

### Acceptance Criteria

1. Current ownership and complete Assignment history can be reconstructed.
2. Read models do not reveal reviewer, COI or authority data outside permitted
   scopes.
3. Repository tests cover projection shape, filters, ordering, pagination and
   authorization scope for material assignment queries.
4. Concurrency tests prove single ownership, stable reviewer counts and
   once-only threshold/quorum effects.
5. Integration tests prove an actor can complete/approve only an assigned,
   context-authorized and authority-valid Task.
6. All Assignment mutations and aggregate decisions are auditable without
   storing unnecessary sensitive payloads.

### Done When

Operations staff can explain who owned every Task, why they were selected, and
why a reviewer threshold, quorum or authority decision passed or failed.

## Phase 9 Done When

Manual, role-based, round-robin, expertise, workload and self-service allocation
all use the same contextual eligibility rules; reviewer Tasks and responses are
isolated; thresholds and quorum are deterministic; COI blocks content and
actions until clearance; reassignment preserves authorship and history; and an
approval cannot complete unless the actor's effective authority band covers the
authoritative decision amount.

---

# Phase 10 — Parallel Workflow Execution

This phase adds support for multiple active Stage Instances. It is required for the client's Technical Assessment and Financial Review flow before Moderation.

A single `currentStageId` model is not sufficient.

## 10.1 Fork

### Goal

Allow one completed Stage/Transition to activate multiple configured target Stages.

### Scope

**Example**

```text
Administrative Screening
          ↓
      Eligible
          ↓
   ┌───────────────┐
   │               │
   ▼               ▼
Technical       Financial
Assessment      Review
```

**Runtime Behaviour**

1. Source Stage completes.
2. Configured Transition resolves multiple targets.
3. Each target evaluates its own Entry Conditions.
4. Each passing target creates its own Stage Instance.
5. Each Stage creates its own Tasks.
6. Branches proceed independently.

### Acceptance Criteria

1. One Transition can activate multiple targets.
2. Each target has independent Stage state.
3. Each target has independent Tasks.
4. Entry Conditions are evaluated separately.
5. Activation is audited.

### Done When

A configured fork can create multiple active workflow branches.
## 10.2 Independent Parallel Completion

### Goal

Allow each active branch to progress and complete independently.

### Scope

**Required Behaviour**

```text
Technical = COMPLETE
Financial = ACTIVE
Moderation = NOT ACTIVE
```

Completing Technical must not automatically complete Financial or start Moderation.

### Acceptance Criteria

1. One branch can complete while another remains Active.
2. Branch completion order does not matter.
3. Each branch keeps separate audit history.
4. Workflow can report multiple active Stages.
5. Join target remains inactive until prerequisites are satisfied.

### Done When

Parallel branches operate independently without premature progression.
## 10.3 Join Definition

### Goal

Configure which predecessor branches must complete before a downstream Stage may activate.

### Scope

Join configuration identifies:
- downstream Stage;
- predecessor Stage Definitions;
- required predecessor completion behaviour.

**Example**

```text
Technical Assessment ──┐
                       ├──> Moderation
Financial Review ──────┘
```

**Rules**

- references use stable Stage identifiers;
- join does not depend on display order;
- join behaviour is configuration, not hard-coded Stage names.

### Acceptance Criteria

1. Admin can configure a downstream Stage with multiple predecessor dependencies.
2. Invalid predecessor references fail Workflow validation.
3. Join configuration is preserved during Workflow cloning.

### Done When

Parallel prerequisites can be represented declaratively in the Workflow Definition.
## 10.4 Join Runtime

### Goal

Activate the downstream Stage only when configured predecessor requirements are satisfied.

### Scope

**Runtime Behaviour**

After first branch completes:

```text
Technical = COMPLETE
Financial = ACTIVE
Moderation = NOT ACTIVE
```

After final required branch completes:

```text
Technical = COMPLETE
Financial = COMPLETE
        ↓
Join satisfied
        ↓
Evaluate Moderation Entry Conditions
        ↓
Moderation = ACTIVE
```

### Acceptance Criteria

1. Join evaluates configured predecessors.
2. Downstream Stage remains inactive while any required predecessor is incomplete.
3. Branch completion order does not matter.
4. Downstream Entry Conditions are evaluated after join satisfaction.
5. Downstream Stage activates once.
6. Duplicate events do not create duplicate Stage Instances.
7. Join-driven activation is audited.

### Done When

A configured join activates its downstream Stage exactly once after all prerequisites and Entry Conditions pass.

---
# Phase 11 — RFI

Implement:
- create RFI;
- applicant response;
- editable-field whitelist;
- expiry behaviour;
- correspondence history.

### Done When

RFI has one auditable lifecycle and can be initiated from permitted Stages.

---

# Phase 12 — SLA

Implement:
- DueAt;
- RFI pause/resume;
- Hold pause/resume;
- reminders;
- breach escalation;
- SLA reporting data.

### Done When

SLA timing is reliable and auditable.

---

# Phase 13 — Repeatable / Looping Stages

Implement:
- repeatable Stage definition;
- independent iterations;
- Disbursement tranches;
- Monitoring periods.

### Done When

Repeatable Stages are configuration-driven.

---

# Phase 14 — Applicant Application Lifecycle

Implement:
- create Application;
- autosave;
- completeness;
- document upload;
- submission;
- reference number;
- immutable snapshot;
- authoritative eligibility;
- Workflow Instance creation;
- submitted PDF;
- public status;
- withdrawal.

### Done When

Applicant submission starts the configured Workflow end-to-end.

---

# Phase 15 — Funding Call Publication & Public Lifecycle

Implement:
- Draft;
- Approved;
- Scheduled;
- Live;
- Closed;
- Archived;
- Suspended/Withdrawn where applicable;
- publication validation;
- scheduled publication;
- automatic closing;
- public archive;
- removal of Payload Funding Call ownership.

---

# Phase 16 — Cross-Cutting Capabilities

Implement:
- reason codes;
- workflow notification configuration;
- send log;
- immutable document version history;
- replacement that creates a new Document Version without overwriting the
  prior version;
- verification status, verifier, verification time and notes per Document
  Version;
- expiry and re-verification rules against the current Document Version;
- document replacement and verification audit events;
- concurrency protection;
- bulk allocation;
- bulk screening;
- bulk notifications.

### Done When

Cross-cutting workflow operations are auditable and safe under concurrent
use. Document replacement preserves every prior version, and verification is
recorded against the exact version that was reviewed.

---

# Phase 17 — Standard Client Seed

The canonical seed content and its evolving implementation status are
maintained in
[`SME_Fund_Standard_Workflow_Template.md`](SME_Fund_Standard_Workflow_Template.md).

The standard seed spans three connected lifecycles rather than placing all
client stages inside one Application Workflow:

1. Call Setup and Publication is seeded/configured through the Funding Call
   lifecycle from Phase 15.
2. Application Submission is seeded/configured through the applicant
   Application lifecycle from Phase 14.
3. The Application Workflow contains the remaining 12 client stages and
   starts at Administrative and Eligibility Screening after submission.

Seed as configuration:
- standard roles;
- 12 standard Application Workflow Stages, from Administrative and
  Eligibility Screening through Evaluation and Close-out;
- Funding Call setup/publication lifecycle configuration;
- applicant Application submission lifecycle configuration;
- reusable Forms;
- Funding Application Form;
- Task Definitions;
- Form bindings;
- context bindings;
- screening/contracting checklists;
- client-specified document requirements;
- Technical scoring structure;
- Financial Review structure;
- Due Diligence structure;
- Moderation structure;
- Committee structure;
- Approval structure;
- post-award Forms;
- standard Actions;
- standard Transitions;
- Entry/Exit/Transition Conditions;
- COI;
- public status mappings;
- notification hooks;
- reason codes.

Validate the seed using the same validators used for user-created configuration.

Then clone it into a test Funding Call and verify:
1. Funding Call approval, scheduling and publication;
2. Application draft, submission and immutable snapshot creation;
3. Workflow Instance creation directly at Administrative and Eligibility
   Screening;
4. screening;
5. parallel Technical + Financial;
6. join to Moderation;
7. Committee/Approval path, including delegated-authority value bands;
8. document replacement and per-version verification;
9. public status;
10. audit/task creation.

### Done When

The client standard process runs across the seeded Funding Call, applicant
Application and 12-stage Application Workflow configurations without
developer-specific runtime logic.

---

# Phase 18 — Final Administrator UI

Polish the underlying capabilities after they work:
- Form Builder;
- Condition Builder;
- Eligibility Builder;
- Workflow Designer;
- Stage/Task configuration;
- Form/context binding;
- version history;
- clone;
- approve;
- publish;
- retire.

---

# Phase 19 — Reporting Read Models

Implement:
- pipeline by Stage;
- ageing;
- turnaround;
- outcomes by reason code;
- reviewer workload;
- budget committed against envelope;
- SLA metrics;
- portfolio indicator performance where supported.

---

# 20. Codex Task Format

Every implementation task must include:

```text
Goal
Scope
Acceptance Criteria
Done When
```

---

# 21. Definition of Done

A task is done only when:
- implementation is complete;
- required migration exists;
- backend behaviour works;
- UI works where applicable;
- tests pass;
- manual test can be demonstrated;
- no unrelated refactor is introduced;
- Project Structure Contract is followed.
