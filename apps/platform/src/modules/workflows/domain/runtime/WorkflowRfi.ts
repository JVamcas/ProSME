export const workflowRfiStatuses = [
  "OPEN",
  "RESPONDED",
  "CLOSED",
  "EXPIRED",
] as const;

export type WorkflowRfiStatus = (typeof workflowRfiStatuses)[number];

export const workflowRfiInitiationTypes = [
  "MANUAL",
  "STAGE_ACTIVATION",
] as const;

export type WorkflowRfiInitiationType =
  (typeof workflowRfiInitiationTypes)[number];

export type WorkflowRfiExpiryAction =
  | "CLOSE_REQUEST"
  | "ESCALATE"
  | "RETURN";

export type WorkflowRfiContinuationBehavior = "RESUME_SOURCE_TASK";

export type CreateWorkflowRfiRequest = {
  applicationId: string;
  continuation: {
    behavior: WorkflowRfiContinuationBehavior;
    sourceStageInstanceId: string;
    sourceTaskId: string;
  };
  correlationId: string;
  deadline: {
    days: number;
    expiryAction: WorkflowRfiExpiryAction;
    reminderDayOffsets: readonly number[];
  };
  editableFieldPaths: readonly string[];
  idempotencyKey: string;
  initiationType: WorkflowRfiInitiationType;
  instructions: string;
  participantScope: "APPLICATION_OWNER_AND_REQUESTER";
  question: string;
  recipientScope: "APPLICATION_OWNER";
  requestedDocumentRequirementIds: readonly string[];
  requesterId: string;
  source: {
    actionDefinitionId: string;
    actionKey: string;
    stageDefinitionId: string;
    stageInstanceId: string;
    stageKey: string;
    taskId: string;
    workflowInstanceId: string;
    workflowVersionId: string;
  };
};

export type CreateWorkflowRfiResult = {
  deadlineAt: Date;
  requestInformationId: string;
  status: "OPEN";
};

const allowedTransitions: Record<WorkflowRfiStatus, readonly WorkflowRfiStatus[]> = {
  OPEN: ["RESPONDED", "CLOSED", "EXPIRED"],
  RESPONDED: ["CLOSED"],
  CLOSED: [],
  EXPIRED: [],
};

export function canTransitionWorkflowRfi(
  current: WorkflowRfiStatus,
  target: WorkflowRfiStatus,
) {
  return allowedTransitions[current].includes(target);
}
