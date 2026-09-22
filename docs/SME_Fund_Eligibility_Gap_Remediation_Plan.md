# SME Fund Eligibility Gap Remediation Plan

## Document status

- Status: implementation supplement
- Date: 22 September 2026
- Applies to: Eligibility, Conditions, Forms, Funding Calls and Workflow modules
- Primary references:
  - `ME-Workflow-Engine-Specification.docx`, especially sections 4.3, 6, 7 and 12;
  - `SME_Fund_Implementation_Plan_Consistent.md`, especially phases 5, 6 and 7;
  - `SME_Fund_Standard_Workflow_Template.md`, especially Administrative and Eligibility Screening;
  - `SME_Fund_Project_Structure_Contract_FINAL.md`.

This document supplements the main implementation plan. It does not replace the
project structure contract or change the fixed module boundaries.

---

# 1. Purpose

Close the remaining gaps between the current Eligibility implementation and the
client requirement that:

1. each Funding Call binds one exact Eligibility Ruleset Version;
2. the same Ruleset Version supports a public advisory Self Check and an
   authoritative Screening evaluation;
3. eligibility fields, questions, thresholds, evidence requirements and
   outcomes remain configurable rather than hard-coded;
4. Screening evaluates verified evidence rather than applicant assertions;
5. published configuration and completed evaluations remain immutable and
   auditable.

---

# 2. Non-negotiable design rules

## 2.1 Eligibility is configuration

Application code must not hard-code:

- a fixed eligibility-question list;
- programme-specific field keys;
- thresholds such as ownership percentage or operating months;
- hard-fail, soft-fail or warning classifications;
- applicant-facing failure messages;
- execution modes;
- required certificates or registrations;
- assumptions that every Funding Call uses the same criteria.

Programme criteria may be supplied as reviewed seed configuration. Seeded
configuration remains editable through Draft versions and must execute through
the same runtime as administrator-created configuration.

## 2.2 The shared Conditions Engine remains authoritative

Eligibility must continue to reuse the Generic Conditions model and evaluator.
Do not introduce eligibility-specific operators, grouping or expression logic.

The Conditions UI must support the persisted operand model:

- field compared with a constant;
- field compared with another field;
- computed numeric operands using add, subtract, multiply and divide;
- AND, OR and nested groups.

Field-to-field and computed operand editing was added to the shared Condition
Builder on 22 September 2026. Further work in this plan must extend the dynamic
field catalogue and runtime resolution, not duplicate that UI.

## 2.3 Binding exposes definitions, not values

Binding versions to a Draft Funding Call makes compatible field definitions
available to builders. It does not copy runtime values into an Eligibility
Ruleset.

Runtime values are resolved only when a Self Check or Screening evaluation is
executed.

## 2.4 Self Check and Screening have different trust levels

- Self Check uses applicant-supplied answers and is advisory.
- Screening uses submitted application data, verified evidence, completed
  screening tasks and configured integration results.
- A Self Check must never create an authoritative outcome.
- A Screening outcome must never treat an unverified applicant assertion as
  verified evidence.

## 2.5 Published versions are immutable

Published Form, Workflow and Eligibility Ruleset Versions cannot be modified.
Existing Applications and evaluations retain the exact versions originally
bound to them.

---

# 3. Current baseline

The current implementation already provides:

- versioned Eligibility Rulesets;
- Draft, Published and Retired lifecycle states;
- Funding Call to Ruleset Version binding;
- rule execution modes: Self Check, Screening and Both;
- hard fail, soft fail and warning outcomes;
- reason codes and applicant-facing messages;
- shared Condition evaluation;
- AND, OR and grouped conditions;
- field-to-constant, field-to-field and computed operand editing;
- public advisory evaluation;
- authoritative-outcome persistence;
- ruleset testing without creating an authoritative result.

---

# 4. Gap summary

