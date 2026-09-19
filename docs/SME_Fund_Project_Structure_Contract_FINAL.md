# Namport — Project Structure Contract

## 1. Purpose

This document defines where SME Fund code belongs.

Codex must follow it whenever creating or moving files. Note that the goal is to finally end up with this structure but it does not means you should move or refactor everything in one go.

The codebase should be feature-first. Business functionality must not be scattered across global component, repository and schema folders.

---

# 2. Target Structure

```text
apps/
└── platform/
    └── src/
        ├── app/
        ├── modules/
        ├── platform/
        ├── shared/
        └── payload/
```

---

# 3. `src/app` — Routing and Composition

Use for:
- Next.js routes;
- layouts;
- pages;
- route groups;
- loading/error boundaries;
- API route entry points.

Preserve:

```text
(auth)
(public)
(portal)
(operations)
(payload)
api
```

Do not place business logic here.

A `route.ts` should:
1. parse input;
2. validate transport input;
3. check actor/access;
4. call an application service;
5. map output to HTTP.

Do not put:
- SQL;
- eligibility evaluation;
- workflow traversal;
- stage activation/completion;
- action semantics;
- automatic-transition logic

inside route/page files.

---

# 4. `src/modules` — Business Features

Required core modules:

```text
modules/
├── applications/
├── funding-calls/
├── forms/
├── conditions/
├── eligibility/
├── workflows/
├── businesses/
└── users/
audit/
reporting/
notifications/
```

Optional modules may be extracted later only when justified:

```text
tasks/
assignments/
documents/
rfi/
sla/
scoring/
```

Do not create optional modules upfront just to match a diagram.

---

# 5. Standard Module Shape

A substantial module may use:

```text
modules/<feature>/
├── domain/
├── engine/
├── application/
├── infrastructure/
├── api/
├── ui/
└── index.ts
```

Only create folders the module actually needs.

---

# 6. `domain/`

Use for business concepts and rules.

Examples:
- `WorkflowTemplate`;
- `WorkflowTemplateVersion`;
- `WorkflowStageDefinition`;
- `WorkflowTaskDefinition`;
- `WorkflowInstance`;
- `StageInstance`;
- `WorkflowTask`;
- `FormDefinition`;
- `FormVersion`;
- `Condition`;
- `ConditionGroup`;
- `EligibilityRuleSet`;
- `FundingCall`.

Domain code should not depend on React, Next.js, Payload, browser APIs or DB clients.

---

# 7. `engine/`

Use for deterministic execution logic.

Examples:

```text
forms/engine/
conditions/engine/
eligibility/engine/
workflows/engine/
```

Do not put UI or HTTP handling in engines.

---

# 8. `application/`

Use for use cases/orchestration.

Examples:

```text
create-workflow-template.ts
publish-workflow-version.ts
evaluate-eligibility.ts
activate-stage.ts
complete-stage.ts
execute-workflow-action.ts
create-funding-call.ts
submit-application.ts
```

Application logic coordinates domain, repositories, transactions, authorization and audit.

---

# 9. `infrastructure/`

Use for:
- Drizzle schema;
- repositories;
- persistence queries;
- feature-specific external adapters.

Example:

```text
modules/workflows/infrastructure/
├── workflow.schema.ts
├── workflow.repository.ts
└── workflow-runtime.repository.ts
```

Do not keep growing a global `src/db/repositories` dumping ground.

---

# 10. `api/`

Use for:
- Zod request schemas;
- response DTOs;
- transport contracts.

Transport types should not define the domain model.

---

# 11. `ui/`

Use for feature-specific React components/hooks.

Examples:

```text
modules/workflows/ui/
modules/forms/ui/
modules/eligibility/ui/
modules/applications/ui/
```

If a component only makes sense for one feature, keep it inside that feature.

---

# 12. Generic Form Module

```text
modules/forms/
├── domain/
├── engine/
├── application/
├── infrastructure/
├── api/
└── ui/
    ├── builder/
    └── renderer/
```

The same Form Engine must support:
- Funding Call Application Forms;
- Workflow Task Forms;
- other configurable Forms.

Do not build separate Form Engines.

---

# 13. Conditions Module

```text
modules/conditions/
├── domain/
├── engine/
│   ├── ConditionEngine.ts
│   ├── OperandResolver.ts
│   └── WorkflowDataResolver.ts
├── application/
├── infrastructure/
├── api/
└── ui/
    └── builder/
```

