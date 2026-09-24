import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { WorkflowElementPermissions } from "../../domain/definitions/WorkflowElementPermissions";
import type { WorkflowActionDefinition } from "../../domain/actions/WorkflowActionDefinition";
import {
  evaluateStageCondition,
  type StageConditionEvaluation,
} from "../../engine/StageCondition";

const decisionActionTypes = new Set<WorkflowActionDefinition["actionType"]>([
  "APPROVE_ADVANCE",
  "DEFER",
  "REJECT",
  "RETURN",
  "WITHDRAW",
]);

type ActionPolicyTask = {
  assignedToActor: boolean;
  permissions: WorkflowElementPermissions;
  status: string;
} | null;

type PolicyAction = Pick<
  WorkflowActionDefinition,
  "actionType" | "enabled"
>;

export type WorkflowActionPolicyTarget = {
  action: PolicyAction;
  stageStatus: string;
  task: ActionPolicyTask;
  workflowStatus: string;
};

export type WorkflowActionPolicyResult = {
  available: boolean;
  reason:
    | "ACTION_DISABLED"
    | "CONDITION_FAILED"
    | "CONTEXT_MISMATCH"
    | "INVALID_CONFIGURATION"
    | "INVALID_STATE"
    | "PERMISSION_DENIED"
    | null;
  unavailableReason: string | null;
};

export type ConfiguredActionTransition = {
  condition: ConditionGroup | null;
  id: string;
};

export type WorkflowActionConditionResult = {
  actionEvaluation: StageConditionEvaluation;
  available: boolean;
  selectedTransitionId: string | null;
  transitionEvaluations: StageConditionEvaluation[];
};

export function requiredWorkflowActionPermission(
  action: PolicyAction,
  task: ActionPolicyTask,
) {
  const decision = decisionActionTypes.has(action.actionType);
  if (task) return decision ? task.permissions.decide : task.permissions.edit;
  return decision
    ? permissionCodes.workflowTaskAssignedDecide
    : permissionCodes.workflowTaskAssignedProcess;
}

export function evaluateWorkflowActionConditions(
  action: WorkflowActionDefinition,
  transitions: ConfiguredActionTransition[],
  context: Parameters<typeof evaluateStageCondition>[1],
): WorkflowActionConditionResult {
  const actionEvaluation = evaluateStageCondition(
    action.condition ?? null,
    context,
  );
  if (!actionEvaluation.passed) {
    return {
      actionEvaluation,
      available: false,
      selectedTransitionId: null,
      transitionEvaluations: [],
    };
  }
  const transitionEvaluations: StageConditionEvaluation[] = [];
  for (const transition of transitions) {
    const evaluation = evaluateStageCondition(transition.condition, context);
    transitionEvaluations.push(evaluation);
    if (evaluation.passed) {
      return {
        actionEvaluation,
        available: true,
        selectedTransitionId: transition.id,
        transitionEvaluations,
      };
    }
  }
  return {
    actionEvaluation,
    available: transitions.length === 0,
    selectedTransitionId: null,
    transitionEvaluations,
  };
}

export function evaluateWorkflowActionPolicy(
  actor: AuthenticatedUser,
  target: WorkflowActionPolicyTarget,
  input: {
    conditionsPass: boolean;
    configurationValid: boolean;
    targetsValid: boolean;
  },
): WorkflowActionPolicyResult {
  if (!target.action.enabled) {
    return unavailable(
      "ACTION_DISABLED",
      "This action is not currently enabled.",
    );
  }
  if (target.workflowStatus !== "ACTIVE"
    || target.stageStatus !== "ACTIVE"
    || (target.task
      && !["CLAIMED", "IN_PROGRESS"].includes(target.task.status))) {
    return unavailable(
      "INVALID_STATE",
      "This action is not available in the current state.",
    );
  }
  const permission = requiredWorkflowActionPermission(
    target.action,
    target.task,
  );
  if (!can(actor, permission)) {
    return unavailable(
      "PERMISSION_DENIED",
      "This action is not available to you.",
    );
  }
  if (target.task && !target.task.assignedToActor) {
    return unavailable(
      "CONTEXT_MISMATCH",
      "This action is not available to you.",
    );
  }
  if (!input.configurationValid || !input.targetsValid) {
    return unavailable(
      "INVALID_CONFIGURATION",
      "This action is temporarily unavailable.",
    );
  }
  if (!input.conditionsPass) {
    return unavailable(
      "CONDITION_FAILED",
      "Requirements for this action are not currently met.",
    );
  }
  return { available: true, reason: null, unavailableReason: null };
}

function unavailable(
  reason: Exclude<WorkflowActionPolicyResult["reason"], null>,
  unavailableReason: string,
): WorkflowActionPolicyResult {
  return { available: false, reason, unavailableReason };
}