| Gap | Current effect | Target |
| --- | --- | --- |
| Eligibility fields are mostly limited to bound Application Form and Funding Call fields | Verified screening facts cannot be configured | Dynamic, binding-driven Eligibility Input catalogue |
| Several Screening values are hard-coded in a service and some resolve to `null` | Screening cannot evaluate configured evidence reliably | Generic source adapters and resolver |
| Document fields are excluded from Eligibility | Presence, verification and expiry cannot drive rules | Generic document facts from configured requirements |
| Screening forms and checklists are not exposed to Eligibility | Manual verification results cannot drive rules | Selected prerequisite outputs available to Screening rules |
| Self Check exposes only boolean, date, number and text | Yes/No/NA, select options and explanatory content are lost | Versioned Self Check question definitions |
| Self Check only accepts referenced `application.*` fields | A single logical rule cannot resolve applicant and verified values differently | Configured Eligibility Inputs with mode-specific sources |
| Authoritative evaluation runs during submission | Result is produced before staff verification | Workflow Screening task executes authoritative evaluation |
| External register results are unavailable | Registry checks remain outside rules | Configured integration-output sources with manual fallback |
| Draft key changes can invalidate rules | Broken references may be published | Impact analysis, atomic draft updates and publication validation |

---

# 5. Target configuration model

## 5.1 Funding Call configuration boundary

A Funding Call binds exact versions:

```text
Funding Call
├── Application Form Version
├── Eligibility Ruleset Version
├── Workflow Template Version
├── configured Document Requirements
└── configured Integration Bindings
```

The Dynamic Eligibility Field Registry is assembled from these exact bindings.
It is not a global list of programme-specific fields.

## 5.2 Eligibility Input Definition

Introduce a version-owned `EligibilityInputDefinition` concept. Each input is
administrator configuration and contains at minimum:

- immutable identifier;
- stable key unique inside the Ruleset Version;
- administrator-facing label;
- data type;
- supported execution modes;
- Self Check source configuration where applicable;
- Screening source binding where applicable;
- ordering and optional grouping metadata;
- audit metadata.

Illustrative shape only:

```ts
type EligibilityInputDefinition = {
  id: string;
  stableKey: string;
  label: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE";
  availableIn: ("SELF_CHECK" | "SCREENING")[];
  selfCheck?: SelfCheckQuestionDefinition;
  screening?: EligibilitySourceBinding;
};
```

Neither the keys nor the definitions shown in examples are system constants.
Administrators create them or receive them through reviewed seed data.

## 5.3 Mode-specific source bindings

An Eligibility Input may resolve from different sources in each mode while the
rule continues to reference one logical input.

```text
eligibility.<configured-input-key>
├── Self Check source: applicant question answer
└── Screening source: verified configured evidence
```

Supported Screening source kinds must be extensible and initially include:

- Application Form field;
- Funding Call field;
- Workflow screening-form field;
- Screening checklist item;
- Document Requirement fact;
- Manual assessment result;
- configured integration output.

Source kinds are platform capabilities. Programme-specific source instances are
configuration records.

## 5.4 Dynamic field descriptor

Every field offered to the Condition Builder must be described dynamically:

```ts
type EligibilityFieldDescriptor = {
  path: string;
  label: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE";
  availableIn: ("SELF_CHECK" | "SCREENING")[];
  sourceDefinitionId: string;
  sourceVersionId: string;
  sourceKind: string;
};
```

The exact TypeScript shape may differ, but the implementation must retain the
same semantics.

## 5.5 Stable identity and renaming

- Display labels may be renamed freely in Draft configuration.
- Stable keys may be changed only in Draft configuration.
- Before a Draft key changes, the system must identify every Draft rule that
  references it.
- The change must either update those Draft references atomically or be blocked
  with an explicit dependency report.
- Publication must fail when any reference cannot be resolved.
- Published keys, identifiers and source bindings are immutable.
- A change after publication creates a new version.

Rules must never resolve fields by display label.

## 5.6 Workflow-field exposure

Binding a Workflow Template Version must not expose every Workflow field to
Eligibility.

Only a configured output may be exposed when:

