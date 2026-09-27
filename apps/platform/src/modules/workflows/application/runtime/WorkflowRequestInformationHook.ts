import "server-only";

import {
  WorkflowActionExecutionError,
  type WorkflowActionInput,
} from "../../domain/actions/WorkflowActionExecution";
import type {
  WorkflowActionExecutionTarget,
  WorkflowActionExecutionTransaction,
} from "../../infrastructure/WorkflowActionExecutionRepository";
import { createWorkflowRfi } from "../../infrastructure/WorkflowRfiRepository";
import type {
  CreateWorkflowRfiRequest,
  CreateWorkflowRfiResult,
} from "../../domain/runtime/WorkflowRfi";
import type { ExecuteWorkflowActionInput } from "./ServerWorkflowActionOutcomeService";
import {
  sanitizeWorkflowRfiInstructions,
  workflowRfiInstructionsSummary,
} from "../../infrastructure/WorkflowRfiInstructions";

type RequestInformationInput = Extract<
  WorkflowActionInput,
  { actionType: "REQUEST_INFORMATION" }
>;
type RequestInformationTarget = WorkflowActionExecutionTarget & {
  action: Extract<
    WorkflowActionExecutionTarget["action"],
    { actionType: "REQUEST_INFORMATION" }
  >;
};

export type RequestInformationLifecycleHook = (
  transaction: WorkflowActionExecutionTransaction,
  request: CreateWorkflowRfiRequest,
) => Promise<CreateWorkflowRfiResult>;

function requiredApplicationId(target: RequestInformationTarget) {
  const applicationId = target.stage.application.id;
  if (typeof applicationId !== "string") {
    throw new WorkflowActionExecutionError(
      "INVALID_RUNTIME_CONTEXT",
      "The request for information has no application context.",
    );
  }
  return applicationId;
}

export function buildRequestInformationCreationRequest(input: {
  actorId: string;
  command: ExecuteWorkflowActionInput & { input: RequestInformationInput };
  target: RequestInformationTarget;
}): CreateWorkflowRfiRequest {
  const { configuration } = input.target.action;
  const taskId = input.target.task?.id;
  if (!taskId) {
    throw new WorkflowActionExecutionError(
      "INVALID_RUNTIME_CONTEXT",
      "A request for information must originate from a workflow task.",
    );
  }
  const instructions = sanitizeWorkflowRfiInstructions(
    input.command.input.instructions,
  );
  const question = workflowRfiInstructionsSummary(instructions);
  if (!question) {
    throw new WorkflowActionExecutionError(
      "INVALID_ACTION_INPUT",
      "Enter instructions for the applicant.",
    );
  }
  return {
    applicationId: requiredApplicationId(input.target),
    continuation: {
      behavior: configuration.continuation,
      sourceStageInstanceId: input.target.stage.stageInstanceId,
      sourceTaskId: taskId,
    },
    correlationId: input.command.correlationId,
    deadline: {
      days: configuration.deadlineDays,
      expiryAction: configuration.expiryAction,
      reminderDayOffsets: configuration.reminderDayOffsets,
    },
    editableFieldPaths: input.command.input.editableFieldPaths,
    idempotencyKey: input.command.idempotencyKey,
    initiationType: "MANUAL",
    instructions,
    question,
    participantScope: configuration.participantScope,
    recipientScope: configuration.recipientScope,
    requestedDocumentRequirementIds:
      input.command.input.requestedDocumentRequirementIds,
    requesterId: input.actorId,
    source: {
      actionDefinitionId: input.target.action.id,
      actionKey: input.target.action.stableKey,
      stageDefinitionId: input.target.stage.stageDefinitionId,
      stageInstanceId: input.target.stage.stageInstanceId,
      stageKey: input.target.stage.stageKey,
      taskId,
      workflowInstanceId: input.target.stage.workflowInstanceId,
      workflowVersionId: input.target.stage.workflowVersionId,
    },
  };
}

export const createRequestInformation: RequestInformationLifecycleHook =
  createWorkflowRfi;
