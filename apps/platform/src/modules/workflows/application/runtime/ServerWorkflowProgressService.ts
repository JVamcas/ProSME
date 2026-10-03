import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requirePermission } from "@/auth/authorization/policy";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { WorkflowProgressView } from "../../api/WorkflowProgressTypes";
import { readAssignedWorkflowProgressContext } from "../../infrastructure/WorkflowProgressAccessRepository";
import { findWorkflowGraph } from "../../infrastructure/WorkflowGraphRepository";
import {
  readWorkflowProgress,
  readWorkflowTakenPaths,
} from "../../infrastructure/WorkflowProgressRepository";

export async function getWorkflowProgress(
  user: AuthenticatedUser | null,
  applicationId: string,
  context?: { taskId: string },
): Promise<WorkflowProgressView | null> {
  const actor = requirePermission(
    user,
    context && !can(user, permissionCodes.workflowInstanceAllRead)
      ? permissionCodes.workflowInstanceAssignedRead
      : permissionCodes.workflowInstanceAllRead,
  );
  let assignedInstanceId: string | undefined;
  if (context) {
    requirePermission(actor, permissionCodes.workflowTaskAssignedRead);
    const task = await readAssignedWorkflowProgressContext(actor.id, context.taskId);
    if (!task || task.applicationId !== applicationId) {
      throw new PermissionDeniedError(permissionCodes.workflowInstanceAssignedRead);
    }
    requirePermission(actor, task.viewPermission);
    assignedInstanceId = task.workflowInstanceId;
  }
  const progress = await readWorkflowProgress(applicationId);
  if (!progress) return null;
  if (assignedInstanceId && progress.id !== assignedInstanceId) {
    throw new PermissionDeniedError(permissionCodes.workflowInstanceAssignedRead);
  }

  // The instance determines which immutable template version supplies its flow.
  const { versionId, ...details } = progress;
  const [definition, takenPaths] = await Promise.all([
    findWorkflowGraph(versionId),
    readWorkflowTakenPaths(progress.id),
  ]);

  return {
    ...details,
    graph: definition?.graph ?? null,
    takenPaths,
    stages: progress.stages.map((stage) => {
      const reviewingDefinitions = new Set(
        stage.tasks
          .filter((task) => task.assignedUserId === actor.id)
          .map((task) => task.taskDefinitionId),
      );

      return {
        ...stage,
        tasks: stage.tasks.map((task, index) => {
          const released =
            task.reviewRelease === "IMMEDIATE" ||
            (task.reviewRelease === "THRESHOLD_MET" &&
              task.thresholdSatisfied) ||
            (stage.status === "COMPLETED" || stage.status === "RETURNED");
          const peerIsHidden =
            !released &&
            task.reviewerCount !== null &&
            task.reviewerCount > 1 &&
            reviewingDefinitions.has(task.taskDefinitionId) &&
            task.assignedUserId !== actor.id;

          const {
            assignedRoleCode,
            assignedUserId,
            viewPermission,
            taskDefinitionId: _taskDefinitionId,
            reviewerCount: _reviewerCount,
            reviewRelease: _reviewRelease,
            thresholdSatisfied: _thresholdSatisfied,
            prerequisitesComplete,
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
            : assignedRoleCode !== null &&
              actor.roleCodes.has(assignedRoleCode);
          const blockedReason =
            progress.status === "ACTIVE" &&
            stage.status === "ACTIVE" &&
            task.taskType === "STAGE_DECISION" &&
            ["PENDING", "IN_PROGRESS"].includes(task.status) &&
            prerequisitesComplete === false
              ? "Complete all contributing tasks before making the stage decision."
              : null;
          return {
            ...details,
            blockedReason,
            canOpen:
              !blockedReason &&
              progress.status === "ACTIVE" &&
              stage.status === "ACTIVE" &&
              assigned &&
              can(actor, permissionCodes.workflowTaskAssignedRead) &&
              can(actor, viewPermission),
          };
        }),
      };
    }),
  };
}
