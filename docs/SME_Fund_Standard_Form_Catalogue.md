# SME Fund Standard Form Catalogue

## 1. Purpose

This document records the proposed standard forms derived from the M&E
Workflow Engine Specification dated 17 September 2026. The forms are seeded
as editable draft Form Version 1 records for administrator and client review.
Their intended Workflow Task bindings are maintained in
[`SME_Fund_Standard_Workflow_Template.md`](SME_Fund_Standard_Workflow_Template.md).

The catalogue deliberately separates:

- data captured through a generic form;
- scoring configuration;
- checklists;
- document requirements;
- workflow actions and decisions;
- assignments, conflict-of-interest gates and audit data; and
- runtime context supplied by a form binding.

Required and optional settings, validation limits and option lists in this
catalogue are reasonable baseline proposals. Administrators may amend them
before publication. Once published, a Form Version is immutable and changes
must be made through a new draft version.

## 2. Seed approach

The seed creates only forms marked Ready. It creates Draft versions and does
not publish or bind them to Workflow Task Definitions. Re-running the seed
does not overwrite an existing Form Definition, its draft or client changes.
Seeded definitions and versions are attributed to the disabled, non-login
PostgreSQL principal named System. Forms created interactively continue to
record the authenticated administrator who created them.

The standard deployment seed command runs the Payload content seed, the
application-owned form seed and the standard workflow seed. The form-only
command is `db:seed:forms`; the workflow-only command is `db:seed:workflow` in
the platform package. The Draft workflow binds the latest applicable standard
Form Version, preferring Published over Draft. A Draft binding becomes runtime
eligible when that same Form Version is reviewed and published.

Forms marked Deferred require repeatable structured inputs that the current
Generic Form Engine does not yet support.

The client specification describes 14 end-to-end business stages. The
standard executable Application Workflow contains 12 stages, beginning with
Administrative and Eligibility Screening. Call Setup and Publication is owned
by the Funding Call lifecycle, while Application Submission is owned by the
applicant Application lifecycle and creates the Workflow Instance. Forms in
this catalogue may support any of those three connected lifecycles without
moving the first two activities into the Application Workflow.

## 3. Ready forms

### 3.1 Technical Review Form

Code: TECHNICAL_REVIEW

| Section | Field key | Label | Type | Required | Proposed validation |
| --- | --- | --- | --- | --- | --- |
| Assessment commentary | STRENGTHS | Strengths | Textarea | Yes | — |
| Assessment commentary | WEAKNESSES | Weaknesses | Textarea | Yes | — |
| Assessment commentary | REVIEWER_CONFIDENCE_RATING | Reviewer confidence rating | Number | Yes | 1 to 5 |
| Recommendation | RECOMMENDED_AMOUNT | Recommended amount | Currency | No | Minimum 0 |
| Recommendation | RECOMMENDED_CONDITIONS | Recommended conditions | Textarea | No | — |
| Recommendation | ADDITIONAL_COMMENTS | Additional comments | Textarea | No | — |

Criterion scores and weighted totals belong to scoring configuration.
Reviewer allocation and conflict-of-interest declarations are not form fields.

### 3.2 Due Diligence and Risk Form

Code: DUE_DILIGENCE_RISK

| Section | Field key | Label | Type | Required | Proposed options or behaviour |
| --- | --- | --- | --- | --- | --- |
| Verification | ENTITY_VERIFICATION_RESULTS | Entity verification results | Textarea | Yes | — |
| Verification | GOVERNANCE_VERIFICATION_RESULTS | Governance verification results | Textarea | Yes | — |
| Verification | CAPACITY_ASSESSMENT | Capacity assessment | Textarea | Yes | — |
| Verification | COMPLIANCE_SCREENING_RESULTS | Compliance screening results | Textarea | Yes | — |
| Verification | DEBARMENT_SCREENING_RESULTS | Debarment screening results | Textarea | Yes | — |
| Risk ratings | FINANCIAL_RISK_RATING | Financial risk rating | Single select | Yes | Low; Medium; High; Critical |
| Risk ratings | DELIVERY_RISK_RATING | Delivery risk rating | Single select | Yes | Low; Medium; High; Critical |
| Risk ratings | GOVERNANCE_RISK_RATING | Governance risk rating | Single select | Yes | Low; Medium; High; Critical |
| Risk ratings | FRAUD_RISK_RATING | Fraud risk rating | Single select | Yes | Low; Medium; High; Critical |
| Risk ratings | OVERALL_RISK_RATING | Overall risk rating | Single select | Yes | Low; Medium; High; Critical |
| Mitigation | RISK_MITIGATION_MEASURES | Risk mitigation measures | Textarea | Yes | — |
| Mitigation | ADDITIONAL_VERIFICATION_REQUIRED | Is additional verification required? | Yes/No | Yes | — |
| Mitigation | ADDITIONAL_VERIFICATION_DETAILS | Additional verification details | Textarea | Yes when visible | Visible when additional verification is required |

Previous-grant performance is supplied as read-only context where available.

