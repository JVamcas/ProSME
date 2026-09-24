# SME Fund Standard Workflow Template

## 1. Purpose

This is the living configuration contract for the standard SME Fund process.
It translates the client requirements in `ME-Workflow-Engine-Specification.docx`
into seedable Workflow, Task, Form, Checklist, Document, Scoring, Action,
Transition, Condition and permission configuration.

Update this document as implementation decisions are made. Do not silently
replace client requirements with current runtime limitations. Where the engine
cannot yet execute a requirement, retain the requirement and mark its
implementation status accurately.

The implementation plan remains authoritative for delivery order. The client
specification remains authoritative for business intent. This document is the
agreed standard template that connects the two.

## 2. Agreed lifecycle boundary

The client describes 14 end-to-end business stages. Only 12 belong inside an
Application Workflow Instance.

| Client stage | Owning lifecycle | Application Workflow stage? |
| --- | --- | --- |
| 4.1 Call Setup and Publication | Funding Call lifecycle | No |
| 4.2 Application Submission | Applicant Application lifecycle | No |
| 4.3 to 5.14 | Application Workflow | Yes — 12 stages |

Successful Application submission:

1. freezes the submitted Application snapshot;
2. resolves the published Workflow Template Version bound to the Funding Call;
3. creates the Workflow Instance; and
4. activates Administrative and Eligibility Screening as the initial stage.

Call Setup and Publication and Application Submission remain part of the
seeded standard process, but they must not be inserted as Stage Definitions in
the Application Workflow graph.

## 3. Status conventions

Requirement source:

- **Client-required** — stated by the client specification.
- **Agreed** — implementation boundary or interpretation agreed during delivery.
- **Proposed baseline** — seed value requiring administrator/client review.
- **TBD** — a business decision is still required.

Implementation status:

- **Available** — supported by the current configuration or runtime model.
- **Configuration only** — can be stored and reviewed, but is not fully executed.
- **Planned** — assigned to a later implementation-plan phase.
- **Blocked** — cannot yet be represented accurately without a model change.

## 4. Template identity and governance

| Property | Standard value |
| --- | --- |
| Definition code | `SME_FUND_STANDARD` |
| Name | SME Fund Standard Application Workflow |
| Initial version | Version 1, Draft |
| Initial stage | `ADMIN_ELIGIBILITY_SCREENING` |
| Seed behavior | Idempotent; never overwrite an existing definition or client edits |
| Seed command | `npm run db:seed:workflow --workspace @prosme/platform` |
| Form binding | Bind applicable task forms; prefer Published, otherwise bind Draft for configuration testing |
| Publication | Requires validation and approval |
| Immutability | Published versions are immutable |
| Funding Call use | Clone and adapt; bind the exact published version |
| Existing applications | Remain bound to the version selected at submission |

The seed must use the same schemas and validators as administrator-created
configuration. It must not bypass validation or add workflow-specific runtime
code.

## 5. Standard roles

Stable role keys below are proposed seed identifiers; labels and assignments
come from the client specification.

| Stable key | Role | Typical responsibility |
| --- | --- | --- |
| `programme_officer` | Programme administrator | Screening, notifications and appeals administration |
| `sector_specialist` | Technical reviewer | Technical or scientific assessment |
| `financial_reviewer` | Financial reviewer | Financial review and disbursement review |
| `due_diligence_officer` | Due diligence officer | Due diligence and risk assessment |
| `panel_moderator` | Panel chair / moderator | Moderation and consolidation |
| `approval_panel_member` | Committee member | Committee review and decision participation |
| `committee_secretariat` | Committee secretariat | Committee administration and records |
| `delegated_approver` | Delegated approver | Approval within a configured authority/value band |
| `contracts_officer` | Contracts officer | Contracting and conditions precedent |
| `grant_me_officer` | Grant or M&E officer | Monitoring, evaluation and close-out |

Named-user assignment is an override. Normal assignment is role-based.
Element permissions must use canonical permission codes and remain
deny-by-default. Conflict of interest is a gate, not a form field.