The Conditions Engine is shared by:
- Form visibility;
- Workflow Entry Conditions;
- Workflow Exit Conditions;
- Transition Conditions;
- Eligibility.

Do not duplicate condition evaluation in Workflow or Eligibility.

---

# 14. Workflow Module

Owns both definition and runtime, but keep them clearly separated.

Suggested:

```text
modules/workflows/
├── domain/
│   ├── definitions/
│   ├── runtime/
│   ├── tasks/
│   └── actions/
├── engine/
│   ├── WorkflowValidator.ts
│   ├── WorkflowGraphTraversal.ts
│   ├── StageActivationEvaluator.ts
│   ├── StageCompletionEvaluator.ts
│   ├── TransitionEvaluator.ts
│   └── AutomaticTransitionEngine.ts
├── application/
│   ├── definitions/
│   ├── runtime/
│   └── actions/
├── infrastructure/
│   ├── workflow.schema.ts
│   ├── workflow.repository.ts
│   └── workflow-runtime.repository.ts
├── api/
└── ui/
    ├── definitions/
    ├── designer/
    ├── runtime/
    └── tasks/
```

Keep distinct:

```text
WorkflowTemplateVersion != WorkflowInstance
WorkflowStageDefinition != StageInstance
WorkflowTaskDefinition != WorkflowTask
```

Do not create runtime classes such as:

```text
TechnicalAssessmentStage
FinancialReviewStage
ModerationStage
```

Stage behaviour comes from configuration.

---

# 15. Funding Calls Module

Owns:
- Funding Call metadata;
- dates;
- budget/funding limits;
- status;
- Form Version binding;
- Eligibility Ruleset Version binding;
- Workflow Template Version binding;
- publication validation;
- public Funding Call read model.

Payload must not be the source of truth.

---

# 16. Applications Module

Owns:
- Application Draft;
- autosave;
- submitted values;
- immutable snapshot;
- declarations;
- application documents;
- reference number;
- applicant/admin Application UI.

---

# 17. Businesses Module

Owns reusable applicant organisation/business profiles.

---

# 18. Users Module

Owns SME Fund user administration and business-facing role/access management.

Low-level authentication stays under `platform/auth`.

---

# 19. Workflow Tasks / Assignment

Keep under `workflows` initially.

This includes:
- Task lifecycle;
- assignment;
- reviewer count;
- completion threshold;
- quorum;
- COI;
- reassignment;
- delegation;
- advanced allocation.

Extract later only if it becomes independently complex.

---

# 20. RFI / SLA

Keep under Workflow runtime initially unless complexity justifies extraction.

Do not duplicate RFI or SLA logic across modules.

---

# 21. `src/platform`

Use for cross-cutting technical infrastructure:

```text
platform/
├── database/
├── auth/
├── storage/
├── monitoring/
├── jobs/
└── config/
```

Add `notifications/` when delivery infrastructure is implemented.

---

# 22. `platform/database`

Shared DB bootstrap only:

```text
client.ts
transaction.ts
schema.ts
```

Module repositories do not belong here.

---

# 23. `platform/auth`

Authentication/authorization infrastructure:
- Firebase;
- session;
- current user;
- CSRF;
- capability checks.

Feature-specific business permission decisions remain in the owning module.

---

# 24. `platform/storage`

Raw object/file storage:
- Google Cloud Storage adapter;
- upload/download;
- object keys/prefixes.

Business document requirements/versioning stay in the owning business capability.

---

# 25. `platform/jobs`

Scheduled/background entry points.

Examples:

```text
publish-scheduled-calls.ts
close-expired-funding-calls.ts
process-automatic-transitions.ts
process-sla-breaches.ts
send-reminders.ts
```

Jobs call application services.

Do not duplicate domain logic in jobs.

---

# 26. `src/shared`

```text
shared/
├── ui/
├── hooks/
├── types/
└── utils/
```

Only genuinely reusable non-business code belongs here.

Examples for `shared/ui`:
- Button;
- PageHeader;
- DataTable;
- Tabs;
- EmptyState;
- ConfirmationDialog;
- MoneyField;
- Pagination.

Feature UI stays in the feature module.

---

# 27. Payload Boundary

Payload owns:

```text
News
FAQs
Resources
Events
Pages
Media
Homepage/editorial content
Header
Footer
Site settings
```

