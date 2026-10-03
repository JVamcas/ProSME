import "server-only";

import { readWorkflowCompletionProgress } from "../../infrastructure/WorkflowCompletionProgressRepository";
import { buildWorkflowCompletionProgress } from "../../engine/WorkflowCompletionProgress";
import { buildStageCompletionValues } from "../../engine/StageCompletionContext";
import { normalizeStageConditionRecord } from "../../engine/StageCondition";

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
    const task = await readAssignedWorkflowProgressContext(
      actor.id,
      context.taskId,
    );
    if (!task || task.applicationId !== applicationId) {
      throw new PermissionDeniedError(
        permissionCodes.workflowInstanceAssignedRead,
      );
    }
    requirePermission(actor, task.viewPermission);
    assignedInstanceId = task.workflowInstanceId;
  }
  const progress = await readWorkflowProgress(applicationId);
  if (!progress) return null;
  if (assignedInstanceId && progress.id !== assignedInstanceId) {
    throw new PermissionDeniedError(
      permissionCodes.workflowInstanceAssignedRead,
    );
  }

  // The instance determines which immutable template version supplies its flow.
  const { versionId, ...details } = progress;
  const [definition, takenPaths, completion] = await Promise.all([
    findWorkflowGraph(versionId),
    readWorkflowTakenPaths(progress.id),
    readWorkflowCompletionProgress(
      progress.id,
      progress.status === "ACTIVE"
        ? progress.stages.flatMap((stage) =>
            stage.id && ["ACTIVE", "BLOCKED"].includes(stage.status)
              ? [stage.id]
              : [],
          )
        : [],
    ),
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

      const target = completion?.targets.find(
        (item) => item.stageInstanceId === stage.id,
      );
      // Hide values from all condition sources if any peer evidence is unreleased.
      const hideValues = progress.stages.some((source) =>
        source.tasks.some(
          (task) =>
            source.tasks.some(
              (own) =>
                own.assignedUserId === actor.id &&
                own.taskDefinitionId === task.taskDefinitionId,
            ) &&
            task.assignedUserId !== actor.id &&
            (task.reviewerCount ?? 0) > 1 &&
            task.reviewRelease !== "IMMEDIATE" &&
            !(
              task.reviewRelease === "THRESHOLD_MET" && task.thresholdSatisfied
            ) &&
            !["COMPLETED", "RETURNED"].includes(source.status),
        ),
      );
      const completionRequirements =
        target && completion
          ? buildWorkflowCompletionProgress({
              requirements: completion.requirements.filter(
                (item) => item.stageInstanceId === stage.id,
              ),
              tasks: stage.tasks,
              exitCondition: target.exitCondition,
              hideValues,
              context: {
                application: normalizeStageConditionRecord(target.application),
                eligibility: normalizeStageConditionRecord(
                  target.eligibility ?? {},
                ),
                fundingCall: normalizeStageConditionRecord(target.fundingCall),
                stages: [
                  ...completion.priorStages
                    .filter((item) => item.stableKey !== target.stageKey)
                    .map((item) => ({
                      stableKey: item.stableKey,
                      values: normalizeStageConditionRecord(item.values),
                    })),
                  {
                    stableKey: target.stageKey,
                    values: normalizeStageConditionRecord(
                      buildStageCompletionValues(
                        completion.values.filter(
                          (item) => item.stageInstanceId === stage.id,
                        ),
                      ),
                    ),
                  },
                ],
              },
            })
          : null;
      return {
        ...stage,
        completionRequirements,
        tasks: stage.tasks.map((task, index) => {
          const released =
            task.reviewRelease === "IMMEDIATE" ||
            (task.reviewRelease === "THRESHOLD_MET" &&
              task.thresholdSatisfied) ||
            stage.status === "COMPLETED" ||
            stage.status === "RETURNED";
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
