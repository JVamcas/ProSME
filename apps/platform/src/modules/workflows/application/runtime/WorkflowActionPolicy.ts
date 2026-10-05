import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { WorkflowElementPermissions } from "../../domain/definitions/WorkflowElementPermissions";
import { isWorkflowStageDecisionAction } from "../../domain/actions/WorkflowActionDefinition";
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
  activeDeferral?: boolean;
  activeDeferralReady?: boolean;
  activeEscalation?: boolean;
  activeEscalationBlocks?: boolean;
  activeEscalationTargetActor?: boolean;
  activeHold?: boolean;
  activeReferral?: boolean;
  assignedToActor: boolean;
  eligibilityReady?: boolean;
  prerequisitesComplete?: boolean;
  permissions: WorkflowElementPermissions;
  status: string;
} | null;

type PolicyAction = Pick<WorkflowActionDefinition, "actionType" | "enabled">;

export type WorkflowActionPolicyTarget = {
  canHold?: boolean;
  canResumeHold?: boolean;
  approvalEligibilityReady?: boolean;
  activeDeferral?: boolean;
  activeDeferralReady?: boolean;
  activeHold?: boolean;
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
  const resuming = target.action.actionType === "RESUME";
  const holding = target.action.actionType === "PUT_ON_HOLD";
  if (
    target.workflowStatus !== "ACTIVE" ||
    (resuming || holding
      ? !["ACTIVE", "BLOCKED"].includes(target.stageStatus)
      : target.stageStatus !== "ACTIVE") ||
    (target.task && !["PENDING", "IN_PROGRESS"].includes(target.task.status))
  ) {
    return unavailable(
      "INVALID_STATE",
      "This action is not available in the current state.",
    );
  }
  const resumableControl = Boolean(
    target.activeHold ||
    target.activeDeferral ||
    target.task?.activeHold ||
    target.task?.activeDeferral,
  );
  if (holding && (target.activeHold || target.task?.activeHold)) {
    return unavailable(
      "INVALID_STATE",
      "This work is already on hold. Resume the applicable holds first.",
    );
  }
  if (
    (resuming && !resumableControl) ||
    (resumableControl && !resuming && !holding)
  ) {
    return unavailable(
      "INVALID_STATE",
      resuming
        ? "This work does not have an active hold or deferral."
        : "This work is currently paused.",
    );
  }
  if (holding && target.canHold === false) {
    return unavailable(
      "PERMISSION_DENIED",
      "You cannot place this work on hold.",
    );
  }
  if (
    resuming &&
    (target.activeHold || target.task?.activeHold) &&
    target.canResumeHold === false
  ) {
    return unavailable(
      "PERMISSION_DENIED",
      "You cannot resume the active holds on this work.",
    );
  }
  if (
    resuming &&
    !target.activeHold &&
    !target.task?.activeHold &&
    target.activeDeferral &&
    !target.activeDeferralReady
  ) {
    return unavailable(
      "INVALID_STATE",
      "This deferral is not yet eligible to resume.",
    );
  }
  if (
    (target.activeDeferral || target.task?.activeDeferral) &&
    !["RESUME", "WITHDRAW", "PUT_ON_HOLD"].includes(target.action.actionType)
  ) {
    return unavailable(
      "INVALID_STATE",
      "This work is deferred until its configured continuation is available.",
    );
  }
  if (
    target.task?.activeReferral &&
    !holding &&
    !resuming &&
    target.action.actionType !== "WITHDRAW"
  ) {
    return unavailable(
      "INVALID_STATE",
      "This work is blocked until its referral is completed.",
    );
  }
  if (
    target.task?.activeEscalationBlocks &&
    !holding &&
    !resuming &&
    !target.task.activeEscalationTargetActor &&
    target.action.actionType !== "WITHDRAW"
  ) {
    return unavailable(
      "CONTEXT_MISMATCH",
      "This task is blocked pending escalation resolution.",
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
  if (target.action.actionType === "REFER") {
    return unavailable("INVALID_CONFIGURATION", "Refer has been removed.");
  }
  if (target.action.actionType === "WITHDRAW") {
    return unavailable(
      "INVALID_CONFIGURATION",
      "Withdrawal is initiated by the applicant through the applicant portal.",
    );
  }
  if (
    target.action.actionType === "APPROVE_ADVANCE" &&
    target.approvalEligibilityReady === false
  ) {
    return unavailable(
      "INVALID_STATE",
      "A current eligibility evaluation without hard failures is required to advance.",
    );
  }
  if (
    isWorkflowStageDecisionAction(target.action.actionType) &&
    target.task?.eligibilityReady === false
  ) {
    return unavailable(
      "INVALID_STATE",
      "Run eligibility using the current answers before choosing an action.",
    );
  }
  if (
    isWorkflowStageDecisionAction(target.action.actionType) &&
    target.task?.prerequisitesComplete === false
  ) {
    return unavailable(
      "INVALID_STATE",
      "Meet the required contributing review thresholds before making the stage decision.",
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
