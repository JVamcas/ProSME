import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { WorkflowProgressView } from "../api/WorkflowProgressTypes";
import {
  stageTaskDefinitions,
  workflowDefinitionVersions,
  workflowStageDefinitions,
} from "./workflow.schema";
import {
  stageInstances,
  workflowInstances,
  workflowTasks,
} from "./workflow-runtime.schema";

export async function readWorkflowProgress(
  applicationId: string,
): Promise<WorkflowProgressView | null> {
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
      stageStatus: stageInstances.status,
      taskDueAt: workflowTasks.dueAt,
      taskId: workflowTasks.id,
      taskName: stageTaskDefinitions.name,
      taskStatus: workflowTasks.status,
      startedAt: workflowInstances.startedAt,
      terminalOutcome: workflowInstances.terminalOutcome,
      versionMetadata: workflowDefinitionVersions.metadata,
      versionNumber: workflowDefinitionVersions.versionNumber,
    })
    .from(workflowInstances)
    .innerJoin(
      workflowDefinitionVersions,
      eq(workflowDefinitionVersions.id, workflowInstances.workflowTemplateVersionId),
    )
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.versionId, workflowDefinitionVersions.id),
    )
    .leftJoin(
      stageInstances,
      and(
        eq(stageInstances.workflowInstanceId, workflowInstances.id),
        eq(stageInstances.workflowStageDefinitionId, workflowStageDefinitions.id),
      ),
    )
    .leftJoin(
      workflowTasks,
      eq(workflowTasks.stageInstanceId, stageInstances.id),
    )
    .leftJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
    )
    .where(eq(workflowInstances.applicationId, applicationId))
    .orderBy(
      asc(workflowStageDefinitions.sequence),
      asc(stageInstances.iterationNumber),
      asc(stageTaskDefinitions.displayOrder),
    );

  const first = rows[0];
  if (!first) return null;

  const stages = new Map<string, WorkflowProgressView["stages"][number]>();
  for (const row of rows) {
    const key = row.stageId ?? `planned-${row.stageSequence}`;
    let stage = stages.get(key);
    if (!stage) {
      stage = {
        activatedAt: row.activatedAt?.toISOString() ?? null,
        completedAt: row.stageCompletedAt?.toISOString() ?? null,
        description: row.stageDescription,
        id: row.stageId,
        iterationNumber: row.iterationNumber,
        name: row.stageName,
        sequence: row.stageSequence,
        status: row.stageStatus ?? "NOT_STARTED",
        tasks: [],
      };
      stages.set(key, stage);
    }
    if (row.taskId && row.taskName && row.taskStatus) {
      stage.tasks.push({
        dueAt: row.taskDueAt?.toISOString() ?? null,
        id: row.taskId,
        name: row.taskName,
        status: row.taskStatus,
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
  };
}
