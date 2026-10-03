import "server-only";

import type { WorkflowActionType } from "../../domain/actions/WorkflowActionDefinition";
import {
  loadRequiredTaskCompletions,
  type StageCompletionTransaction,
} from "../../infrastructure/StageCompletionRepository";
import { stageCompletionRequirementsAreMet } from "../../domain/runtime/StageCompletion";
import { readWorkflowActionTaskReadiness } from "../../infrastructure/WorkflowActionTaskReadinessRepository";
import { evaluateStageQuorum } from "../../infrastructure/WorkflowQuorumRepository";

export function workflowActionCompletesTask(actionType: WorkflowActionType) {
  return ![
    "REQUEST_INFORMATION",
    "DEFER",
    "ESCALATE",
    "PUT_ON_HOLD",
    "REFER",
    "RESUME",
  ].includes(actionType);
}

export function workflowActionRequiresQuorum(actionType: WorkflowActionType) {
  return actionType === "APPROVE_ADVANCE" || actionType === "REJECT";
}

export async function readWorkflowActionReadiness(
  database: Pick<StageCompletionTransaction, "select" | "execute" | "insert">,
  input: {
    actionTypes: WorkflowActionType[];
    actorId: string;
    recordQuorumEvaluation: boolean;
    stageDefinitionId: string;
    stageInstanceId: string;
    taskId?: string;
  },
) {
  const [quorumSatisfied, task, requirements] = await Promise.all([
    input.actionTypes.some(workflowActionRequiresQuorum)
      ? evaluateStageQuorum(database, {
          actorId: input.actorId,
          recordEvaluation: input.recordQuorumEvaluation,
          stageDefinitionId: input.stageDefinitionId,
          stageInstanceId: input.stageInstanceId,
        })
      : true,
    input.taskId && input.actionTypes.some(workflowActionCompletesTask)
      ? readWorkflowActionTaskReadiness(database, input.taskId)
      : null,
    input.actionTypes.includes("APPROVE_ADVANCE")
      ? loadRequiredTaskCompletions(database, input.stageInstanceId, input.taskId)
      : [],
  ]);
  return {
    quorumSatisfied,
    stageRequirementsMet: stageCompletionRequirementsAreMet(requirements),
    task,
  };
}

export function workflowActionReadinessReason(
  actionType: WorkflowActionType,
  readiness: Awaited<ReturnType<typeof readWorkflowActionReadiness>>,
): string | null {
  if (workflowActionRequiresQuorum(actionType) && !readiness.quorumSatisfied) {
    return "The required participation quorum is absent.";
  }
  if (workflowActionCompletesTask(actionType) && readiness.task) {
    if (readiness.task.hasOpenRfi) {
      return "Close the open information request before completing this task.";
    }
    if (!readiness.task.workReady) {
      return "Complete the required task work before choosing this action.";
    }
  }
  if (actionType === "APPROVE_ADVANCE" && !readiness.stageRequirementsMet) {
    return "Complete the remaining required stage work before advancing.";
  }
  return null;
}