1. it belongs to a Screening task or another explicitly allowed prerequisite;
2. it is completed before authoritative Eligibility executes;
3. its type is supported by the Conditions Engine;
4. its definition belongs to the exact bound Workflow Version;
5. using it does not create a circular task dependency.

Self Check rules cannot reference Workflow runtime values because no Workflow
Instance exists at Self Check time.

---

# 6. Delivery sequence

# E1 — Eligibility configuration decision matrix

## Goal

Provide a configurable business-owned baseline without embedding it in code.

## Scope

For every proposed seed criterion capture:

- business description;
- stable seed key;
- input type;
- execution mode;
- failure type;
- reason code;
- applicant-facing message;
- Self Check question configuration;
- Screening evidence source;
- manual or integration verification method.

## Rules

- The matrix is reviewed configuration input, not a source-code enum.
- Unknown business decisions remain explicitly marked TBD.
- Optional criteria must not be silently converted into hard failures.

## Acceptance Criteria

1. Business owners can approve each proposed seed criterion independently.
2. Every Both-mode criterion identifies sources for both modes.
3. Every Screening source identifies evidence or a manual decision owner.
4. Failure type and reason code are explicit.
5. The matrix can be converted into seed data without changing evaluator code.

## Done When

The programme baseline can be seeded entirely as versioned configuration.

---

# E2 — Dynamic Eligibility Input storage

## Goal

Persist version-owned configurable Eligibility Inputs and their mode-specific
source bindings.

## Scope

- Eligibility Input Definition storage;
- Self Check question metadata;
- Screening source binding;
- input ordering and grouping;
- exact source-definition and source-version references;
- Draft editing and Published immutability;
- repeatable migration.

## Rules

- Do not add programme-specific columns.
- Do not add one table per eligibility lifecycle state.
- Input definitions belong to an exact Ruleset Version.
- Deleting a referenced Draft input must report affected rules.
- Published input definitions cannot be edited or removed.

## Acceptance Criteria

1. An administrator can add an input to a Draft Ruleset Version.
2. The input type and mode availability persist.
3. Self Check and Screening bindings persist independently.
4. Source version references persist.
5. Published inputs are immutable.
6. Invalid or orphaned bindings cannot be published.
7. Migration and repository tests pass.

## Done When

Eligibility input requirements can be configured without code changes.

---

# E3 — Binding-driven Eligibility Field Registry

## Goal

Build the Condition Builder catalogue from the exact versions bound to the
Draft Funding Call and Ruleset Version.

## Scope

Discover compatible fields from:

- bound Application Form Version;
- Funding Call definition;
- Eligibility Input Definitions;
- permitted Workflow Screening outputs;
- configured Document Requirements;
- configured Integration Bindings.

## Rules

- The registry is assembled on demand; it is not a hard-coded array.
- A field records its type, availability modes and source provenance.
- Multiple Funding Call bindings expose only compatible shared definitions or
  require call-specific Ruleset Versions.
- Internal-only fields are never exposed to the public Self Check contract.
- Unavailable fields cannot be hidden behind renamed imports or raw JSON.

## Acceptance Criteria

1. Adding a compatible bound form field makes it available without a release.
2. Adding an eligible Screening output makes it available only to Screening.
3. Removing or changing a Draft source reports affected Draft rules.
4. Type-incompatible field comparisons are rejected.
5. Both-mode rules require values resolvable in both modes.
6. Publication rejects unresolved, stale or circular references.
7. Registry tests cover every supported source kind.

## Done When

The Eligibility Builder offers only valid fields derived from bound versioned
configuration.

---

# E4 — Generic document and checklist facts

## Goal

Allow Eligibility rules to use evidence status without hard-coding document
names or checklist items.

## Scope

For each configured Document Requirement expose generic typed facts such as:

- present;
- verified;
- verification status;
- valid-until date;
- expired at evaluation time;
- latest accepted version identifier.

For each configured Screening checklist item expose its configured response and
completion status where permitted.

## Rules

