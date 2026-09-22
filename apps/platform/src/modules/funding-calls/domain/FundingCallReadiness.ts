import type { FundingCall } from "./FundingCall";

export const fundingCallReadinessIssueCodes = [
  "REFERENCE_REQUIRED",
  "REFERENCE_NOT_UNIQUE",
  "SLUG_REQUIRED",
  "SLUG_NOT_UNIQUE",
  "TITLE_REQUIRED",
  "DESCRIPTION_REQUIRED",
  "FUNDING_INSTRUMENT_REQUIRED",
  "THEMATIC_AREA_REQUIRED",
  "PUBLIC_CONTACT_REQUIRED",
  "INVALID_BUDGET_ENVELOPE",
  "INVALID_AWARD_RANGE",
  "INVALID_APPLICATION_WINDOW",
  "CLOSING_DATE_NOT_FUTURE",
  "FORM_VERSION_REQUIRED",
  "FORM_VERSION_NOT_PUBLISHED",
  "FORM_DEFINITION_INACTIVE",
  "ELIGIBILITY_VERSION_REQUIRED",
  "ELIGIBILITY_VERSION_NOT_PUBLISHED",
  "ELIGIBILITY_DEFINITION_INACTIVE",
  "WORKFLOW_VERSION_REQUIRED",
  "WORKFLOW_VERSION_NOT_PUBLISHED",
  "WORKFLOW_DEFINITION_INACTIVE",
  "ELIGIBILITY_FIELD_INCOMPATIBLE",
  "WORKFLOW_CONFIGURATION_INVALID",
  "DECLARATIONS_NOT_CONFIGURED",
  "DOCUMENT_REQUIREMENTS_NOT_CONFIGURED",
  "PUBLIC_GUIDANCE_NOT_CONFIGURED",
  "PUBLIC_DOCUMENT_NOT_FINALIZED",
  "PUBLIC_DOCUMENT_NOT_SECURITY_CLEARED",
  "PUBLIC_DOCUMENT_NOT_MARKED_FOR_PUBLICATION",
  "PUBLIC_DOCUMENT_URL_UNSAFE",
  "APPLICANT_STATUS_MAPPING_MISSING",
  "NOTIFICATION_HOOK_MISSING",
] as const;

export type FundingCallReadinessIssueCode =
  (typeof fundingCallReadinessIssueCodes)[number];

export type FundingCallReadinessReference = {
  id: string;
  kind: "ELIGIBILITY_VERSION" | "FORM_VERSION" | "FUNDING_CALL"
    | "PUBLIC_DOCUMENT" | "WORKFLOW_VERSION";
};

export type FundingCallReadinessIssue = {
  code: FundingCallReadinessIssueCode;
  location: string;
  message: string;
  owner: FundingCallReadinessReference;
};

export type FundingCallReadinessResult = {
  checkedAt: string;
  fundingCallId: string;
  issues: FundingCallReadinessIssue[];
  ready: boolean;
  rowVersion: number;
};

function issue(
  call: FundingCall,
  code: FundingCallReadinessIssueCode,
  location: string,
  message: string,
): FundingCallReadinessIssue {
  return {
    code,
    location,
    message,
    owner: { id: call.id, kind: "FUNDING_CALL" },
  };
}

function missing(value: string | null) {
  return !value?.trim();
}

export function validateFundingCallDetails(
  call: FundingCall,
  now: Date,
): FundingCallReadinessIssue[] {
  const issues: FundingCallReadinessIssue[] = [];
  if (missing(call.reference)) issues.push(issue(
    call, "REFERENCE_REQUIRED", "reference", "Add a stable reference.",
  ));
  if (missing(call.slug)) issues.push(issue(
    call, "SLUG_REQUIRED", "slug", "Add a stable public slug.",
  ));
  if (missing(call.title)) issues.push(issue(
    call, "TITLE_REQUIRED", "title", "Add a public title.",
  ));
  if (missing(call.description)) issues.push(issue(
    call, "DESCRIPTION_REQUIRED", "description", "Add a public description.",
  ));
  if (missing(call.fundingInstrument)) issues.push(issue(
    call, "FUNDING_INSTRUMENT_REQUIRED", "fundingInstrument",
    "Select a funding instrument.",
  ));
  if (missing(call.thematicArea)) issues.push(issue(
    call, "THEMATIC_AREA_REQUIRED", "thematicArea",
    "Select a thematic area.",
  ));
  if (
    missing(call.publicContactName)
    || missing(call.publicContactEmail) && missing(call.publicContactPhone)
  ) issues.push(issue(
    call, "PUBLIC_CONTACT_REQUIRED", "publicContact",
    "Add a contact name and an email address or phone number.",
  ));
  const budget = Number(call.totalBudgetEnvelope);
  const minimum = Number(call.minimumGrantAmount);
  const maximum = Number(call.maximumGrantAmount);
  if (!Number.isFinite(budget) || budget < 0 || budget < maximum) {
    issues.push(issue(
      call, "INVALID_BUDGET_ENVELOPE", "totalBudgetEnvelope",
      "The budget envelope must be non-negative and cover the maximum award.",
    ));
  }
  if (
    !Number.isFinite(minimum) || !Number.isFinite(maximum)
    || minimum < 0 || maximum < minimum
  ) issues.push(issue(
    call, "INVALID_AWARD_RANGE", "awardRange",
    "The minimum and maximum award relationship is invalid.",
  ));
  if (call.opensAt >= call.closesAt) issues.push(issue(
    call, "INVALID_APPLICATION_WINDOW", "closesAt",
    "The closing date must be after the opening date.",
  ));
  if (call.closesAt <= now) issues.push(issue(
    call, "CLOSING_DATE_NOT_FUTURE", "closesAt",
    "Move the closing date into the future before publication.",
  ));
  if (missing(call.eligibilitySummary)) issues.push(issue(
    call, "PUBLIC_GUIDANCE_NOT_CONFIGURED", "eligibilitySummary",
    "Add applicant-facing eligibility guidance.",
  ));
  return issues;
}
