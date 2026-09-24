# SME Fund Eligibility Configuration Decision Matrix

## 1. Purpose

This matrix is the business-review input for the initial SME Fund Eligibility
Ruleset Version. It records programme configuration and does not define
application constants, source-code enums or evaluator behaviour.

Each row is independently approvable. A row may be converted to seed data only
after its business decision status is `Approved`. Until then, the stable keys,
failure outcomes, questions, messages and source bindings below remain proposed
configuration.

## 2. Decision conventions

| Value | Meaning |
| --- | --- |
| `Proposed` | Derived from supplied business material and awaiting business-owner approval. |
| `TBD` | The supplied material does not decide the point. It must not be inferred during seeding. |
| `HARD_FAIL` | A failed verified rule makes the authoritative result ineligible. |
| `SOFT_FAIL` | A failed verified rule requires a screening decision. |
| `WARNING` | A failed rule is recorded but does not make the result ineligible. |
| `BOTH` | The input has an advisory Self Check source and a separate authoritative Screening source. |

All proposed inputs use one logical `eligibility.<stable-key>` path in both
modes. Self Check answers are applicant assertions only. Screening values come
from the evidence or decision owner named in the matrix.

The workflow role `PROGRAMME_ADMINISTRATOR` is the proposed manual verification
owner because the standard Administrative and Eligibility Screening stage is
assigned to that role. This assignment is configuration and remains subject to
business approval.

## 3. Proposed seed decisions

