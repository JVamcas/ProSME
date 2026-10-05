import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { WorkflowProgressTask } from "../../api/WorkflowProgressTypes";
import type { ProgressTaskRecord } from "../../infrastructure/WorkflowProgressRepository";

export function workflowProgressTaskView(
  actor: AuthenticatedUser,
  task: ProgressTaskRecord,
  context: {
    index: number;
    reviewingDefinitions: Set<string | null>;
    stageStatus: string;
    workflowStatus: string;
  },
): WorkflowProgressTask {
  const released =
    task.reviewRelease === "IMMEDIATE" ||
    (task.reviewRelease === "THRESHOLD_MET" && task.thresholdSatisfied) ||
    context.stageStatus === "COMPLETED" ||
    context.stageStatus === "RETURNED";
  const peerIsHidden =
    !released &&
    task.reviewerCount !== null &&
    task.reviewerCount > 1 &&
    context.reviewingDefinitions.has(task.taskDefinitionId) &&
    task.assignedUserId !== actor.id;

  const {
    assignedRoleCode: _assignedRoleCode,
    assignedUserId,
    viewPermission,
    taskDefinitionId: _taskDefinitionId,
    reviewerCount: _reviewerCount,
    reviewRelease: _reviewRelease,
    thresholdSatisfied: _thresholdSatisfied,
    prerequisitesComplete,
    ...details
  } = task;
  void _assignedRoleCode;
  void _taskDefinitionId;
  void _reviewerCount;
  void _reviewRelease;
  void _thresholdSatisfied;

  if (peerIsHidden) {
    return {
      ...details,
      processingStatus: null,
      actionedAt: null,
      assignedRoleName: null,
      assignedUserEmail: null,
      assignedUserName: null,
      dueAt: null,
      id: "peer-slot-" + String(context.index + 1),
      status: task.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      canOpen: false,
    };
  }

  const blockedReason =
    context.workflowStatus === "ACTIVE" &&
    context.stageStatus === "ACTIVE" &&
    task.taskType === "STAGE_DECISION" &&
    ["PENDING", "IN_PROGRESS"].includes(task.status) &&
    prerequisitesComplete === false
      ? "Meet the required contributing review thresholds before making the stage decision."
      : null;
  return {
    ...details,
    blockedReason,
    canOpen:
      can(actor, permissionCodes.workflowTaskAllRead) ||
      (context.workflowStatus === "ACTIVE" &&
        ["ACTIVE", "BLOCKED"].includes(context.stageStatus) &&
        assignedUserId === actor.id &&
        can(actor, permissionCodes.workflowTaskAssignedRead) &&
        can(actor, viewPermission)),
  };
}
