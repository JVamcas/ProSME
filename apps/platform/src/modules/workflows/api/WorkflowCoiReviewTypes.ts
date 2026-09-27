export type WorkflowCoiReviewRow = {
  applicationReference: string;
  assignedRoleName: string | null;
  assignedUserName: string;
  stageName: string;
  submittedAt: string;
  taskId: string;
  taskName: string;
};

export type WorkflowCoiReviewPage = {
  items: WorkflowCoiReviewRow[];
  page: number;
  pageSize: number;
  total: number;
};

export type WorkflowCoiReviewListInput = {
  page: number;
  pageSize: number;
  search?: string;
};

export type WorkflowCoiReplacementCandidate = {
  displayName: string;
  id: string;
};

export type WorkflowCoiReviewDetail = WorkflowCoiReviewRow & {
  applicantName: string;
  disclosureText: string;
  businessName: string | null;
  replacementCandidates: WorkflowCoiReplacementCandidate[];
  rowVersion: number;
  subjectUserId: string;
};

export type WorkflowCoiReviewDecision = {
  decision: "CLEAR" | "RECUSE";
  expectedRowVersion: number;
  reason: string;
  replacementUserId?: string;
};
