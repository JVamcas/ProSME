import type { WorkflowActionConfigurationByType } from "./WorkflowActionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

export const workflowActionTypes = [
  "APPROVE_ADVANCE",
  "REJECT",
  "REQUEST_INFORMATION",
  "RETURN",
  "REFER",
  "ESCALATE",
  "PUT_ON_HOLD",
  "RESUME",
  "WITHDRAW",
  "DEFER",
] as const;

export type WorkflowActionType = (typeof workflowActionTypes)[number];

export const workflowStageDecisionActionTypes = [
  "APPROVE_ADVANCE",
  "REJECT",
  "RETURN",
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
    reasonCodeRequired: ActionType extends "REJECT" ? false : boolean;
    configuration: WorkflowActionConfigurationByType[ActionType];
  };
}[WorkflowActionType];