## 6. Standard action catalogue

These are the only standard configurable action types requested by the
client. A stage may define multiple actions of the same type with different
stable keys, labels, reason codes, conditions and targets.

| Action type | Standard meaning |
| --- | --- |
| `APPROVE_ADVANCE` | Move to configured target stage(s) |
| `REJECT` | Record a negative/terminal outcome using configured reason codes |
| `REQUEST_INFORMATION` | Request applicant information and pause the SLA clock |
| `RETURN` | Return to a configured previous stage for rework |
| `REFER` | Send to an out-of-sequence stage, optionally returning afterward |
| `ESCALATE` | Raise to a configured senior role/user without changing stage |
| `PUT_ON_HOLD` | Suspend processing and stop the clock |
| `WITHDRAW` | Applicant-initiated exit where permitted |
| `DEFER` | Hold for a later date, committee or Funding Call |

Resume, automatic transitions, assignment/reassignment and task save/submit
operations are runtime commands rather than additional standard action types.

## 7. Standard Application Workflow graph

The agreed baseline graph is:

```text
Administrative and Eligibility Screening
                  |
                  | Eligible and advance
                  v
        +-----------------------+
        |                       |
        v                       v
Technical Assessment     Financial Review
        |                       |
        +----------+------------+
                   |
                   v
       Due Diligence and Risk (optional)
                   |
                   v
       Moderation and Consolidation
                   |
                   v
       Committee / Adjudication Review
                   |
                   v
        Approval and Award Decision
                   |
                   v
      Notification, Feedback and Appeals
                   |
                   v
      Contracting and Conditions Precedent
                   |
                   v
       Disbursement (repeat per tranche)
                   |
                   v
 Implementation Monitoring (repeat per period)
                   |
                   v
         Evaluation and Close-out
```

**Routing decision requiring confirmation:** the client requires Technical
and Financial review to run in parallel and join before Moderation. This
baseline places optional Due Diligence after the parallel join and before
Moderation. Confirm whether Due Diligence should instead be a third parallel
branch or occur elsewhere for a specific Funding Call.

## 8. Cross-cutting stage defaults

Unless a stage overrides them:

- public visibility is a per-element property;
- internal scores, reviewer identities and recommendations are not exposed to
  applicants;
- required task completion, mandatory fields, checklist items and documents
  must pass before a stage completes;
- action and transition availability is condition-driven;
- every decision records actor, time, action, reason code and optional note;
- every document replacement creates a new immutable version;
- verification belongs to the exact Document Version reviewed;
- RFI and Hold pause the SLA clock;
- concurrency and idempotency protections apply to every command; and
- notification events use configured templates and retain a send log.

SLA durations, reminder schedules, reason-code catalogues, notification
templates and most scoring weights remain **TBD per Funding Call** unless a
reviewed seed baseline is added below.

## 9. Stage templates

### 9.1 Administrative and Eligibility Screening

| Property | Configuration |
| --- | --- |
| Stable key | `ADMIN_ELIGIBILITY_SCREENING` |
| Client reference | 4.3 |
| Initial | Yes |
| Optional / repeatable / COI | No / No / No |
| Primary role | `PROGRAMME_ADMINISTRATOR` |
| Public status | `UNDER_REVIEW` — Application under assessment |

Tasks:

1. `COMPLETENESS_SCREENING` — checklist task.
2. `DOCUMENT_VERIFICATION` — verify mandatory document versions and expiry.
3. `AUTHORITATIVE_ELIGIBILITY` — execute the Funding Call's bound Eligibility
   Ruleset Version against verified evidence.

Checklist baseline:

- all required Application sections are complete;
- all mandatory documents are present;
- mandatory document versions are valid and unexpired;
- entity/registration evidence has been checked;
- authoritative eligibility evaluation has completed; and
- screening outcome has a standardized reason code where required.

Documents:

