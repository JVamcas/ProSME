import type { FundingCallStatus } from "../domain/FundingCall";
import type {
  FundingCallCreationProgressValues,
  FundingCallCreationStep,
} from "./FundingCallSchemas";

export type FundingCallCreationProgressView = {
  currentStep: FundingCallCreationStep;
  id: string;
  rowVersion: number;
  updatedAt: string;
  values: FundingCallCreationProgressValues;
};

export type FundingCallView = {
  publicInteractionEnabled?: boolean;
  allowResubmissionAfterWithdrawal: boolean;
  applicationDuplicatePolicy: import("@/modules/applications/domain/Application").ApplicationDuplicatePolicy;
  currentPublishedVersionId?: string | null;
  currentPublishedVersionNumber?: number | null;
  sourcePublishedVersionNumber?: number | null;
  viewedPublishedVersionNumber?: number;
  draftVersionId?: string;
  viewedPublishedVersionId?: string;
  effectiveStatus?: FundingCallStatus;
  effectiveOpensAt?: string;
  effectiveClosesAt?: string;
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
  versionLinks?: {
    applicationForm: string | null;
    eligibilityRuleSet: string | null;
    workflowTemplate: string | null;
  };
  minimumGrantAmount: string;
  maximumGrantAmount: string;
  opensAt: string;
  closesAt: string;
  status: FundingCallStatus;
  attachmentsLockedAt?: string | null;
  publicContactName: string | null;
  publicContactEmail: string | null;
  publicContactPhone: string | null;
  thumbnailContentType?: string | null;
  thumbnailFileName?: string | null;
  thumbnailUrl?: string | null;
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

export type FundingCallVersionItem = {
  id: string;
  versionNumber: number | null;
  publishedAt: string | null;
  title: string;
  current: boolean;
  status: FundingCallStatus | "SUPERSEDED";
  kind: "published" | "working";
  sourceVersionNumber: number | null;
};