- Facts reference immutable requirement/item identifiers, not display text.
- Document replacement creates a new version and never overwrites evidence.
- Verification belongs to the exact Document Version reviewed.
- Expiry uses the authoritative evaluation timestamp.
- A missing verification result is distinct from a failed verification.
- Applicant upload presence alone cannot imply verified validity.

## Acceptance Criteria

1. Rules can test configured document presence.
2. Rules can test verification status.
3. Rules can test expiry relative to evaluation time.
4. Rules can use configured checklist results.
5. Labels may change without changing persisted evidence identity.
6. Tests cover missing, pending, valid, expired and replaced documents.

## Done When

Configured evidence can be evaluated generically by the shared Conditions
Engine.

---

# E5 — Mode-specific Eligibility data resolution

## Goal

Resolve the same logical Eligibility Input from the correct source for Self
Check and Screening.

## Scope

- Self Check input resolver;
- authoritative Screening input resolver;
- source-adapter interface;
- evaluation timestamp;
- missing-value semantics;
- evaluated-value provenance;
- test-screen sample resolver.

## Rules

- The evaluator receives resolved values and remains deterministic.
- The evaluator does not query databases or external services.
- Source adapters live outside the engine.
- Screening records the source record/version used for each evaluated value.
- Both-mode rules must retain identical condition logic across executions.
- Resolution errors cannot silently become false business answers.

## Acceptance Criteria

1. One Both-mode rule evaluates an applicant answer in Self Check.
2. The same rule evaluates verified evidence in Screening.
3. Evaluated values record source provenance for Screening.
4. Missing, unavailable and invalid values are distinguishable.
5. Resolver tests cover every configured source kind.
6. No programme-specific field path is embedded in resolver code.

## Done When

Self Check and Screening share one Ruleset without sharing the same trust
source.

---

# E6 — Eligibility Builder completion

## Goal

Expose the dynamic inputs and supported operand model through the visual
Eligibility Builder.

## Scope

- mode-filtered field catalogue;
- field-to-constant comparisons;
- field-to-field comparisons;
- computed numeric operands;
- field provenance and source labels;
- reference-impact warnings;
- publication validation preview.

## Rules

- Continue to reuse the Generic Condition Builder.
- Do not introduce an Eligibility-only expression evaluator.
- Computed operands use only type-compatible numeric fields or constants.
- List and range operators retain their existing value-shape constraints.
- Internal source identifiers are not exposed as applicant content.

## Acceptance Criteria

1. Administrators can select constant, field or calculation operands.
2. Field selections are filtered by compatible type.
3. Fields show their source and mode availability.
4. Both-mode incompatibility is visible before save/publication.
5. Existing stored constant rules remain editable.
6. Builder round-trip tests prove no operand structure is lost.

## Done When

Every supported persisted condition can be configured visually with valid
dynamic fields.

---

# E7 — Configurable public Self Check questions

## Goal

Render public questions from the bound Ruleset Version without exposing
internal Screening configuration.

## Scope

Question configuration supports:

- boolean Yes/No;
- Yes/No/Not applicable;
- text;
- number and percentage;
- date;
- single select;
- multi-select where supported by the Conditions model;
- label, help text and option descriptions;
- section, order and progress metadata;
- applicant-safe validation;
- local answer persistence where approved.

## Rules

- Questions come from Self Check-enabled input definitions.
- The public contract excludes rule internals, reason codes and Screening-only
  fields.
- Question identifiers are configuration-version-specific.
- A stale configuration token requires the user to review current questions.
- Result remains advisory and creates no authoritative outcome.
- Public UI must remain usable on mobile and meet accessibility requirements.

## Acceptance Criteria

1. Question labels and help text render from configuration.
2. Configured options retain their labels and values.
3. Yes/No/NA is distinct from a boolean answer.
4. Question order and progress are deterministic.
5. Only values required by Self Check/Both rules are collected.
6. Screening-only metadata is absent from public responses.
7. Accessibility and transport tests pass.

## Done When

Administrators can change the public Self Check experience through a new
Ruleset Version without a deployment.