Payload does not own:

```text
Funding Calls
Eligibility Rules
Application Forms
Workflow Definitions
Workflow Runtime
Applications
Assessments
```

Existing Payload Funding Calls are legacy until the new Funding Call domain is operational.

---

# 28. Database Rules

New/migrated module-owned tables live with their module.

Example:

```text
modules/forms/infrastructure/form.schema.ts
modules/conditions/infrastructure/condition.schema.ts
modules/workflows/infrastructure/workflow.schema.ts
modules/funding-calls/infrastructure/funding-call.schema.ts
```

Shared DB configuration stays under `platform/database`.

---

# 29. Workflow Persistence Rules

Definition-time:

```text
WorkflowTemplate
WorkflowTemplateVersion
WorkflowStageDefinition
WorkflowTaskDefinition
WorkflowAction
WorkflowTransition
Conditions
Form Bindings
```

Runtime:

```text
WorkflowInstance
StageInstance
WorkflowTask
Assignment
Form Response
Action Execution
Transition Execution
Audit
```

Do not use the same entity/table for both definition and runtime state.

---

# 30. Stable Key Rules

Never resolve business values by array position.

Wrong:

```text
stage[3].fields[2]
```

Correct:

```text
application.requested_amount
stage.financial_review.recommended_amount
stage.due_diligence.risk_rating
```

Same field key in different Stage/Task responses remains separately auditable.

---

# 31. API Naming

Prefer domain-oriented routes:

```text
/api/funding-calls
/api/forms
/api/workflows
/api/applications
```

Explicit runtime operations may use:

```text
POST /api/workflows/{id}/actions/{actionKey}
POST /api/tasks/{id}/claim
POST /api/tasks/{id}/complete
```

Public:

```text
/api/public/funding-calls
```

Do not create duplicate APIs only because one screen is Admin and another is Portal unless the contract is genuinely different.

---

# 32. Testing

Keep:

```text
tests/
├── unit/
├── integration/
└── e2e/
```

Mirror feature ownership:

```text
tests/unit/forms/
tests/unit/conditions/
tests/unit/eligibility/
tests/unit/workflows/
```

Workflow tests should separate:

```text
definitions/
runtime/
actions/
tasks/
parallel/
```

Every implementation task must update/add relevant tests.

---

# 33. Migration Strategy

Do not reorganize the entire repository in one task.

Rules:
1. New code follows this contract immediately.
2. Existing code moves when that feature is actively changed.
3. Do not move unrelated files during a focused task.
4. Remove old duplicate code after successful migration.

Recommended migration order:

```text
1. Workflow definition code
2. Forms
3. Conditions
4. Eligibility
5. Funding Calls
6. Workflow runtime
7. Applications
8. Optional extracted capabilities
```

---

# 34. Existing Horizontal Folders to Phase Out

Gradually move away from:

```text
src/components/admin/*
src/components/applicant/*
src/db/repositories/*
src/db/schema/*
src/data/*
```

Do not delete them wholesale before migration is complete.

---

# 35. Forbidden Patterns

Codex must avoid:

```text
Business logic in page.tsx
Business logic in route.ts
SQL in React components
Global feature-specific component dumping ground
Global repository dumping ground
Global schema dumping ground
Duplicate Conditions Engines
Separate Form Engines for application/task Forms
Funding Call business configuration in Payload
Hard-coded client workflow stages
Stage movement based on display order
A single currentStageId model that cannot support parallel stages
Cross-stage data access by array/index position
Action semantics implemented only in UI
Large unrelated refactors during focused tasks
```

---

# 36. Codex File Placement Checklist

Before creating a file, determine:

1. Which business feature owns it?
2. Is it domain, engine, application, infrastructure, API or UI?
3. Is it truly shared?
4. Does an existing file already own this responsibility?
5. Will it duplicate logic?
6. Is a new top-level module really necessary?
7. Is it design-time or runtime code?
8. Is it accidentally hard-coding a client Stage?

---

# 37. Compliance

Every implementation task must comply with:

1. `SME_Fund_Implementation_Plan.md`
2. `SME_Fund_Project_Structure_Contract.md`

When existing code conflicts:
- new code follows the target structure;
- migrate only related legacy code;
- avoid duplicate implementations;
- avoid unrelated cleanup;
- document temporary compatibility layers where unavoidable.