- screening checklist record;
- registry, tax or other verification evidence; and
- RFI correspondence generated during this stage.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `ELIGIBLE_ADVANCE` | Eligible and advance | `APPROVE_ADVANCE` | Fork to Technical and Financial review |
| `INELIGIBLE_REJECT` | Ineligible | `REJECT` | Terminal rejected outcome after notification policy |
| `REQUEST_ADDITIONAL_INFORMATION` | Request additional information | `REQUEST_INFORMATION` | Applicant RFI loop |
| `REFER_INTERNAL_CLARIFICATION` | Refer for internal clarification | `REFER` | Configured internal clarification target |

Conditions:

- advance requires completion of the authoritative eligibility evaluation;
- advance requires no unresolved hard failure;
- advance requires all mandatory screening items and documents verified;
- reject requires at least one controlled reason code; and
- RFI availability requires an editable-field whitelist and response deadline.

### 9.2 Technical or Scientific Assessment

| Property | Configuration |
| --- | --- |
| Stable key | `TECHNICAL_ASSESSMENT` |
| Client reference | 4.4 |
| Optional / repeatable / COI | No / No / Yes |
| Primary role | `TECHNICAL_REVIEWER` |
| Form | `TECHNICAL_REVIEW` |
| Public status | `UNDER_REVIEW` — Detailed assessment |

Tasks:

1. reviewer allocation by expertise;
2. COI declaration gate;
3. independent scoring and commentary per assigned reviewer; and
4. recommendation capture.

Scoring:

- configurable criteria, weights, scale and thresholds;
- mandatory comment per configured criterion;
- weighted aggregation;
- minimum completed-review threshold; and
- outlier detection before completion.

Documents:

- signed COI/confidentiality undertaking; and
- individual review report.

Comments and recommendations:

- strengths — internal;
- weaknesses — internal;
- recommended amount — internal;
- recommended conditions — internal; and
- consolidated feedback released later through the notification stage.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `RECOMMEND` | Recommend | `APPROVE_ADVANCE` | Complete this branch with a positive recommendation |
| `RECOMMEND_WITH_CONDITIONS` | Recommend with conditions | `APPROVE_ADVANCE` | Complete this branch and preserve conditions |
| `DO_NOT_RECOMMEND` | Do not recommend | `APPROVE_ADVANCE` | Complete this branch with a negative recommendation for consolidation |
| `REQUEST_CLARIFICATION` | Return to applicant for clarification | `REQUEST_INFORMATION` | Applicant RFI loop |
| `ESCALATE_SCORING_DISCREPANCY` | Escalate scoring discrepancy | `ESCALATE` | Moderator/senior reviewer |

Appointing an additional reviewer is an assignment operation governed by the
multiple-reviewer configuration, not a separate standard workflow action.

Conditions:

- application contents remain hidden until COI clearance;
- completion requires the configured number of independent responses;
- all mandatory scores/comments must be complete; and
- branch completion must not activate the join target prematurely.

### 9.3 Financial and Budget Review

| Property | Configuration |
| --- | --- |
| Stable key | `FINANCIAL_REVIEW` |
| Client reference | 4.5 |
| Optional / repeatable / COI | No / No / Configurable |
| Primary role | `FINANCIAL_REVIEWER` |
| Form | `FINANCIAL_REVIEW` — deferred pending repeatable form structures |
| Public status | `UNDER_REVIEW` — Financial assessment |

Tasks:

1. line-by-line budget assessment;
2. cost eligibility and value-for-money review;
3. co-funding confirmation;
4. financial viability assessment; and
5. proposed disbursement schedule review.

Documents:

- annual financial statements;
- management accounts;
- budget narrative;
- capital-item quotations;
- banking confirmation; and
- financial review memorandum.

Scoring/assessment:

