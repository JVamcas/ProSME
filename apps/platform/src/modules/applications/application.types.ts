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
