export type ApplicationStatus =
  | "Submitted"
  | "Completeness Check"
  | "Technical Assessment"
  | "Finance Review"
  | "More Information"
  | "Approved"
  | "Declined";

export type AdminApplication = {
  applicant: string;
  business: string;
  documents: number;
  employees: number;
  id: string;
  jobs: number;
  ownership: number;
  region: string;
  requested: number;
  sector: string;
  status: ApplicationStatus;
  submitted: string;
  summary: string;
  turnover: string;
  useOfFunds: string;
};

export type AdminApplicationStage = {
  endedAt: string | null;
  name: string;
  startedAt: string | null;
  status: "NOT_STARTED" | "ACTIVE" | "BLOCKED" | "COMPLETED" | "CANCELLED";
};

export type AdminApplicationOverview = {
  applicantName: string;
  applicationId: string;
  businessName: string | null;
  businessType: string | null;
  coFunding: number | null;
  currentStageName: string | null;
  industry: string | null;
  location: string | null;
  opportunityTitle: string;
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  reference: string;
  requestedAmount: number | null;
  stages: AdminApplicationStage[];
  submittedAt: string;
};

import type {
  ApplicationBusinessSection,
  ApplicationFinancialSection,
  ApplicationProjectSection,
  ApplicationSection,
  ApplicationSectionCompletion,
} from "./ApplicationSchemas";
import type { ApplicationDeclarationsSection } from "./ApplicationDeclarationSchemas";

export type ApplicationSummary = {
  businessName: string | null;
  createdAt: string;
  currentSection: ApplicationSection;
  fundingOpportunityId: string;
  fundingOpportunityTitle: string;
  id: string;
  progressPercent: number;
  status: import("./domain/Application").ApplicationLifecycleStatus;
  updatedAt: string;
};

export type ApplicationListInput = {
  after?: string;
  limit: number;
  status?: "draft" | "submitted" | "under-review" | "completed";
};

export type ApplicationStatusCounts = {
  all: number;
  completed: number;
  draft: number;
  submitted: number;
  underReview: number;
};

export type ApplicationPage = {
  counts: ApplicationStatusCounts;
  items: ApplicationSummary[];
  nextCursor: string | null;
  total: number;
};

export type ApplicationView = ApplicationSummary & {
  businessSection: Partial<ApplicationBusinessSection>;
  declarationsSection: Partial<ApplicationDeclarationsSection>;
  financialSection: Partial<ApplicationFinancialSection>;
  eligibilityRuleSetVersionId: string;
  formVersionId: string;
  projectSection: Partial<ApplicationProjectSection>;
  rowVersion: number;
  sectionCompletion: ApplicationSectionCompletion;
};

export type ApplicationSubmission = {
  applicationId: string;
  reference: string;
  submittedAt: string;
  workflowInstanceId: string;
  workflowVersionId: string;
};

export const adminApplicationStatuses = [
  "all",
  "submitted",
  "under-review",
  "action-required",
  "outcome-available",
  "closed",
] as const;

export type AdminApplicationStatusFilter =
  (typeof adminApplicationStatuses)[number];

export type AdminApplicationListRow = {
  activeStageName: string | null;
  activeTaskCount: number;
  applicantName: string;
  applicantStatus: string;
  applicationId: string;
  assignedRoleName: string | null;
  assignedUserName: string | null;
  businessName: string | null;
  dueAt: string | null;
  fundingCallTitle: string;
  internalStatus: string;
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  reference: string;
  requestedAmount: number | null;
  rowVersion: number;
  submittedAt: string;
};

export type AdminApplicationListInput = {
  after?: string;
  limit: number;
  search?: string;
  stage?: string;
  status: AdminApplicationStatusFilter;
};

export type AdminApplicationPage = {
  items: AdminApplicationListRow[];
  nextCursor: string | null;
  total: number;
};
