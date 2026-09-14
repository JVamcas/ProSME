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

import type {
  ApplicationBusinessSection,
  ApplicationFinancialSection,
  ApplicationProjectSection,
  ApplicationSection,
  ApplicationSectionCompletion,
} from "./ApplicationSchemas";
import type { ApplicationDeclarationsSection } from "./ApplicationDeclarationSchemas";

export type ApplicationSummary = {
  createdAt: string;
  currentSection: ApplicationSection;
  fundingOpportunityId: number;
  fundingOpportunityTitle: string;
  id: string;
  progressPercent: number;
  status: "draft";
  updatedAt: string;
};

export type ApplicationListInput = {
  after?: string;
  limit: number;
  status?: "draft";
};

export type ApplicationPage = {
  items: ApplicationSummary[];
  nextCursor: string | null;
  total: number;
};

export type ApplicationView = ApplicationSummary & {
  businessSection: Partial<ApplicationBusinessSection>;
  declarationsSection: Partial<ApplicationDeclarationsSection>;
  financialSection: Partial<ApplicationFinancialSection>;
  projectSection: Partial<ApplicationProjectSection>;
  rowVersion: number;
  sectionCompletion: ApplicationSectionCompletion;
};
