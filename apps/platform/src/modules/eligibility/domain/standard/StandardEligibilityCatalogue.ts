import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";
import type { JsonPrimitive } from "@/modules/conditions/domain/Operand";
import type {
  EligibilityFailureType,
} from "../EligibilityRule";
import type { SelfCheckAnswerType } from "../EligibilityInputDefinition";

export const standardEligibilityRuleSetCode = "SME_FUND_BASELINE";
export const standardEligibilitySourceDocument =
  "SME_Fund_Eligibility_Configuration_Decision_Matrix.md";

export type StandardEligibilityCriterion = {
  applicantMessage: string;
  constant: JsonPrimitive;
  failureType: EligibilityFailureType;
  inputType: ConditionFieldType;
  label: string;
  operator: "EQUALS" | "GREATER_THAN_OR_EQUAL";
  prompt: string;
  questionType: SelfCheckAnswerType | null;
  reasonCode: string;
  stableKey: string;
};

export const standardEligibilityCriteria = [
  {
    applicantMessage:
      "Your business does not meet the minimum Namibian ownership and control requirement for this funding call.",
    constant: 51,
    failureType: "HARD_FAIL",
    inputType: "NUMBER",
    label: "Namibian ownership percentage",
    operator: "GREATER_THAN_OR_EQUAL",
    prompt: "What percentage of the business is Namibian-owned and controlled?",
    questionType: "PERCENTAGE",
    reasonCode: "NAMIBIAN_OWNERSHIP_BELOW_MINIMUM",
    stableKey: "namibian_ownership_percentage",
  },
  {
    applicantMessage:
      "Your business must be registered on the NIPDB MSME database for this funding call.",
    constant: true,
    failureType: "HARD_FAIL",
    inputType: "BOOLEAN",
    label: "NIPDB MSME database registration",
    operator: "EQUALS",
    prompt: "Is your business registered on the NIPDB MSME database?",
    questionType: "BOOLEAN",
    reasonCode: "NIPDB_MSME_REGISTRATION_REQUIRED",
    stableKey: "nipdb_msme_database_registered",
  },
  {
    applicantMessage:
      "Your business is missing a statutory or sectoral registration required for this funding call.",
    constant: "YES",
    failureType: "HARD_FAIL",
    inputType: "TEXT",
    label: "Applicable registrations verified",
    operator: "EQUALS",
    prompt:
      "Does your business hold all statutory and sectoral registrations that apply to it?",
    questionType: "YES_NO_NA",
    reasonCode: "APPLICABLE_REGISTRATION_MISSING",
    stableKey: "applicable_registrations_verified",
  },
  {
    applicantMessage:
      "Your business must be in good standing with NAMRA for this funding call.",
    constant: true,
    failureType: "HARD_FAIL",
    inputType: "BOOLEAN",
    label: "NAMRA good standing",
    operator: "EQUALS",
    prompt: "Is your business currently in good standing with NAMRA?",
    questionType: "BOOLEAN",
    reasonCode: "NAMRA_GOOD_STANDING_REQUIRED",
    stableKey: "namra_good_standing",
  },
  {
    applicantMessage:
      "Your business must be in good standing with the Social Security Commission for this funding call.",
    constant: true,
    failureType: "HARD_FAIL",
    inputType: "BOOLEAN",
    label: "Social Security Commission good standing",
    operator: "EQUALS",
    prompt:
      "Is your business currently in good standing with the Social Security Commission?",
    questionType: "BOOLEAN",
    reasonCode: "SOCIAL_SECURITY_GOOD_STANDING_REQUIRED",
    stableKey: "social_security_good_standing",
  },
  {
    applicantMessage:
      "Your business must have valid MSME status for this funding call.",
    constant: true,
    failureType: "HARD_FAIL",
    inputType: "BOOLEAN",
    label: "Valid MSME status",
    operator: "EQUALS",
    prompt:
      "Does your business currently have valid MSME status or a valid MSME certificate?",
    questionType: "BOOLEAN",
    reasonCode: "VALID_MSME_STATUS_REQUIRED",
    stableKey: "msme_status_valid",
  },
  {
    applicantMessage:
      "Your business must have a functional business bank account for this funding call.",
    constant: true,
    failureType: "HARD_FAIL",
    inputType: "BOOLEAN",
    label: "Functional business bank account",
    operator: "EQUALS",
    prompt: "Does your business have a functional bank account in the business’s name?",
    questionType: "BOOLEAN",
    reasonCode: "FUNCTIONAL_BUSINESS_BANK_ACCOUNT_REQUIRED",
    stableKey: "functional_business_bank_account",
  },
  {
    applicantMessage:
      "Your business must have been operating for at least one year for this funding call.",
    constant: 12,
    failureType: "HARD_FAIL",
    inputType: "NUMBER",
    label: "Complete operating months",
    operator: "GREATER_THAN_OR_EQUAL",
    prompt: "For how many complete months has your business been operating?",
    questionType: "NUMBER",
    reasonCode: "MINIMUM_OPERATING_PERIOD_NOT_MET",
    stableKey: "operating_months",
  },
  {
    applicantMessage:
      "Your business model, traction or growth potential requires further review.",
    constant: true,
    failureType: "SOFT_FAIL",
    inputType: "BOOLEAN",
    label: "Business model feasibility",
    operator: "EQUALS",
    prompt:
      "Can you demonstrate a feasible business model with existing traction and growth potential?",
    questionType: "BOOLEAN",
    reasonCode: "BUSINESS_MODEL_REQUIRES_REVIEW",
    stableKey: "business_model_feasible",
  },
  {
    applicantMessage:
      "Your readiness for market expansion, export or investment opportunities requires further review.",
    constant: true,
    failureType: "SOFT_FAIL",
    inputType: "BOOLEAN",
    label: "Market expansion readiness",
    operator: "EQUALS",
    prompt:
      "Is your business ready for market expansion, export or investment opportunities?",
    questionType: "BOOLEAN",
    reasonCode: "MARKET_READINESS_REQUIRES_REVIEW",
    stableKey: "market_expansion_readiness",
  },
  {
    applicantMessage:
      "You have not confirmed prior participation in, or a commitment to complete, a pre-incubation or acceleration programme. This does not make you ineligible.",
    constant: true,
    failureType: "WARNING",
    inputType: "BOOLEAN",
    label: "Incubation or acceleration commitment",
    operator: "EQUALS",
    prompt:
      "Have you completed a pre-incubation or acceleration programme, or will you commit to completing one if selected?",
    questionType: "BOOLEAN",
    reasonCode: "INCUBATION_OR_ACCELERATION_NOT_CONFIRMED",
    stableKey: "incubation_or_acceleration_commitment",
  },
  {
    applicantMessage:
      "Your business profile must be no longer than five pages. Please provide a compliant document if requested.",
    constant: true,
    failureType: "SOFT_FAIL",
    inputType: "BOOLEAN",
    label: "Business profile within page limit",
    operator: "EQUALS",
    prompt: "Is your business profile no longer than five pages?",
    questionType: "BOOLEAN",
    reasonCode: "BUSINESS_PROFILE_PAGE_LIMIT_EXCEEDED",
    stableKey: "business_profile_within_page_limit",
  },
  {
    applicantMessage:
      "Your pitch deck must be no longer than twelve slides. Please provide a compliant document if requested.",
    constant: true,
    failureType: "SOFT_FAIL",
    inputType: "BOOLEAN",
    label: "Pitch deck within slide limit",
    operator: "EQUALS",
    prompt: "Is your pitch deck no longer than twelve slides?",
    questionType: "BOOLEAN",
    reasonCode: "PITCH_DECK_SLIDE_LIMIT_EXCEEDED",
    stableKey: "pitch_deck_within_slide_limit",
  },
  {
    applicantMessage:
      "A valid police clearance certificate or proof of application is required for this funding call.",
    constant: true,
    failureType: "HARD_FAIL",
    inputType: "BOOLEAN",
    label: "Police clearance evidence present",
    operator: "EQUALS",
    prompt:
      "Can you provide a valid police clearance certificate or proof that you have applied for one?",
    questionType: "BOOLEAN",
    reasonCode: "POLICE_CLEARANCE_EVIDENCE_REQUIRED",
    stableKey: "police_clearance_or_application_proof_present",
  },
] as const satisfies readonly StandardEligibilityCriterion[];
