export const workflowHoldScopes = ["TASK", "STAGE", "APPLICATION"] as const;

export type WorkflowHoldScope = (typeof workflowHoldScopes)[number];

export const workflowHoldScopeLabels: Record<WorkflowHoldScope, string> = {
  TASK: "This task",
  STAGE: "This stage",
  APPLICATION: "The application",
};

export type WorkflowHoldSummary = {
  id: string;
  scope: WorkflowHoldScope;
  heldAt: string;
  heldBy: string;
  reason: string | null;
  reviewAt: string | null;
};
