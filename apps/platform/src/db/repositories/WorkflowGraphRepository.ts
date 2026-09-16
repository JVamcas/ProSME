import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageTaskDefinitions,
  workflowDefinitionVersions,
  workflowDefinitions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "@/db/schema";
import type { WorkflowGraphInput } from "@/modules/workflows/WorkflowTypes";

const graphSelection = {
  definition: {
    id: workflowDefinitions.id,
    code: workflowDefinitions.code,
    name: workflowDefinitions.name,
    description: workflowDefinitions.description,
  },
  version: {
    id: workflowDefinitionVersions.id,
    versionNumber: workflowDefinitionVersions.versionNumber,
    status: workflowDefinitionVersions.status,
    rowVersion: workflowDefinitionVersions.rowVersion,
    createdAt: workflowDefinitionVersions.createdAt,
    publishedAt: workflowDefinitionVersions.publishedAt,
    retiredAt: workflowDefinitionVersions.retiredAt,
  },
  stage: {
    id: workflowStageDefinitions.id,
    code: workflowStageDefinitions.code,
    name: workflowStageDefinitions.name,
    sequence: workflowStageDefinitions.sequence,
    initial: workflowStageDefinitions.initial,
    applicantStatus: workflowStageDefinitions.applicantStatus,
    applicantLabel: workflowStageDefinitions.applicantLabel,
    applicantDescription: workflowStageDefinitions.applicantDescription,
    slaHours: workflowStageDefinitions.slaHours,
  },
  task: {
    id: stageTaskDefinitions.id,
    code: stageTaskDefinitions.code,
    name: stageTaskDefinitions.name,
    type: stageTaskDefinitions.type,
    sequence: stageTaskDefinitions.sequence,
    required: stageTaskDefinitions.required,
    assignmentRoleId: stageTaskDefinitions.assignmentRoleId,
    assignmentUserId: stageTaskDefinitions.assignmentUserId,
    config: stageTaskDefinitions.config,
    formVersionId: stageTaskDefinitions.formVersionId,
  },
  transition: {
    id: workflowTransitionDefinitions.id,
    fromStageId: workflowTransitionDefinitions.fromStageId,
    actionCode: workflowTransitionDefinitions.actionCode,
    toStageId: workflowTransitionDefinitions.toStageId,
    terminalOutcome: workflowTransitionDefinitions.terminalOutcome,
    requiredCapability: workflowTransitionDefinitions.requiredCapability,
    condition: workflowTransitionDefinitions.condition,
  },
};

function loadGraphRows(versionId: string) {
  return getDatabase()
    .select(graphSelection)
    .from(workflowDefinitionVersions)
    .innerJoin(
      workflowDefinitions,
      eq(workflowDefinitions.id, workflowDefinitionVersions.definitionId),
    )
    .leftJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.versionId, workflowDefinitionVersions.id),
    )
    .leftJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.stageId, workflowStageDefinitions.id),
    )
    .leftJoin(
      workflowTransitionDefinitions,
      eq(
        workflowTransitionDefinitions.versionId,
        workflowDefinitionVersions.id,
      ),
    )
    .where(eq(workflowDefinitionVersions.id, versionId))
    .orderBy(
      asc(workflowStageDefinitions.sequence),
      asc(stageTaskDefinitions.sequence),
    );
}

function assembleGraph(rows: Awaited<ReturnType<typeof loadGraphRows>>) {
  const stages = new Map<string, WorkflowGraphInput["stages"][number]>();
  const transitions = new Map<
    string,
    WorkflowGraphInput["transitions"][number]
  >();
  const codes = new Map(
    rows.flatMap((row) =>
      row.stage?.id ? [[row.stage.id, row.stage.code] as const] : [],
    ),
  );
  rows.forEach(({ stage, task, transition }) => {
    if (stage?.id && !stages.has(stage.id))
      stages.set(stage.id, { ...stage, tasks: [] });
    const target = stage?.id ? stages.get(stage.id) : undefined;
    if (target && task?.id && !target.tasks.some((item) => item.id === task.id))
      target.tasks.push({ ...task });
    if (transition?.id && !transitions.has(transition.id)) {
      transitions.set(transition.id, {
        id: transition.id,
        actionCode: transition.actionCode,
        condition: transition.condition,
        fromStageCode: codes.get(transition.fromStageId) ?? "",
        requiredCapability: transition.requiredCapability,
        terminalOutcome: transition.terminalOutcome,
        toStageCode: transition.toStageId
          ? (codes.get(transition.toStageId) ?? "")
          : null,
      });
    }
  });
  return {
    definition: rows[0].definition,
    graph: {
      stages: [...stages.values()],
      transitions: [...transitions.values()],
    },
    version: rows[0].version,
  };
}

export async function findWorkflowGraph(versionId: string) {
  const rows = await loadGraphRows(versionId);
  return rows[0] ? assembleGraph(rows) : null;
}