- cost-guideline compliance; and
- financial-health rating.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `APPROVE_AS_SUBMITTED` | Approve as submitted | `APPROVE_ADVANCE` | Complete branch |
| `APPROVE_WITH_ADJUSTMENTS` | Approve with adjustments | `APPROVE_ADVANCE` | Complete branch and preserve adjusted values |
| `REQUEST_REVISED_BUDGET` | Request revised budget | `REQUEST_INFORMATION` | Applicant RFI loop with budget fields unlocked |
| `NOT_SUPPORTED` | Not supported | `APPROVE_ADVANCE` | Complete branch with negative recommendation for consolidation |

Conditions:

- mandatory budget lines must be assessed;
- adjusted totals must be arithmetically valid;
- mandatory evidence must be verified; and
- branch completion participates in the configured parallel join.

### 9.4 Due Diligence and Risk Assessment

| Property | Configuration |
| --- | --- |
| Stable key | `DUE_DILIGENCE_RISK` |
| Client reference | 4.6 |
| Optional / repeatable / COI | Yes / No / Configurable |
| Primary role | `DUE_DILIGENCE_OFFICER` |
| Form | `DUE_DILIGENCE_RISK` |
| Public status | `UNDER_REVIEW` — Due diligence |

Tasks:

1. entity and governance verification;
2. site or virtual visit where required;
3. capacity, compliance and debarment screening;
4. prior-grant performance lookup; and
5. risk rating and mitigation capture.

Documents:

- due diligence/site visit report;
- tax-status confirmation;
- screening results; and
- prior-grant performance report.

Scoring/assessment:

- financial, delivery, governance and fraud risk categories;
- overall risk rating; and
- mitigation requirements.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `PROCEED` | Proceed | `APPROVE_ADVANCE` | Moderation |
| `PROCEED_WITH_CONDITIONS` | Proceed with conditions | `APPROVE_ADVANCE` | Moderation with mitigations |
| `DECLINE_RISK` | Decline on risk grounds | `REJECT` | Negative outcome using controlled reason codes |
| `FURTHER_VERIFICATION` | Further verification required | `REQUEST_INFORMATION` | Verification/RFI loop |

The resulting risk rating must be available to Disbursement and Monitoring.
Prior grantee performance from an earlier award must be available here.

### 9.5 Moderation and Consolidation

| Property | Configuration |
| --- | --- |
| Stable key | `MODERATION` |
| Client reference | 4.7 |
| Optional / repeatable / COI | No / No / Yes |
| Primary role | `PANEL_MODERATOR` |
| Form | `MODERATION` |
| Public status | `UNDER_REVIEW` — Moderation |

Tasks:

1. verify parallel-branch join completion;
2. consolidate and normalize scores;
3. resolve outliers;
4. rank against cut-off and budget envelope; and
5. record provisional allocation and moderation justification.

Documents:

- moderation report;
- ranked list;
- attendance register; and
- declarations.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `SHORTLIST_COMMITTEE` | Shortlist for committee | `APPROVE_ADVANCE` | Committee review |
| `PLACE_RESERVE_LIST` | Place on reserve list | `DEFER` | Reserve list/later decision |
| `UNSUCCESSFUL` | Unsuccessful | `REJECT` | Negative outcome |
| `RETURN_REVIEW` | Return for re-review | `RETURN` | Technical and/or Financial review as configured |

Conditions:

- required predecessor branches are complete;
- minimum reviewer and scoring thresholds are satisfied;
- score adjustments require justification; and
- shortlist allocations fit within the available envelope.

### 9.6 Committee or Adjudication Review

| Property | Configuration |
| --- | --- |
| Stable key | `COMMITTEE_REVIEW` |
| Client reference | 4.8 |
| Optional / repeatable / COI | No / No / Yes |
| Primary roles | `COMMITTEE_MEMBER`, `COMMITTEE_SECRETARIAT` |
| Form | `COMMITTEE_REVIEW` |
| Public status | `UNDER_REVIEW` — Decision review |

Tasks:

1. committee pack preparation;
2. member COI declarations;
3. quorum confirmation;
4. deliberation and application-level resolution; and
5. minutes/resolution register completion.

Documents:

