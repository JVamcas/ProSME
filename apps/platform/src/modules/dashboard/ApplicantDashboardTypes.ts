export type ApplicantDashboardActivity = {
  applicationId: string;
  applicationReference: string;
  fundingOpportunityTitle: string;
  eventCode: string;
  occurredAt: string;
};

export type ApplicantDashboardMetrics = {
  actionRequired: number;
  applicationsInProgress: number;
  openFundingOpportunities: number;
  submittedApplications: number;
};

export type ApplicantDashboardView = {
  activities: ApplicantDashboardActivity[];
  displayName: string;
  metrics: ApplicantDashboardMetrics;
  urgentRequests: import("@/modules/workflows/domain/runtime/WorkflowRfiView").WorkflowRfiSummary[];
};