| # | Business description | Stable seed key | Input type | Mode | Proposed rule | Failure type | Reason code | Applicant-facing message | Self Check question configuration | Screening evidence source | Verification method and owner | Status |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | The business is at least 51% Namibian-owned and controlled. | `namibian_ownership_percentage` | `NUMBER` | `BOTH` | Value is at least `51`. | `HARD_FAIL` | `NAMIBIAN_OWNERSHIP_BELOW_MINIMUM` | Your business does not meet the minimum Namibian ownership and control requirement for this funding call. | Required percentage question: “What percentage of the business is Namibian-owned and controlled?” Minimum `0`, maximum `100`, with an explanation that evidence will be verified. | Bound Application Form ownership field plus configured proof-of-ownership Document Requirement. | Manual verification by `PROGRAMME_ADMINISTRATOR`; authoritative register or ownership-data integration: `TBD`. | `Proposed` |
| 2 | The business is registered on the NIPDB MSME database. | `nipdb_msme_database_registered` | `BOOLEAN` | `BOTH` | Value equals `true`. | `HARD_FAIL` | `NIPDB_MSME_REGISTRATION_REQUIRED` | Your business must be registered on the NIPDB MSME database for this funding call. | Required Yes/No question: “Is your business registered on the NIPDB MSME database?” Include registration guidance or link: `TBD`. | Configured NIPDB MSME registration output, with a manual assessment fallback. | Integration target and lookup identifier: `TBD`; until configured, manual verification by `PROGRAMME_ADMINISTRATOR`. | `Proposed` |
| 3 | The business holds every statutory and sectoral registration applicable to it, including BIPA, NAMRA and Social Security Commission registration where applicable. | `applicable_registrations_verified` | `BOOLEAN` | `BOTH` | Value equals `true`. | `HARD_FAIL` | `APPLICABLE_REGISTRATION_MISSING` | Your business is missing a statutory or sectoral registration required for this funding call. | Required Yes/No/Not applicable question: “Does your business hold all statutory and sectoral registrations that apply to it?” The call-specific applicability guidance is `TBD`. | Configured registration Document Requirements and registry outputs for each registration required by the Funding Call. | Manual verification by `PROGRAMME_ADMINISTRATOR`; applicable institution list and external integrations: `TBD` per Funding Call. | `Proposed` |
| 4 | The business is in good standing with NAMRA. | `namra_good_standing` | `BOOLEAN` | `BOTH` | Value equals `true`. | `HARD_FAIL` | `NAMRA_GOOD_STANDING_REQUIRED` | Your business must be in good standing with NAMRA for this funding call. | Required Yes/No/Not applicable question: “Is your business currently in good standing with NAMRA?” Applicability rule: `TBD`. | Valid, unexpired NAMRA Good Standing Document Requirement or configured NAMRA verification output. | Manual document verification by `PROGRAMME_ADMINISTRATOR`; NAMRA integration: `TBD`. | `Proposed` |
| 5 | The business is in good standing with the Social Security Commission. | `social_security_good_standing` | `BOOLEAN` | `BOTH` | Value equals `true`. | `HARD_FAIL` | `SOCIAL_SECURITY_GOOD_STANDING_REQUIRED` | Your business must be in good standing with the Social Security Commission for this funding call. | Required Yes/No/Not applicable question: “Is your business currently in good standing with the Social Security Commission?” Applicability rule: `TBD`. | Valid, unexpired Social Security Commission Good Standing Document Requirement or configured commission verification output. | Manual document verification by `PROGRAMME_ADMINISTRATOR`; commission integration: `TBD`. | `Proposed` |
| 6 | The business has valid MSME status or a valid MSME certificate. | `msme_status_valid` | `BOOLEAN` | `BOTH` | Value equals `true`. | `HARD_FAIL` | `VALID_MSME_STATUS_REQUIRED` | Your business must have valid MSME status for this funding call. | Required Yes/No question: “Does your business currently have valid MSME status or a valid MSME certificate?” | Valid, unexpired MSME Certificate Document Requirement or configured MSME status output. | Manual document verification by `PROGRAMME_ADMINISTRATOR`; status integration: `TBD`. | `Proposed` |
| 7 | The business has a functional business bank account. | `functional_business_bank_account` | `BOOLEAN` | `BOTH` | Value equals `true`. | `HARD_FAIL` | `FUNCTIONAL_BUSINESS_BANK_ACCOUNT_REQUIRED` | Your business must have a functional business bank account for this funding call. | Required Yes/No question: “Does your business have a functional bank account in the business’s name?” The meaning of “functional”: `TBD`. | Configured bank confirmation letter or bank statement Document Requirement and a manual assessment result. | Manual verification by `PROGRAMME_ADMINISTRATOR`; acceptable recency and account-status evidence: `TBD`. | `Proposed` |
| 8 | The business has operated for at least one year. | `operating_months` | `NUMBER` | `BOTH` | Value is at least `12`. | `HARD_FAIL` | `MINIMUM_OPERATING_PERIOD_NOT_MET` | Your business must have been operating for at least one year for this funding call. | Required whole-number question: “For how many complete months has your business been operating?” Minimum `0`. | Bound Application Form operating-start/date or operating-months field, supported by registration and other configured trading evidence. | Manual verification by `PROGRAMME_ADMINISTRATOR`; authoritative calculation basis when registration and trading dates differ: `TBD`. | `Proposed` |
| 9 | The business presents a feasible business model with traction and growth potential. | `business_model_feasible` | `BOOLEAN` | `BOTH` | Value equals `true`. | `SOFT_FAIL` | `BUSINESS_MODEL_REQUIRES_REVIEW` | Your business model, traction or growth potential requires further review. | Required Yes/No question: “Can you demonstrate a feasible business model with existing traction and growth potential?” Include explanatory content and examples: `TBD`. | Manual assessment result informed by the bound Application Form, business profile and pitch deck. | Manual decision by `PROGRAMME_ADMINISTRATOR`; assessment rubric and minimum evidence: `TBD`. | `Proposed` |
| 10 | The business is ready for market expansion, export or investment opportunities. | `market_expansion_readiness` | `BOOLEAN` | `BOTH` | Value equals `true`. | `SOFT_FAIL` | `MARKET_READINESS_REQUIRES_REVIEW` | Your readiness for market expansion, export or investment opportunities requires further review. | Required Yes/No question: “Is your business ready for market expansion, export or investment opportunities?” Include explanatory content and examples: `TBD`. | Manual assessment result informed by the bound Application Form, business profile and pitch deck. | Manual decision by `PROGRAMME_ADMINISTRATOR`; readiness rubric: `TBD`. | `Proposed` |
| 11 | The applicant has completed a pre-incubation or acceleration programme, or commits to completing one if selected. This criterion is optional. | `incubation_or_acceleration_commitment` | `BOOLEAN` | `BOTH` | Value equals `true`. | `WARNING` | `INCUBATION_OR_ACCELERATION_NOT_CONFIRMED` | You have not confirmed prior participation in, or a commitment to complete, a pre-incubation or acceleration programme. This does not make you ineligible. | Required Yes/No question: “Have you completed a pre-incubation or acceleration programme, or will you commit to completing one if selected?” Explain that the criterion is optional and non-blocking. | Configured programme-certificate Document Requirement where supplied; otherwise a recorded applicant commitment and manual assessment result. | Manual verification by `PROGRAMME_ADMINISTRATOR`; no integration proposed. | `Proposed` |
| 12 | The application includes a business profile no longer than five pages. | `business_profile_within_page_limit` | `BOOLEAN` | `BOTH` | Value equals `true`. | `SOFT_FAIL` | `BUSINESS_PROFILE_PAGE_LIMIT_EXCEEDED` | Your business profile must be no longer than five pages. Please provide a compliant document if requested. | Required Yes/No question: “Is your business profile no longer than five pages?” Include the five-page limit in help text. | Configured Business Profile Document Requirement with page-count metadata or a screening checklist result. | Automated document page count if available; otherwise manual verification by `PROGRAMME_ADMINISTRATOR`. The RFI-versus-rejection policy is `TBD`. | `Proposed` |
| 13 | The application includes a pitch deck no longer than twelve slides. | `pitch_deck_within_slide_limit` | `BOOLEAN` | `BOTH` | Value equals `true`. | `SOFT_FAIL` | `PITCH_DECK_SLIDE_LIMIT_EXCEEDED` | Your pitch deck must be no longer than twelve slides. Please provide a compliant document if requested. | Required Yes/No question: “Is your pitch deck no longer than twelve slides?” Include the twelve-slide limit in help text. | Configured Pitch Deck Document Requirement with slide/page-count metadata or a screening checklist result. | Automated slide/page count if available; otherwise manual verification by `PROGRAMME_ADMINISTRATOR`. The RFI-versus-rejection policy is `TBD`. | `Proposed` |
| 14 | The application includes a valid police clearance certificate or proof that an application for one was submitted. | `police_clearance_or_application_proof_present` | `BOOLEAN` | `BOTH` | Value equals `true`. | `HARD_FAIL` | `POLICE_CLEARANCE_EVIDENCE_REQUIRED` | A valid police clearance certificate or proof of application is required for this funding call. | Required Yes/No question: “Can you provide a valid police clearance certificate or proof that you have applied for one?” Specify whose clearance is required: `TBD`. | Configured Police Clearance or Application Receipt Document Requirement, including validity where a certificate is supplied. | Manual document verification by `PROGRAMME_ADMINISTRATOR`; subject person, certificate validity and receipt age rules: `TBD`. | `Proposed` |

