export const fundingCallStatuses = [
  "DRAFT",
  "APPROVAL_PENDING",
  "APPROVED",
  "SCHEDULED",
  "LIVE",
  "SUSPENDED",
  "CLOSED",
  "WITHDRAWN",
  "ARCHIVED",
] as const;

export type FundingCallStatus = (typeof fundingCallStatuses)[number];

export type FundingCallPublishedStatus = "SCHEDULED" | "LIVE";

export type ApplicationDuplicatePolicy = import(
  "@/modules/applications/domain/Application"
).ApplicationDuplicatePolicy;

export type FundingCall = {
  applicationDuplicatePolicy: ApplicationDuplicatePolicy;
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
  suspendedFromStatus: FundingCallPublishedStatus | null;
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