- committee pack;
- minutes;
- resolution register; and
- signed attendance and COI records.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `RECOMMEND_APPROVAL` | Recommend for approval | `APPROVE_ADVANCE` | Approval stage |
| `DEFER_PENDING_INFORMATION` | Defer pending information | `DEFER` | Configured date/committee |
| `DECLINE` | Decline | `REJECT` | Negative outcome |
| `PLACE_RESERVE_LIST` | Place on reserve list | `DEFER` | Reserve list/later decision |

Conditions:

- quorum must be met;
- all participating members must clear COI;
- budget availability must be confirmed; and
- resolution number and mandatory decision fields must be present.

### 9.7 Approval and Award Decision

| Property | Configuration |
| --- | --- |
| Stable key | `APPROVAL_AWARD_DECISION` |
| Client reference | 4.9 |
| Optional / repeatable / COI | No / No / Configurable |
| Primary role | `DELEGATED_APPROVER` |
| Form | `APPROVAL` |
| Public status | `OUTCOME_AVAILABLE` — Decision pending release |

Tasks:

1. resolve the required delegated-authority band from the decision amount;
2. validate approver authority;
3. confirm budget availability; and
4. record the award decision and commitment details.

Documents:

- approval memorandum;
- signed resolution; and
- delegation-of-authority evidence.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `APPROVE` | Approve | `APPROVE_ADVANCE` | Notification stage |
| `APPROVE_WITH_CONDITIONS` | Approve with conditions | `APPROVE_ADVANCE` | Notification stage |
| `PARTIAL_APPROVAL` | Partially approve at reduced amount | `APPROVE_ADVANCE` | Notification stage |
| `DECLINE` | Decline | `REJECT` | Notification stage, then negative terminal outcome |
| `REFER_COMMITTEE` | Refer back to committee | `RETURN` | Committee review |

Conditions:

- acting approver's configured value band covers the decision amount;
- approved amount does not exceed available budget;
- mandatory approval details and evidence are complete; and
- a decline or reduction carries a controlled reason code.

### 9.8 Notification, Feedback and Appeals

| Property | Configuration |
| --- | --- |
| Stable key | `NOTIFICATION_APPEALS` |
| Client reference | 4.10 |
| Optional / repeatable / COI | No / No / Configurable for appeal reviewer |
| Primary role | `PROGRAMME_ADMINISTRATOR` |
| Forms | `APPEAL_SUBMISSION`, `APPEAL_REVIEW` |
| Public status | `OUTCOME_AVAILABLE` — Outcome issued |

Tasks:

1. generate and issue outcome notification;
2. release approved feedback;
3. record applicant acknowledgement;
4. receive an appeal within the configured window; and
5. review process compliance and record appeal outcome.

Documents:

- award/regret letter;
- feedback report;
- appeal submission and supporting evidence; and
- appeal ruling.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `UPHOLD_ORIGINAL` | Uphold original decision | `APPROVE_ADVANCE` | Contracting for awards; terminal close for declines |
| `UPHOLD_APPEAL` | Uphold appeal | `RETURN` | Relevant configured assessment/decision stage |
| `PARTIALLY_UPHOLD` | Partially uphold appeal | `RETURN` | Relevant configured stage with remedy context |

Automatic transition closes the appeal window when it lapses. Internal stage
names, scores and reviewer identities must not be exposed to applicants.

### 9.9 Contracting and Conditions Precedent

| Property | Configuration |
| --- | --- |
| Stable key | `CONTRACTING` |
| Client reference | 5.11 |
| Optional / repeatable / COI | No / No / No |
| Primary role | `CONTRACTS_OFFICER` |
| Form | `CONTRACTING` — deferred pending repeatable form structures |
| Public status | `ACTION_REQUIRED` or `UNDER_REVIEW`, depending on active task |

Tasks/checklists:

1. agreement generation and negotiation;
2. milestone, indicator, reporting-calendar and payment-schedule configuration;
3. conditions-precedent verification checklist; and
4. electronic signature.

