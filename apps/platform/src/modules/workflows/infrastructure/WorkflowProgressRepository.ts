import "server-only";

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { roles } from "@/db/schema/authorization";
import { users } from "@/db/schema/identity";
import type {
  WorkflowTakenPath,
  WorkflowProgressStage,
  WorkflowProgressTask,
  WorkflowProgressView,
} from "../api/WorkflowProgressTypes";
import {
  stageTaskDefinitions,
  workflowDefinitionVersions,
  workflowStageDefinitions,
} from "./workflow.schema";
import {
  transitionExecutions,
  stageInstances,
  workflowInstances,
  workflowTasks,
} from "./workflow-runtime.schema";

import { transitionExecutionTargets } from "./workflow-parallel.schema";
import { workflowTaskPrerequisitesComplete } from "./WorkflowTaskPrerequisiteReadiness";

type ProgressTaskRecord = Omit<WorkflowProgressTask, "canOpen"> & {
  assignedRoleCode: string | null;
  assignedUserId: string | null;
  taskDefinitionId: string | null;
  reviewerCount: number | null;
  reviewRelease: "STAGE_COMPLETED" | "THRESHOLD_MET" | "IMMEDIATE" | null;
  thresholdSatisfied: boolean;
  viewPermission: string;
  prerequisitesComplete: boolean;
};

type ProgressStageRecord = Omit<WorkflowProgressStage, "tasks"> & {
  tasks: ProgressTaskRecord[];
};

export type WorkflowProgressRecord = Omit<
  WorkflowProgressView,
  "stages" | "graph" | "takenPaths"
> & {
  stages: ProgressStageRecord[];
  versionId: string;
};

