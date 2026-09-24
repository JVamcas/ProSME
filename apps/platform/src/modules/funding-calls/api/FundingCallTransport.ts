import type { FundingCallStatus } from "../domain/FundingCall";

export type FundingCallView = {
  applicationDuplicatePolicy: import(
    "@/modules/applications/domain/Application"
  ).ApplicationDuplicatePolicy;
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
  opensAt: string;
  closesAt: string;
  status: FundingCallStatus;
  publicContactName: string | null;
  publicContactEmail: string | null;
  publicContactPhone: string | null;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type FundingCallPage = {
  items: FundingCallView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