Documents:

- signed funding agreement and annexures;
- banking verification;
- insurance; and
- ethics/regulatory approvals.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `EXECUTE_AGREEMENT` | Execute | `APPROVE_ADVANCE` | Disbursement |
| `RETURN_NEGOTIATION` | Return for negotiation | `RETURN` | Contract negotiation task/stage |
| `LAPSE_AWARD` | Lapse award on non-acceptance | `REJECT` | Terminal lapsed outcome |
| `REALLOCATE_RESERVE` | Reallocate to reserve list | `REFER` | Configured reserve-list process |

### 9.10 Disbursement

| Property | Configuration |
| --- | --- |
| Stable key | `DISBURSEMENT` |
| Client reference | 5.12 |
| Optional / repeatable / COI | No / Yes, per tranche / No |
| Primary role | `FINANCIAL_REVIEWER` |
| Forms | `TRANCHE_CLAIM`, `DISBURSEMENT_REVIEW` |
| Public status | `ACTION_REQUIRED` or `UNDER_REVIEW`, depending on active task |

Tasks:

1. applicant tranche claim and evidence submission;
2. milestone validation;
3. prior-report acquittal;
4. payment-condition review;
5. approval-chain completion; and
6. payment date/reference recording.

Documents:

- claim form or invoice;
- expenditure report;
- proof of prior expenditure; and
- re-verified tax status.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `APPROVE_PAYMENT` | Approve | `APPROVE_ADVANCE` | Payment and next tranche/Monitoring as configured |
| `PART_PAY` | Part-pay | `APPROVE_ADVANCE` | Partial payment with recorded amount |
| `WITHHOLD_REPORTS` | Withhold pending outstanding reports | `PUT_ON_HOLD` | Stop clock until obligations are met |
| `RECOVER_FUNDS` | Recover funds | `REFER` | Recovery process |

Each iteration must retain its own task responses, documents, decision,
timestamps and audit history.

### 9.11 Implementation Monitoring

| Property | Configuration |
| --- | --- |
| Stable key | `IMPLEMENTATION_MONITORING` |
| Client reference | 5.13 |
| Optional / repeatable / COI | No / Yes, per reporting period / No |
| Primary role | `GRANT_ME_OFFICER` |
| Forms | `PROGRESS_REPORT` — deferred; `MONITORING_REVIEW` — ready |
| Public status | `ACTION_REQUIRED` or `UNDER_REVIEW`, depending on active task |

Tasks:

1. grantee narrative, financial and indicator reporting;
2. evidence upload;
3. monitoring review and data verification;
4. site visit where required;
5. risk/issue and corrective-action management; and
6. variation/no-cost extension review.

Documents:

- progress and financial reports;
- site visit reports;
- portfolio of evidence; and
- variation request forms.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `ACCEPT_REPORT` | Accept report | `APPROVE_ADVANCE` | Next period, Disbursement or Close-out as configured |
| `RETURN_REVISION` | Return for revision | `RETURN` | Grantee reporting task |
| `APPROVE_VARIATION` | Approve variation | `APPROVE_ADVANCE` | Continue with updated approved configuration |
| `APPROVE_EXTENSION` | Approve no-cost extension | `APPROVE_ADVANCE` | Continue with revised end date |
| `ESCALATE_REMEDIAL_PLAN` | Escalate to remedial plan | `ESCALATE` | Senior/remedial-plan owner |
| `SUSPEND` | Suspend | `PUT_ON_HOLD` | Stop processing and SLA clock |
| `TERMINATE_RECOVER` | Terminate and recover | `REJECT` | Terminal/recovery process |

Risk intensity and payment modality must consume the Due Diligence outcome.

### 9.12 Evaluation and Close-out

| Property | Configuration |
| --- | --- |
| Stable key | `EVALUATION_CLOSE_OUT` |
| Client reference | 5.14 |
| Optional / repeatable / COI | No / No / Configurable |
| Primary role | `GRANT_ME_OFFICER` |
| Forms | `FINAL_REPORT` — deferred; `EVALUATION_CLOSE_OUT_REVIEW` — ready |
| Public status | `CLOSED` after completion |

