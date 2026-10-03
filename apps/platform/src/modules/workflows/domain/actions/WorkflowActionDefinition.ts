import type { WorkflowActionConfigurationByType } from "./WorkflowActionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

export const supportedWorkflowActionTypes = [
  "APPROVE_ADVANCE",
  "REJECT",
  "REQUEST_INFORMATION",
  "RETURN",
  "ESCALATE",
  "PUT_ON_HOLD",
  "RESUME",
  "WITHDRAW",
  "DEFER",
] as const;

// Refer remains readable for historical definitions and execution records.
export const workflowActionTypes = [
  ...supportedWorkflowActionTypes,
  "REFER",
] as const;

export type WorkflowActionType = (typeof workflowActionTypes)[number];

export function isSupportedWorkflowAction(
  actionType: WorkflowActionType,
): boolean {
  return supportedWorkflowActionTypes.some((type) => type === actionType);
}

export const workflowStageDecisionActionTypes = [
  "APPROVE_ADVANCE",
  "REJECT",
  "WITHDRAW",
  "DEFER",
] as const satisfies readonly WorkflowActionType[];

export function isWorkflowStageDecisionAction(
  actionType: WorkflowActionType,
): boolean {
  return workflowStageDecisionActionTypes.some((type) => type === actionType);
}

type WorkflowActionDefinitionCommon = {
  condition?: ConditionGroup | null;
  id?: string;
  stableKey: string;
  label: string;
  enabled: boolean;
  displayOrder: number;
};

export type WorkflowActionDefinition = {
  [ActionType in WorkflowActionType]: WorkflowActionDefinitionCommon & {
    actionType: ActionType;
    reasonRequired: boolean;
    configuration: WorkflowActionConfigurationByType[ActionType];
  };
}[WorkflowActionType];

export function isRuntimeWorkflowControlAction(
  actionType: WorkflowActionType,
): actionType is "RETURN" {
  return actionType === "RETURN";
}