---

# E8 — Authoritative Screening workflow execution

## Goal

Run authoritative Eligibility only after configured Screening prerequisites are
complete.

## Scope

- `AUTHORITATIVE_ELIGIBILITY` workflow task/command;
- prerequisite validation;
- server-side permission checks;
- Screening-mode resolution;
- atomic outcome and audit persistence;
- workflow condition exposure;
- RFI and re-evaluation policy;
- removal of authoritative evaluation from applicant submission.

## Rules

- Submission creates the Workflow Instance but not a verified Eligibility
  decision.
- Authoritative evaluation runs inside Administrative and Eligibility
  Screening.
- Required document/checklist/manual-verification tasks complete first.
- The Application's bound Ruleset Version must match the Funding Call version
  captured at submission.
- Re-evaluation never overwrites prior outcomes; it creates an auditable new
  evaluation according to configured policy.
- Multi-record writes use one transaction.

## Acceptance Criteria

1. Application submission does not claim an authoritative Screening result.
2. Screening evaluation cannot run before prerequisites complete.
3. Screening uses the exact bound Ruleset Version.
4. Hard failures prevent the configured advance action.
5. Soft failures require the configured manual decision.
6. Warnings do not automatically reject.
7. Outcome, provenance, actor, timestamp and rule results persist atomically.
8. Allowed, denied and context-mismatch authorization tests pass.

## Done When

The standard Screening stage produces a verified, auditable Eligibility outcome
that Workflow can consume.

---

# E9 — Configurable integration outputs

## Goal

Allow external verification results to feed Screening rules without coupling
rules to a particular provider.

## Scope

- integration definition and version;
- declared output schema;
- Funding Call/Workflow binding;
- execution and retry policy;
- raw-response retention policy;
- normalized configured outputs;
- manual-verification fallback.

## Rules

- Provider names and output fields are configuration/integration metadata, not
  Eligibility rule constants.
- Rules consume declared typed outputs through source bindings.
- Network calls occur before evaluation, never inside the deterministic engine.
- Failed or unavailable lookup is distinct from a negative result.
- Secrets remain in approved secret storage.

## Acceptance Criteria

1. A configured integration publishes a typed output catalogue.
2. Eligible outputs appear in the Screening field registry.
3. Rules remain unchanged when an equivalent provider adapter replaces another.
4. Timeout, retry, unavailable and negative results are distinguishable.
5. Manual fallback can satisfy the same configured input where permitted.

## Done When

External verification can be introduced without changing Eligibility evaluator
code or existing rule semantics.

---

# E10 — Migration, seed and end-to-end verification

## Goal

Move existing Eligibility configuration to the dynamic model and prove the full
lifecycle.

## Scope

- repeatable database migration;
- migration of existing Draft rules where possible;
- explicit report for rules that cannot be mapped;
- reviewed default Ruleset seed;
- Funding Call bindings;
- end-to-end Self Check and Screening scenarios;
- audit and version-retention verification.

## Rules

- Do not silently reinterpret existing rules.
- Published historical evaluations remain readable.
- Seed logic is idempotent.
- Real applicant data is not used in fixtures.
- Unresolved migrated rules block publication.

## Acceptance Criteria

1. Existing supported rules migrate without operand loss.
2. Unsupported references are reported explicitly.
3. The default baseline is seeded as configuration.
4. A test Funding Call runs the same Both-mode rule in Self Check and Screening.
5. Screening uses verified evidence rather than the prior Self Check answer.
6. A later Ruleset Version does not change an existing Application outcome.
7. Audit, authorization, architecture, file-size, lint, typecheck, test and build
   gates pass with recorded evidence.

## Done When

Eligibility is configurable, version-bound, mode-correct and auditable from
public Self Check through authoritative Screening.

---

# 7. Publication validation

A Funding Call or Eligibility Ruleset Version must not publish when:

