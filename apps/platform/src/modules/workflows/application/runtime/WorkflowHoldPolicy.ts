import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  workflowHoldScopes,
  type WorkflowHoldScope,
} from "../../domain/runtime/WorkflowHold";
import {
  WorkflowActionExecutionError,
  type WorkflowActionInput,
} from "../../domain/actions/WorkflowActionExecution";
import type { ActiveWorkflowHold } from "../../infrastructure/WorkflowHoldRepository";

const holdPermissions = {
  TASK: permissionCodes.workflowTaskAssignedHold,
  STAGE: permissionCodes.workflowStageAllHold,
  APPLICATION: permissionCodes.workflowInstanceAllHold,
};

const resumePermissions = {
  TASK: permissionCodes.workflowTaskAssignedResume,
  STAGE: permissionCodes.workflowStageAllResume,
  APPLICATION: permissionCodes.workflowInstanceAllResume,
};

type HoldContext = { task: { id: string; assignedToActor: boolean } | null };

export function authorizedWorkflowHoldScopes(
  actor: AuthenticatedUser,
  context: HoldContext,
) {
  return workflowHoldScopes.filter(
    (scope) =>
      can(actor, holdPermissions[scope]) &&
      (scope !== "TASK" || context.task?.assignedToActor === true),
  );
}

export function authorizedWorkflowHoldResumptions(
  actor: AuthenticatedUser,
  context: HoldContext,
  holds: readonly ActiveWorkflowHold[],
) {
  return holds.filter(
    (hold) =>
      can(actor, resumePermissions[hold.scope]) &&
      (hold.scope !== "TASK" ||
        (context.task?.assignedToActor === true &&
          context.task.id === hold.taskId)),
  );
}

export function assertWorkflowHoldAction(
  actor: AuthenticatedUser,
  context: HoldContext,
  command: WorkflowActionInput,
  holds: readonly ActiveWorkflowHold[],
) {
  if (command.actionType === "PUT_ON_HOLD") {
    requirePermission(actor, holdPermissions[command.scope]);
    if (!authorizedWorkflowHoldScopes(actor, context).includes(command.scope)) {
      throw new WorkflowActionExecutionError(
        "INVALID_RUNTIME_CONTEXT",
        "The task is not assigned to you.",
      );
    }
    if (holds.some((hold) => hold.scope === command.scope)) {
      throw new WorkflowActionExecutionError(
        "ACTION_UNAVAILABLE",
        "This scope is already on hold.",
      );
    }
  }
  if (command.actionType === "RESUME" && command.holdId) {
    const hold = holds.find((item) => item.id === command.holdId);
    if (!hold) {
      throw new WorkflowActionExecutionError(
        "INVALID_RUNTIME_CONTEXT",
        "The hold does not apply to this work.",
      );
    }
    requirePermission(actor, resumePermissions[hold.scope]);
    if (!authorizedWorkflowHoldResumptions(actor, context, [hold]).length) {
      throw new WorkflowActionExecutionError(
        "INVALID_RUNTIME_CONTEXT",
        "The held task is not assigned to you.",
      );
    }
  } else if (command.actionType === "RESUME" && holds.length) {
    throw new WorkflowActionExecutionError(
      "INVALID_ACTION_INPUT",
      "Choose the hold to resume.",
    );
  }
}

export function holdScopePermission(scope: WorkflowHoldScope, resume = false) {
  return (resume ? resumePermissions : holdPermissions)[scope];
}
