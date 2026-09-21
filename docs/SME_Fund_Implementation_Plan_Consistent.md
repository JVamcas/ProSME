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

Implement:
- Approve / Advance;
- Reject;
- Return/Rework;
- Refer;
- Hold/Resume;
- Withdraw;
- Defer;
- Escalate;
- Request Information hook;
- Automatic Transition Framework.

All Actions must:
- validate server-side;
- use configured targets;
- preserve audit history;
- never assume Stage order.

---

# Phase 9 — Workflow Tasks, Assignment & Quorum

Implement:
- manual assignment;
- role-based assignment;
- multiple reviewer Tasks;
- completion threshold;
- quorum;
- COI gate;
- reassignment;
- delegation by configured authority/value bands;
- amount-based resolution of the required delegated approver;
- server-side validation that the acting approver's band covers the decision
  amount;
- round-robin;
- expertise;
- workload;
- self-assignment pool.

### Done When

Task ownership, reviewer isolation, assignment history and value-band
delegation work reliably. An approval cannot be completed by an actor whose
configured authority band does not cover the decision amount.

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
