export const applicationLifecycleStatuses = [
  "draft",
  "submitted",
  "withdrawn",
] as const;

export type ApplicationLifecycleStatus =
  (typeof applicationLifecycleStatuses)[number];

export const applicationDuplicatePolicies = [
  "one_per_applicant",
  "one_per_business",
  "none",
] as const;

export type ApplicationDuplicatePolicy =
  (typeof applicationDuplicatePolicies)[number];

export type ApplicationWorkflowLink = {
  workflowInstanceId: string;
  workflowTemplateVersionId: string;
};

export type ApplicationAggregate = {
  businessId: string | null;
  createdAt: Date;
  eligibilityRuleSetVersionId: string;
  formVersionId: string;
  fundingCallId: string;
  id: string;
  latestDraftResponseId: string | null;
  ownerApplicantUserId: string;
  reference: string | null;
  rowVersion: number;
  status: ApplicationLifecycleStatus;
  submissionSnapshotId: string | null;
  submittedAt: Date | null;
  updatedAt: Date;
  withdrawnAt: Date | null;
  workflow: ApplicationWorkflowLink | null;
};
