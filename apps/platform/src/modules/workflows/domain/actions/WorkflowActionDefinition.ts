import type { WorkflowActionConfigurationByType } from "./WorkflowActionConfiguration";

export const workflowActionTypes = [
  "APPROVE_ADVANCE",
  "REJECT",
  "REQUEST_INFORMATION",
  "RETURN",
  "REFER",
  "ESCALATE",
  "PUT_ON_HOLD",
  "WITHDRAW",
  "DEFER",
] as const;

export type WorkflowActionType = (typeof workflowActionTypes)[number];

type WorkflowActionDefinitionCommon = {
  id?: string;
  stableKey: string;
  label: string;
  enabled: boolean;
  reasonCodeRequired: boolean;
  displayOrder: number;
};

export type WorkflowActionDefinition = {
  [ActionType in WorkflowActionType]: WorkflowActionDefinitionCommon & {
    actionType: ActionType;
    configuration: WorkflowActionConfigurationByType[ActionType];
  };
}[WorkflowActionType];
