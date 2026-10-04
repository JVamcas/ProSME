import "server-only";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import { readOwnEscalationTracking } from "../../infrastructure/WorkflowEscalationTrackingRepository";
import { readWorkflowActionAvailabilitySource } from "../../infrastructure/WorkflowActionAvailabilityRepository";
import type { WorkflowEscalationTracking } from "../../domain/runtime/WorkflowEscalationTracking";
import { workflowActionDefinitionSchema } from "../../domain/actions/WorkflowActionSchemas";
import {
  emptyWorkflowActionInputMetadata,
  workflowActionInputMetadata,
  workflowActionPresentation,
} from "../../domain/actions/WorkflowActionAvailability";

export async function getWorkflowEscalationTracking(
  user: AuthenticatedUser | null,
  taskId: string,
): Promise<WorkflowEscalationTracking | null> {
  const actor = requirePermission(
    user,
    permissionCodes.workflowTaskAssignedRead,
  );
  const tracking = await readOwnEscalationTracking(actor.id, taskId);
  if (!tracking) return null;
  requirePermission(actor, tracking.permissions.view);
  const source = await readWorkflowActionAvailabilitySource({
    actorId: actor.id,
    taskId,
    sourceStageInstanceId: tracking.stageInstanceId,
    workflowInstanceId: tracking.workflowInstanceId,
  });
  return {
    id: tracking.id,
    taskId,
    taskName: tracking.taskName,
    stageName: tracking.stageName,
    rowVersion: tracking.rowVersion,
    assignedUserName: tracking.assignedUserName,
    assignedRoleName: tracking.assignedRoleName,
    canCancel: tracking.canCancel,
    actions: (source?.actions ?? []).map((action) => {
      const parsed = workflowActionDefinitionSchema.safeParse(action);
      return {
        actionType: action.actionType,
        key: action.stableKey,
        label: action.label,
        available: false,
        unavailableReason:
          "This task is assigned to another reviewer. You can only cancel your escalation.",
        presentation: parsed.success
          ? workflowActionPresentation(parsed.data)
          : { displayOrder: action.displayOrder, variant: "outline" },
        requiredInput: parsed.success
          ? workflowActionInputMetadata(parsed.data)
          : emptyWorkflowActionInputMetadata,
        runtimeVersion: source?.stage.rowVersion ?? 1,
      };
    }),
  };
}