## 4. Decisions required before approval

Business owners must resolve the following points without changing evaluator
code:

1. approve or amend every stable key, rule, failure type, reason code and
   applicant-facing message independently;
2. define when NAMRA, Social Security Commission and sectoral registrations are
   not applicable and how a Not-applicable answer is verified;
3. identify the NIPDB MSME lookup key and decide whether registry checks are
   integrations or manual checks for the initial release;
4. define “functional” bank account evidence and acceptable document recency;
5. decide which date starts the operating-period calculation when registration
   and actual trading began on different dates;
6. approve assessment rubrics for business-model feasibility and market
   readiness;
7. decide whether non-compliant business profiles and pitch decks trigger an
   RFI, a manual override or rejection;
8. define whose police clearance is required, its validity period and the
   acceptable age of proof of application; and
9. approve the proposed `PROGRAMME_ADMINISTRATOR` manual decision ownership or
   select another configured screening role.

No unresolved `TBD` may be replaced with an implementation assumption. A Draft
seed may preserve unresolved review metadata, but a Ruleset Version must not be
published until every runtime-affecting decision and source binding is resolved.

## 5. Seed conversion contract

After approval, each matrix row maps to configuration without evaluator
changes:

- one version-owned Eligibility Input Definition using the stable seed key,
  input type and `BOTH` availability;
- one Self Check question binding containing the question text, response type,
  validation and explanatory content;
- one Screening source binding to the exact configured form field, document
  requirement, checklist item, manual assessment or integration output;
- one Eligibility Rule containing the proposed condition, failure type, reason
  code and applicant-facing message; and
- review and audit metadata identifying the approving business owner and
  approval date.

The seed must create an editable Draft version, must not publish it, and must
not overwrite later administrator or business-owner changes when re-run.

## 6. Traceability

The proposed criteria and thresholds come from `Website Information
Request_.docx`, section 3, “Application Workflow & Eligibility Logic”. The
source explicitly identifies the incubation or acceleration criterion as
optional. The evidence model and the requirement for a shared Self Check and
Screening ruleset come from `ME-Workflow-Engine-Specification.docx`, sections
4.3, 7 and 12.3. Manual ownership follows the proposed standard workflow in
`SME_Fund_Standard_Workflow_Template.md`, section 9.1.