### 3.3 Moderation Form

Code: MODERATION

| Section | Field key | Label | Type | Required | Proposed behaviour |
| --- | --- | --- | --- | --- | --- |
| Moderation | SCORE_ADJUSTED | Was the consolidated score adjusted? | Yes/No | Yes | — |
| Moderation | SCORE_ADJUSTMENT | Score adjustment | Number | Yes when visible | Visible when score was adjusted |
| Moderation | ADJUSTMENT_JUSTIFICATION | Adjustment justification | Textarea | Yes when visible | Visible when score was adjusted |
| Moderation | PROVISIONAL_ALLOCATION | Provisional allocation | Currency | No | Minimum 0 |
| Moderation | MODERATION_COMMENTS | Moderation comments | Textarea | No | — |

The consolidated score and rank are read-only workflow context. Panel
attendance and declarations are separate governance records.

### 3.4 Committee Review Form

Code: COMMITTEE_REVIEW

| Section | Field key | Label | Type | Required | Proposed validation |
| --- | --- | --- | --- | --- | --- |
| Committee record | AGENDA_ITEM | Agenda item | Text | Yes | — |
| Committee record | RESOLUTION_NUMBER | Resolution number | Text | Yes | — |
| Committee record | RECOMMENDED_AMOUNT | Recommended amount | Currency | No | Minimum 0 |
| Committee record | AWARD_CONDITIONS | Award conditions | Textarea | No | — |
| Committee record | DISSENTING_VIEWS | Dissenting views | Textarea | No | — |
| Committee record | COMMITTEE_COMMENTS | Committee comments | Textarea | No | — |

Quorum, attendance and conflict-of-interest declarations are separate records.
The committee decision is a Workflow Action.

### 3.5 Approval Form

Code: APPROVAL

| Section | Field key | Label | Type | Required | Proposed validation |
| --- | --- | --- | --- | --- | --- |
| Award details | APPROVED_AMOUNT | Approved amount | Currency | Yes | Minimum 0 |
| Award details | FUNDING_SOURCE | Funding source | Text | Yes | — |
| Award details | COST_CENTRE | Cost centre | Text | Yes | — |
| Award details | CONDITIONS_PRECEDENT | Conditions precedent | Textarea | No | — |
| Award details | APPROVAL_COMMENTS | Approval comments | Textarea | No | — |

Approver identity, delegation level and approval date come from runtime and
audit records. Approval outcomes remain Workflow Actions.

### 3.6 Appeal Submission Form

Code: APPEAL_SUBMISSION

| Section | Field key | Label | Type | Required |
| --- | --- | --- | --- | --- |
| Appeal | APPEAL_GROUNDS | Appeal grounds | Textarea | Yes |
| Appeal | APPEAL_DETAILS | Appeal details | Textarea | Yes |

The appeal date is system-generated. Supporting evidence is handled by the
document subsystem.

### 3.7 Appeal Review Form

Code: APPEAL_REVIEW

| Section | Field key | Label | Type | Required |
| --- | --- | --- | --- | --- |
| Appeal review | PROCESS_COMPLIANCE_FINDINGS | Process compliance findings | Textarea | Yes |
| Appeal review | APPEAL_RATIONALE | Appeal rationale | Textarea | Yes |
| Appeal review | RECOMMENDED_REMEDY | Recommended remedy | Textarea | No |

The configured appeal outcome remains a Workflow Action.

### 3.8 Tranche Claim Form

Code: TRANCHE_CLAIM

| Section | Field key | Label | Type | Required | Proposed behaviour |
| --- | --- | --- | --- | --- | --- |
| Claim details | TRANCHE_NUMBER | Tranche number | Number | Yes | Minimum 1 |
| Claim details | CLAIM_AMOUNT | Claim amount | Currency | Yes | Minimum 0 |
| Claim details | MILESTONE_REFERENCE | Milestone reference | Text | Yes | — |
| Claim details | EXPENDITURE_TO_DATE | Expenditure to date | Currency | Yes | Minimum 0 |
| Claim details | HAS_EXPENDITURE_VARIANCE | Is there an expenditure variance? | Yes/No | Yes | — |
| Claim details | EXPENDITURE_VARIANCE | Expenditure variance | Currency | Yes when visible | Visible when a variance exists |
| Claim details | VARIANCE_EXPLANATION | Variance explanation | Textarea | Yes when visible | Visible when a variance exists |

One response represents one tranche. The repeatable Disbursement Stage creates
additional tranche instances. Supporting evidence is a document requirement.

### 3.9 Disbursement Review Form

Code: DISBURSEMENT_REVIEW

| Section | Field key | Label | Type | Required | Proposed validation |
| --- | --- | --- | --- | --- | --- |
| Financial acquittal | PRIOR_EXPENDITURE_VERIFIED | Has prior expenditure been verified? | Yes/No | Yes | — |
| Financial acquittal | PRIOR_REPORTS_ACQUITTED | Have prior reports been acquitted? | Yes/No | Yes | — |
| Financial acquittal | PAYMENT_CONDITIONS_MET | Have payment conditions been met? | Yes/No | Yes | — |
| Financial acquittal | AMOUNT_RECOMMENDED_FOR_PAYMENT | Amount recommended for payment | Currency | Yes | Minimum 0 |
| Financial acquittal | REVIEW_COMMENTS | Review comments | Textarea | No | — |

