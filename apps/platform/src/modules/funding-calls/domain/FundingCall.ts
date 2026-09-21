export const fundingCallStatuses = [
  "DRAFT",
  "SCHEDULED",
  "OPEN",
  "CLOSED",
  "CANCELLED",
] as const;

export type FundingCallStatus = (typeof fundingCallStatuses)[number];

export type FundingCall = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  description: string;
  eligibilitySummary: string | null;
  eligibilityRuleSetVersionId: string | null;
  formVersionId: string | null;
  fundingInstrument: string | null;
  thematicArea: string | null;
  totalBudgetEnvelope: string;
  workflowTemplateVersionId: string | null;
  minimumGrantAmount: string;
  maximumGrantAmount: string;
  opensAt: Date;
  closesAt: Date;
  status: FundingCallStatus;
  publicContactName: string | null;
  publicContactEmail: string | null;
  publicContactPhone: string | null;
  rowVersion: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FundingCallPublicDocument = {
  label: string;
  url: string;
};