- a referenced field or source definition does not exist;
- a source belongs to a different unbound version;
- a Self Check rule references a Screening-only input;
- a Screening rule references a Self Check-only input;
- a Both-mode rule cannot resolve in both modes;
- operand types are incompatible;
- a configured Workflow output occurs after authoritative evaluation;
- a circular Workflow dependency exists;
- a required integration output has no bound integration or allowed fallback;
- a Draft key change left an unresolved reference;
- a public question lacks required applicant-safe presentation metadata.

Publication validation must report actionable configuration paths and labels,
not only internal identifiers.

---

# 8. Runtime sequence

## 8.1 Public Self Check

```text
Resolve public Funding Call
→ resolve exact bound Ruleset Version
→ assemble Self Check input definitions
→ collect configured answers
→ resolve eligibility input values in SELF_CHECK mode
→ evaluate SELF_CHECK/BOTH rules
→ return applicant-safe advisory guidance
→ persist no authoritative outcome
```

## 8.2 Application submission

```text
Validate application completeness
→ validate required submission documents are present
→ bind exact Form, Ruleset and Workflow Versions
→ create submission and Workflow Instance atomically
→ enter Administrative and Eligibility Screening
```

Application submission does not perform verified Screening.

## 8.3 Authoritative Screening

```text
Complete configured completeness checks
→ verify configured document versions
→ complete configured manual assessments/lookups
→ resolve eligibility input values in SCREENING mode
→ evaluate SCREENING/BOTH rules
→ persist evaluation, provenance and audit atomically
→ expose outcome to Workflow conditions
→ advance, reject, request information or refer as configured
```

---

# 9. Required test matrix

## Configuration tests

- dynamic input creation and editing;
- Draft rename impact analysis;
- Published immutability;
- source-version compatibility;
- mode availability validation;
- circular dependency rejection;
- publication blocking.

## Builder tests

- field-to-constant round trip;
- field-to-field round trip;
- computed left and right operands;
- type filtering;
- grouped rules;
- existing-rule backward compatibility;
- source and mode labelling.

## Self Check tests

- every supported public response type;
- question order, help text and options;
- stale configuration token;
- applicant-safe result projection;
- no authoritative persistence;
- no Screening-only field disclosure.

## Screening tests

- verified document facts;
- missing versus invalid evidence;
- expiry at authoritative evaluation time;
- manual assessment output;
- integration result and unavailable lookup;
- hard fail, soft fail and warning;
- permission denied and resource-context mismatch;
- atomic outcome/audit persistence;
- re-evaluation history.

## Versioning tests

- exact versions captured at submission;
- later Form, Ruleset or Workflow versions do not affect existing Applications;
- historical outcomes remain readable;
- cloned configuration receives new Draft identities.

---

# 10. Recommended implementation order

1. E1 — Eligibility configuration decision matrix.
2. E2 — Dynamic Eligibility Input storage.
3. E3 — Binding-driven Eligibility Field Registry.
4. E4 — Generic document and checklist facts.
5. E5 — Mode-specific Eligibility data resolution.
6. E6 — Eligibility Builder completion.
7. E7 — Configurable public Self Check questions.
8. E8 — Authoritative Screening workflow execution.
9. E9 — Configurable integration outputs.
10. E10 — Migration, seed and end-to-end verification.

E9 may initially use manual verification adapters when external-system access is
not yet available. That must not change the configured rule or Eligibility Input
identity.

---

# 11. Final completion criteria

This remediation is complete only when:

1. a new eligibility criterion can be configured without modifying source code;
2. a new application, document, checklist or supported integration field can be
   selected through binding-driven configuration;
3. one Both-mode rule evaluates an applicant answer in Self Check and verified
   evidence in Screening;
4. no authoritative outcome is created during applicant submission;
5. authoritative evaluation runs in the configured Screening workflow after
   its prerequisites;
6. all field references are version-compatible and publication-validated;
7. public contracts expose no internal rule or Screening data;
8. existing Applications retain their original version-bound behaviour;
9. evaluation evidence and provenance are auditable;
10. required quality gates pass with recorded evidence.