Payment approval chain, payment date and payment reference are operational
records rather than form response fields.

### 3.10 Monitoring Review Form

Code: MONITORING_REVIEW

| Section | Field key | Label | Type | Required | Proposed options or behaviour |
| --- | --- | --- | --- | --- | --- |
| Performance assessment | PERFORMANCE_RATING | Performance rating | Single select | Yes | On track; At risk; Off track |
| Performance assessment | DATA_QUALITY_RATING | Data quality rating | Single select | Yes | Verified; Partially verified; Not verified |
| Performance assessment | COMPLIANCE_RATING | Compliance rating | Single select | Yes | Compliant; Partially compliant; Non-compliant |
| Performance assessment | REVIEW_FINDINGS | Review findings | Textarea | Yes | — |
| Performance assessment | CORRECTIVE_ACTION_REQUIRED | Is corrective action required? | Yes/No | Yes | — |
| Performance assessment | CORRECTIVE_ACTION_DETAILS | Corrective action details | Textarea | Yes when visible | Visible when corrective action is required |

Only the performance options are stated explicitly in the source
specification. Data-quality and compliance options are proposed baselines for
client review.

### 3.11 Evaluation and Close-out Review Form

Code: EVALUATION_CLOSE_OUT_REVIEW

| Section | Field key | Label | Type | Required | Proposed validation |
| --- | --- | --- | --- | --- | --- |
| Evaluation | EVALUATOR_FINDINGS | Evaluator findings | Textarea | Yes | — |
| Evaluation | MANAGEMENT_RESPONSE | Management response | Textarea | No | — |
| Evaluation | GRANTEE_PERFORMANCE_RATING | Grantee performance rating | Number | Yes | 1 to 5 |
| Evaluation | AUDIT_SIGN_OFF_CONFIRMED | Has audit sign-off been confirmed? | Yes/No | Yes | — |
| Evaluation | CLOSE_OUT_COMMENTS | Close-out comments | Textarea | No | — |

Relevance, effectiveness, efficiency, impact and sustainability belong to
scoring configuration. The proposed performance-rating scale remains subject
to client review.

## 4. Deferred forms

### 4.1 Funding Application Form

Scalar content includes entity details, registration and tax information,
project title and abstract, objectives, duration, requested amount, co-funding,
declarations and consent.

Blocked repeatable structures:

- budget lines;
- team members and CV associations; and
- indicators, baselines and targets.

### 4.2 Financial Review Form

Scalar content includes VAT status, liquidity and solvency indicators,
financial health rating, adjusted budget, recommended amount and reviewer
comments.

Blocked repeatable structures:

- assessment per budget line;
- disallowed cost items; and
- proposed payment schedule.

### 4.3 Contracting Form

Scalar content includes contract number, start date, end date, approved budget
and conditions-verification notes.

Blocked repeatable structures:

- milestones;
- indicators, baselines and targets;
- payment schedule;
- reporting calendar; and
- signatories.

### 4.4 Progress Report Form

Scalar content includes reporting-period dates, narrative progress, total
expenditure and overall milestone status.

Blocked repeatable structures:

- indicator actuals against targets;
- beneficiary demographics;
- expenditure by budget line;
- milestones;
- risks and issues;
- corrective actions; and
- variation requests.

### 4.5 Final Report Form

Scalar content includes final expenditure, unspent balance, explanation and
lessons learned.

Blocked repeatable structures:

- outcome-indicator achievements;
- asset register; and
- intellectual-property register.

## 5. Configuration that is not a generic form

- Funding Call setup is a Funding Call domain record.
- Call approval, scheduling and publication belong to the Funding Call
  lifecycle rather than the Application Workflow.
- Application draft, validation and submission belong to the applicant
  Application lifecycle; successful submission starts the 12-stage
  Application Workflow at Administrative and Eligibility Screening.
- Administrative screening uses checklists, document verification,
  eligibility results and Workflow Actions.
- Criterion scores use scoring configuration.
- Uploaded evidence uses document requirements and document versioning.
- Decisions use Workflow Actions and reason codes.
- Conflict-of-interest declarations use the COI gate.
- Assignments, attendance, quorum, approval chains and timestamps are workflow,
  governance or audit records.

## 6. Source traceability

The catalogue is based on:

- M&E Workflow Engine Specification, sections 4.2 to 5.14 and section 6;
- SME Fund Implementation Plan, Generic Form Engine phases 2.1 to 2.10;
- SME Fund Implementation Plan, Conditional Form Visibility phase 3.14;
- SME Fund Implementation Plan, Stage / Task Form Binding phase 4.6; and
- SME Fund Implementation Plan, Standard Client Seed phase 17.
