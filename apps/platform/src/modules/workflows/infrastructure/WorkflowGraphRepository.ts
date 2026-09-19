import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageTaskDefinitions,
  workflowActionDefinitions,
  workflowDefinitionVersions,
  workflowDefinitions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "@/db/schema";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

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
    metadata: workflowDefinitionVersions.metadata,
    status: workflowDefinitionVersions.status,
    rowVersion: workflowDefinitionVersions.rowVersion,
    createdAt: workflowDefinitionVersions.createdAt,
    publishedAt: workflowDefinitionVersions.publishedAt,
    retiredAt: workflowDefinitionVersions.retiredAt,
  },
  stage: {
    id: workflowStageDefinitions.id,
    stableKey: workflowStageDefinitions.code,
    name: workflowStageDefinitions.name,
    description: workflowStageDefinitions.description,
    enabled: workflowStageDefinitions.enabled,
    optional: workflowStageDefinitions.optional,
    displayOrder: workflowStageDefinitions.sequence,
    initial: workflowStageDefinitions.initial,
    publicStatus: workflowStageDefinitions.applicantStatus,
    publicLabel: workflowStageDefinitions.applicantLabel,
    publicDescription: workflowStageDefinitions.applicantDescription,
    repeatable: workflowStageDefinitions.repeatable,
    coiGated: workflowStageDefinitions.coiGated,
    slaHours: workflowStageDefinitions.slaHours,
  },
  action: {
    id: workflowActionDefinitions.id,
    stableKey: workflowActionDefinitions.stableKey,
    label: workflowActionDefinitions.label,
    actionType: workflowActionDefinitions.actionType,
    enabled: workflowActionDefinitions.enabled,
    reasonCodeRequired: workflowActionDefinitions.reasonCodeRequired,
    displayOrder: workflowActionDefinitions.displayOrder,
  },
  task: {
    id: stageTaskDefinitions.id,
    stableKey: stageTaskDefinitions.stableKey,
    name: stageTaskDefinitions.name,
    description: stageTaskDefinitions.description,
    type: stageTaskDefinitions.type,
    displayOrder: stageTaskDefinitions.displayOrder,
    required: stageTaskDefinitions.required,
    roleId: stageTaskDefinitions.roleId,
    namedUserOverrideId: stageTaskDefinitions.namedUserOverrideId,
    assignmentMode: stageTaskDefinitions.assignmentMode,
    reviewerCount: stageTaskDefinitions.reviewerCount,
    requiredCompletionCount: stageTaskDefinitions.requiredCompletionCount,
    quorum: stageTaskDefinitions.quorum,
    coiRequired: stageTaskDefinitions.coiRequired,
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
      workflowActionDefinitions,
      eq(workflowActionDefinitions.stageId, workflowStageDefinitions.id),
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
      asc(workflowActionDefinitions.displayOrder),
      asc(stageTaskDefinitions.displayOrder),
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
      row.stage?.id ? [[row.stage.id, row.stage.stableKey] as const] : [],
    ),
  );
  rows.forEach(({ action, stage, task, transition }) => {
    if (stage?.id && !stages.has(stage.id))
      stages.set(stage.id, {
        id: stage.id,
        stableKey: stage.stableKey,
        name: stage.name,
        description: stage.description,
        enabled: stage.enabled,
        optional: stage.optional,
        displayOrder: stage.displayOrder,
        publicStatusMapping: {
          status: stage.publicStatus,
          label: stage.publicLabel,
          description: stage.publicDescription,
        },
        repeatable: stage.repeatable,
        coiGated: stage.coiGated,
        initial: stage.initial,
        slaHours: stage.slaHours,
        actions: [],
        tasks: [],
      });
    const target = stage?.id ? stages.get(stage.id) : undefined;
    if (
      target &&
      action?.id &&
      !target.actions.some((item) => item.id === action.id)
    ) {
      target.actions.push({ ...action });
    }
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
    definition: { ...rows[0].definition, ...rows[0].version.metadata },
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
