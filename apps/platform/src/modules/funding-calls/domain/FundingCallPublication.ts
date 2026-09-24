import type { FundingCall, FundingCallPublicDocument } from "./FundingCall";

type PublicationFields = Pick<
  FundingCall,
  | "applicationDuplicatePolicy"
  | "description"
  | "eligibilityRuleSetVersionId"
  | "eligibilitySummary"
  | "formVersionId"
  | "fundingInstrument"
  | "maximumGrantAmount"
  | "minimumGrantAmount"
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

export type FundingCallPublicationSnapshot = PublicationFields & {
  closesAt: string;
  opensAt: string;
  publicDocuments: FundingCallPublicDocument[];
};

export function captureFundingCallPublication(
  call: FundingCall,
  publicDocuments: FundingCallPublicDocument[],
): FundingCallPublicationSnapshot {
  return {
    applicationDuplicatePolicy: call.applicationDuplicatePolicy,
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
    publicDocuments,
    reference: call.reference,
    slug: call.slug,
    thematicArea: call.thematicArea,
    title: call.title,
    totalBudgetEnvelope: call.totalBudgetEnvelope,
    workflowTemplateVersionId: call.workflowTemplateVersionId,
  };
}
