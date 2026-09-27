import {
  isWorkflowStageDecisionAction,
  type WorkflowActionType,
} from "../actions/WorkflowActionDefinition";
import type { WorkflowTaskType } from "../definitions/WorkflowTaskDefinition";

export function taskActionMatchesType(input: {
  actionType: WorkflowActionType | null;
  taskType: WorkflowTaskType;
}): boolean {
  return (
    !input.actionType ||
    !isWorkflowStageDecisionAction(input.actionType) ||
    input.taskType === "STAGE_DECISION"
  );
}

export function shouldCompleteWorkflowTask(input: {
  actionKey: string | null;
  actionType: WorkflowActionType | null;
  taskType: WorkflowTaskType;
  workReady: boolean;
}): boolean {
  if (!input.workReady) return false;
  if (input.taskType === "CONTRIBUTING") return input.actionKey === null;
  return Boolean(
    input.actionKey &&
    input.actionType &&
    isWorkflowStageDecisionAction(input.actionType),
  );
}