Tasks:

1. final technical and financial reporting;
2. evaluation against the results framework;
3. final acquittal and audit;
4. asset/IP disposition and unspent-fund recovery;
5. management response and lessons learned; and
6. closure and archive.

Documents:

- evaluation report;
- final narrative report;
- audited statement of expenditure;
- completion certificate; and
- closure memorandum.

Scoring:

- relevance;
- effectiveness;
- efficiency;
- impact; and
- sustainability.

Actions and transitions:

| Stable key | Label | Type | Target/effect |
| --- | --- | --- | --- |
| `CLOSE` | Close | `APPROVE_ADVANCE` | Terminal closed outcome |
| `CLOSE_QUALIFIED` | Close with qualification | `APPROVE_ADVANCE` | Terminal qualified outcome |
| `REFER_RECOVERY_INVESTIGATION` | Refer for recovery or investigation | `REFER` | Recovery/investigation process |
| `RESTRICT_FUTURE_FUNDING` | Restrict future funding | `REJECT` | Terminal restricted outcome |

The grantee performance rating must be available to Due Diligence for later
applications by the same entity.

## 10. Standard forms and binding status

### 10.1 Ready as seeded Draft Form Version 1

| Form code | Intended stage |
| --- | --- |
| `TECHNICAL_REVIEW` | Technical Assessment |
| `DUE_DILIGENCE_RISK` | Due Diligence and Risk |
| `MODERATION` | Moderation |
| `COMMITTEE_REVIEW` | Committee Review |
| `APPROVAL` | Approval and Award Decision |
| `APPEAL_SUBMISSION` | Notification, Feedback and Appeals |
| `APPEAL_REVIEW` | Notification, Feedback and Appeals |
| `TRANCHE_CLAIM` | Disbursement |
| `DISBURSEMENT_REVIEW` | Disbursement |
| `MONITORING_REVIEW` | Implementation Monitoring |
| `EVALUATION_CLOSE_OUT_REVIEW` | Evaluation and Close-out |

These versions must be reviewed and published before the standard Workflow
Template can bind their exact Form Version identifiers.

### 10.2 Deferred forms

| Form code | Blocker |
| --- | --- |
| `FUNDING_APPLICATION` | Repeatable budget lines, team members and indicators |
| `FINANCIAL_REVIEW` | Repeatable budget-line assessment and payment schedule |
| `CONTRACTING` | Repeatable milestones, indicators, schedules and signatories |
| `PROGRESS_REPORT` | Repeatable indicators, beneficiaries, expenditure, risks and variations |
| `FINAL_REPORT` | Repeatable outcomes, assets and IP records |

## 11. Condition catalogue

The following conditions are part of the standard template. Stable operand
paths must be added to the Workflow Data Resolver before a condition is
treated as executable.

| Condition key | Used by | Required rule | Current status |
| --- | --- | --- | --- |
| `SCREENING_COMPLETE` | Screening exit | Mandatory checklist and document verification complete | Planned runtime |
| `ELIGIBILITY_PASSED` | Screening advance | No hard eligibility failures | Planned runtime |
| `REVIEW_THRESHOLD_MET` | Technical exit | Configured independent-review count complete | Planned Phase 9 |
| `MANDATORY_SCORES_COMPLETE` | Technical exit | Required scores/comments captured | Planned runtime |
| `PARALLEL_REVIEWS_COMPLETE` | Moderation entry | Technical and Financial predecessors complete | Planned Phase 10 |
| `DOCUMENTS_VERIFIED` | Relevant exits | Mandatory current Document Versions verified | Planned runtime/Phase 16 |
| `QUORUM_MET` | Committee action | Configured quorum satisfied | Planned Phase 9 |
| `DELEGATION_BAND_VALID` | Approval action | Actor's band covers decision amount | Planned Phase 9 |
| `CONDITIONS_PRECEDENT_MET` | Contracting advance | Mandatory conditions verified | Planned runtime |
| `PAYMENT_CONDITIONS_MET` | Disbursement approval | Milestone, reports and payment conditions pass | Planned Phase 13/runtime |
| `CLOSE_OUT_COMPLETE` | Close-out action | Final reports, acquittal and audit complete | Planned runtime |

