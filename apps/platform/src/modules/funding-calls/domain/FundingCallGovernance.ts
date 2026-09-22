import type { FundingCall } from "./FundingCall";

export const fundingCallGovernanceOutcomes = [
  "PENDING",
  "APPROVED",
  "RETURNED",
  "WITHDRAWN",
] as const;

export type FundingCallGovernanceOutcome =
  (typeof fundingCallGovernanceOutcomes)[number];

export type FundingCallGovernanceSnapshot = Pick<
  FundingCall,
  | "closesAt"
  | "description"
  | "eligibilityRuleSetVersionId"
  | "eligibilitySummary"
  | "formVersionId"
  | "fundingInstrument"
  | "maximumGrantAmount"
  | "minimumGrantAmount"
  | "opensAt"
  | "publicContactEmail"
  | "publicContactName"
  | "publicContactPhone"
  | "reference"
  | "slug"
  | "thematicArea"
  | "title"
  | "totalBudgetEnvelope"
  | "workflowTemplateVersionId"
>;

export type SerializedFundingCallGovernanceSnapshot = Omit<
  FundingCallGovernanceSnapshot,
  "closesAt" | "opensAt"
> & {
  closesAt: string;
  opensAt: string;
};

export function createFundingCallGovernanceSnapshot(
  call: FundingCall,
): SerializedFundingCallGovernanceSnapshot {
  return {
    closesAt: call.closesAt.toISOString(),
    description: call.description,
    eligibilityRuleSetVersionId: call.eligibilityRuleSetVersionId,
    eligibilitySummary: call.eligibilitySummary,
    formVersionId: call.formVersionId,
    fundingInstrument: call.fundingInstrument,
    maximumGrantAmount: call.maximumGrantAmount,
    minimumGrantAmount: call.minimumGrantAmount,
    opensAt: call.opensAt.toISOString(),
    publicContactEmail: call.publicContactEmail,
    publicContactName: call.publicContactName,
    publicContactPhone: call.publicContactPhone,
    reference: call.reference,
    slug: call.slug,
    thematicArea: call.thematicArea,
    title: call.title,
    totalBudgetEnvelope: call.totalBudgetEnvelope,
    workflowTemplateVersionId: call.workflowTemplateVersionId,
  };
}
