import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readWorkflowProgress } from "../../infrastructure/WorkflowProgressRepository";

export async function getWorkflowProgress(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requirePermission(user, permissionCodes.workflowInstanceAllRead);
  const progress = await readWorkflowProgress(applicationId);
  if (!progress) return null;

  return {
    ...progress,
    stages: progress.stages.map((stage) => ({
      ...stage,
      tasks: stage.tasks.map((task) => {
        const {
          assignedRoleCode,
          assignedUserId,
          viewPermission,
          ...details
        } = task;
        const assigned = assignedUserId
          ? assignedUserId === actor.id
          : assignedRoleCode !== null && actor.roleCodes.has(assignedRoleCode);
        return {
          ...details,
          canOpen: progress.status === "ACTIVE"
            && stage.status === "ACTIVE"
            && assigned
            && can(actor, permissionCodes.workflowTaskAssignedRead)
            && can(actor, viewPermission),
        };
      }),
    })),
  };
}
