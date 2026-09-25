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
    stages: progress.stages.map((stage) => {
      const reviewingDefinitions = new Set(
        stage.tasks
          .filter((task) => task.assignedUserId === actor.id)
          .map((task) => task.taskDefinitionId),
      );

      return {
        ...stage,
        tasks: stage.tasks.map((task, index) => {
          const released = task.reviewRelease === "IMMEDIATE"
            || (task.reviewRelease === "THRESHOLD_MET"
              && task.thresholdSatisfied)
            || stage.status === "COMPLETED";
          const peerIsHidden = !released
            && task.reviewerCount !== null
            && task.reviewerCount > 1
            && reviewingDefinitions.has(task.taskDefinitionId)
            && task.assignedUserId !== actor.id;

          const {
            assignedRoleCode,
            assignedUserId,
            viewPermission,
            taskDefinitionId: _taskDefinitionId,
            reviewerCount: _reviewerCount,
            reviewRelease: _reviewRelease,
            thresholdSatisfied: _thresholdSatisfied,
            ...details
          } = task;
          void _taskDefinitionId;
          void _reviewerCount;
          void _reviewRelease;
          void _thresholdSatisfied;

          if (peerIsHidden) {
            return {
              ...details,
              actionedAt: null,
              assignedRoleName: null,
              assignedUserEmail: null,
              assignedUserName: null,
              dueAt: null,
              id: "peer-slot-" + String(index + 1),
              status: task.status === "COMPLETED" ? "COMPLETED" : "PENDING",
              canOpen: false,
            };
          }

          const assigned = assignedUserId
            ? assignedUserId === actor.id
            : assignedRoleCode !== null
              && actor.roleCodes.has(assignedRoleCode);
          return {
            ...details,
            canOpen: progress.status === "ACTIVE"
              && stage.status === "ACTIVE"
              && assigned
              && can(actor, permissionCodes.workflowTaskAssignedRead)
              && can(actor, viewPermission),
          };
        }),
      };
    }),
  };
}