export async function readWorkflowProgress(
  applicationId: string,
): Promise<WorkflowProgressRecord | null> {
  const rows = await getDatabase()
    .select({
      activatedAt: stageInstances.activatedAt,
      completedAt: workflowInstances.completedAt,
      instanceId: workflowInstances.id,
      instanceStatus: workflowInstances.status,
      iterationNumber: stageInstances.iterationNumber,
      stageCompletedAt: stageInstances.completedAt,
      stageDescription: workflowStageDefinitions.description,
      stageId: stageInstances.id,
      stageName: workflowStageDefinitions.name,
      stageSequence: workflowStageDefinitions.sequence,
      stageStableKey: workflowStageDefinitions.code,
      versionId: workflowDefinitionVersions.id,
      stageStatus: stageInstances.status,
      stageReturned: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_reworks rework
        WHERE rework.source_stage_instance_id = ${stageInstances.id}
          AND rework.workflow_instance_id = ${workflowInstances.id}
      )`,
      taskActionedAt: workflowTasks.completedAt,
      taskDefinitionId: stageTaskDefinitions.id,
      reviewerCount: stageTaskDefinitions.reviewerCount,
      reviewRelease: stageTaskDefinitions.reviewRelease,
      thresholdSatisfied: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_review_threshold_evaluations evaluation
        WHERE evaluation.stage_instance_id = ${stageInstances.id}
          AND evaluation.task_definition_id = ${stageTaskDefinitions.id}
          AND evaluation.first_satisfied = true
      )`,
      taskAssignedRoleCode: roles.code,
      taskAssignedRoleName: roles.name,
      taskAssignedUserEmail: users.email,
      taskAssignedUserId: workflowTasks.assignedUserId,
      taskAssignedUserName: users.displayName,
      taskDueAt: workflowTasks.dueAt,
      taskId: workflowTasks.id,
      taskName: stageTaskDefinitions.name,
      taskRequired: stageTaskDefinitions.required,
      taskStatus: workflowTasks.status,
      taskType: stageTaskDefinitions.taskType,
      prerequisitesComplete: workflowTaskPrerequisitesComplete,
      taskViewPermission: stageTaskDefinitions.permissions,
      startedAt: workflowInstances.startedAt,
      terminalOutcome: workflowInstances.terminalOutcome,
      versionMetadata: workflowDefinitionVersions.metadata,
      versionNumber: workflowDefinitionVersions.versionNumber,
    })
    .from(workflowInstances)
    .innerJoin(
      workflowDefinitionVersions,
      eq(
        workflowDefinitionVersions.id,
        workflowInstances.workflowTemplateVersionId,
      ),
    )
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.versionId, workflowDefinitionVersions.id),
    )
    .leftJoin(
      stageInstances,
      and(
        eq(stageInstances.workflowInstanceId, workflowInstances.id),
        eq(
          stageInstances.workflowStageDefinitionId,
          workflowStageDefinitions.id,
        ),
      ),
    )
    .leftJoin(
      workflowTasks,
      and(
        eq(workflowTasks.stageInstanceId, stageInstances.id),
        sql`NOT EXISTS (
          SELECT 1 FROM app_workflow_tasks successor
          WHERE successor.supersedes_task_id = ${workflowTasks.id}
            AND successor.stage_instance_id = ${workflowTasks.stageInstanceId}
        )`,
      ),
    )
    .leftJoin(
      stageTaskDefinitions,
      or(
        eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
        and(
          isNull(stageInstances.id),
          eq(stageTaskDefinitions.stageId, workflowStageDefinitions.id),
        ),
      ),
    )
    .leftJoin(
      users,
      eq(users.id, sql`CASE
        WHEN ${stageInstances.id} IS NULL
          THEN ${stageTaskDefinitions.namedUserOverrideId}
        ELSE ${workflowTasks.assignedUserId} END`),
    )
    .leftJoin(
      roles,
      eq(roles.id, sql`CASE
        WHEN ${stageInstances.id} IS NULL THEN ${stageTaskDefinitions.roleId}
        ELSE ${workflowTasks.assignedRoleId} END`),
    )
    .where(eq(workflowInstances.applicationId, applicationId))
    .orderBy(
      asc(workflowStageDefinitions.sequence),
      asc(stageInstances.iterationNumber),
      asc(stageTaskDefinitions.displayOrder),
    );

  const first = rows[0];
  if (!first) return null;

  const stages = new Map<string, ProgressStageRecord>();
  for (const row of rows) {
    const key = row.stageId ?? `planned-${row.stageSequence}`;
    let stage = stages.get(key);
    if (!stage) {
      stage = {
        activatedAt: row.activatedAt?.toISOString() ?? null,
        completedAt: row.stageReturned
          ? null
          : row.stageCompletedAt?.toISOString() ?? null,
        returnedAt: row.stageReturned
          ? row.stageCompletedAt?.toISOString() ?? null
          : null,
        description: row.stageDescription,
        id: row.stageId,
        iterationNumber: row.iterationNumber,
        name: row.stageName,
        sequence: row.stageSequence,
        stableKey: row.stageStableKey,
        status: row.stageReturned ? "RETURNED" : row.stageStatus ?? "NOT_STARTED",
        tasks: [],
      };
      stages.set(key, stage);
    }
    const planned = !row.stageId && Boolean(row.taskDefinitionId);
    if (
      (row.taskId || planned) &&
      row.taskName &&
      (row.taskStatus || planned) &&
      row.taskType &&
      row.taskViewPermission
    ) {
      stage.tasks.push({
        actionedAt: row.taskActionedAt?.toISOString() ?? null,
        assignedRoleCode: row.taskAssignedRoleCode,
        taskDefinitionId: row.taskDefinitionId,
        reviewerCount: row.reviewerCount,
        reviewRelease: row.reviewRelease,
        thresholdSatisfied: row.thresholdSatisfied,
        assignedRoleName: row.taskAssignedRoleName,
        assignedUserEmail: row.taskAssignedUserEmail,
        assignedUserId: row.taskAssignedUserId,
        assignedUserName: row.taskAssignedUserName,
        dueAt: row.taskDueAt?.toISOString() ?? null,
        id: row.taskId ?? `planned-${row.taskDefinitionId}`,
        ...(planned
          ? {
              planned: true,
              configuredReviewerCount: row.reviewerCount ?? 1,
            }
          : {}),
        name: row.taskName,
        required: row.taskRequired ?? false,
        status: row.taskStatus ?? "WAITING",
        taskType: row.taskType,
        prerequisitesComplete: row.prerequisitesComplete,
        viewPermission: row.taskViewPermission.view,
      });
    }
  }

  return {
    completedAt: first.completedAt?.toISOString() ?? null,
    id: first.instanceId,
    name: first.versionMetadata.name,
    stages: [...stages.values()],
    startedAt: first.startedAt.toISOString(),
    status: first.instanceStatus,
    terminalOutcome: first.terminalOutcome,
    versionNumber: first.versionNumber,
    versionId: first.versionId,
  };
}

export async function readWorkflowTakenPaths(
  workflowInstanceId: string,
): Promise<WorkflowTakenPath[]> {
  return getDatabase()
    .selectDistinct({
      transitionId: transitionExecutions.transitionDefinitionId,
      targetStageKey: workflowStageDefinitions.code,
    })
    .from(transitionExecutions)
    .leftJoin(
      transitionExecutionTargets,
      eq(transitionExecutionTargets.executionId, transitionExecutions.id),
    )
    .leftJoin(
      workflowStageDefinitions,
      eq(
        workflowStageDefinitions.id,
        transitionExecutionTargets.targetStageDefinitionId,
      ),
    )
    .where(
      and(
        eq(transitionExecutions.workflowInstanceId, workflowInstanceId),
        or(
          inArray(transitionExecutionTargets.outcome, [
            "ACTIVATED",
            "ALREADY_ACTIVE",
            "JOIN_PENDING",
          ]),
          inArray(transitionExecutions.outcome, [
            "WORKFLOW_COMPLETED",
            "WORKFLOW_REJECTED",
          ]),
        ),
      ),
    );
}