Where a condition fails, its action must be unavailable. The server must
re-evaluate the condition when execution is attempted.

## 12. Notification hooks

Seed hooks for at least:

- Application submission acknowledgement;
- RFI issued, reminder, expiry and response;
- task assignment/reassignment;
- SLA reminder and breach escalation;
- outcome issued;
- appeal window opening/closing and appeal outcome;
- contracting action required;
- reporting and tranche deadlines;
- payment outcome; and
- close-out outcome.

Recipients, channels, templates and merge fields remain configurable.

## 13. Known implementation dependencies

| Capability | Implementation-plan phase |
| --- | --- |
| Runtime entry/exit/transition condition evaluation | 7.4, 7.7 and 7.8 |
| Action-specific runtime behavior | 8 |
| Multiple reviewers, thresholds, quorum and authority bands | 9 |
| Parallel fork and join | 10 |
| RFI lifecycle | 11 |
| SLA pause/resume and escalation | 12 |
| Repeatable Disbursement and Monitoring iterations | 13 |
| Applicant submission lifecycle | 14 |
| Funding Call publication lifecycle | 15 |
| Document versioning and verification | 16 |
| Idempotent standard seed and end-to-end verification | 17 |

Configuration may be seeded before these runtime phases finish. The canonical
template must remain Draft until all publication requirements and referenced
versions/roles are valid. A separate runtime-compatible pilot may be used for
incremental tests without weakening this standard definition.

## 14. Open decisions

1. Confirm the default placement of optional Due Diligence relative to the
   Technical/Financial join and Moderation.
2. Confirm delegated-authority value bands and the approver for each band.
3. Confirm standard SLA durations, reminders and escalation targets.
4. Confirm reason-code catalogues and applicant-facing messages per action.
5. Confirm scoring criteria, weights, thresholds and rating scales per Funding
   Call or instrument.
6. Confirm the appeal window and whether an appeal may reopen merit scoring.
7. Confirm external reviewer account/portal arrangements.
8. Confirm notification channels and approved templates.
9. Confirm external verification-register integrations.
10. Confirm whether emergency mid-call template changes remain permitted only
    for applications submitted after a newly approved version.

## 15. Seed acceptance checklist

Before the canonical template is published or assigned:

- [ ] The 12 Application Workflow stages exist with unique stable keys.
- [ ] Administrative and Eligibility Screening is the only initial stage.
- [ ] Every stage has assigned task responsibility.
- [ ] Every task has valid element permissions.
- [ ] Every bound Form Version is Published and immutable.
- [ ] Technical and Financial review fork/join configuration is valid.
- [ ] Repeatable stages are marked and iteration behavior is available.
- [ ] Every action has a valid target/effect and required reason codes.
- [ ] Entry, exit and transition conditions use resolvable typed operands.
- [ ] Scoring weights and thresholds pass validation.
- [ ] Mandatory document requirements specify uploader, verifier and expiry.
- [ ] COI-gated stages prevent content access before clearance.
- [ ] Public status labels expose no internal scores, recommendations or names.
- [ ] Funding Call and applicant lifecycle configuration is linked correctly.
- [ ] Clone, approval, publication and immutability tests pass.
- [ ] The seeded end-to-end verification scenario passes.

## 16. Change log

| Date | Change |
| --- | --- |
| 2026-09-20 | Initial agreed template. Established the 12-stage Application Workflow boundary and documented the standard stage configuration, dependencies and open decisions. |
| 2026-09-20 | Added the executable idempotent Draft seed, standard role identifiers and Published-form-only binding rule. |
