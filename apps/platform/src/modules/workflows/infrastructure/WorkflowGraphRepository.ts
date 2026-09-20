import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageTaskActionBindings,
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowActionDefinitions,
  workflowDefinitionVersions,
  workflowDefinitions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "@/db/schema";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import {
  attachWorkflowStageRequirements,
  loadWorkflowStageRequirements,
} from "./WorkflowStageRequirementsReadRepository";

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
    entryCondition: workflowStageDefinitions.entryCondition,
    exitCondition: workflowStageDefinitions.exitCondition,
  },
  action: {
    id: workflowActionDefinitions.id,
    stableKey: workflowActionDefinitions.stableKey,
    label: workflowActionDefinitions.label,
    actionType: workflowActionDefinitions.actionType,
    configuration: workflowActionDefinitions.configuration,
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
  },
  formBinding: {
    contextFields: stageTaskFormBindings.contextFields,
    formVersionId: stageTaskFormBindings.formVersionId,
  },
  taskAction: {
    actionKey: stageTaskActionBindings.actionKey,
    taskDefinitionId: stageTaskActionBindings.taskDefinitionId,
  },
  transition: {
    id: workflowTransitionDefinitions.id,
    fromStageId: workflowTransitionDefinitions.fromStageId,
    actionKey: workflowTransitionDefinitions.actionKey,
    toStageId: workflowTransitionDefinitions.toStageId,
    terminalOutcome: workflowTransitionDefinitions.terminalOutcome,
    priority: workflowTransitionDefinitions.priority,
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
      stageTaskFormBindings,
      eq(stageTaskFormBindings.taskDefinitionId, stageTaskDefinitions.id),
    )
    .leftJoin(
      stageTaskActionBindings,
      eq(stageTaskActionBindings.taskDefinitionId, stageTaskDefinitions.id),
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
      asc(workflowTransitionDefinitions.priority),
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
  rows.forEach(({
    action,
    formBinding,
    stage,
    task,
    taskAction,
    transition,
  }) => {
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
        entryCondition: stage.entryCondition,
        exitCondition: stage.exitCondition,
        checklistItems: [],
        documentRequirements: [],
        scoring: null,
        commentFields: [],
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
      target.actions.push(workflowActionDefinitionSchema.parse(action));
    }
    if (target && task?.id && !target.tasks.some((item) => item.id === task.id)) {
      target.tasks.push({
        ...task,
        actionKeys: [],
        formBinding: formBinding?.formVersionId
          ? {
              contextFields: formBinding.contextFields,
              formVersionId: formBinding.formVersionId,
            }
          : null,
      });
    }
    const targetTask = target?.tasks.find(
      (item) => item.id === taskAction?.taskDefinitionId,
    );
    if (
      targetTask
      && taskAction?.actionKey
      && !targetTask.actionKeys.includes(taskAction.actionKey)
    ) {
      targetTask.actionKeys.push(taskAction.actionKey);
    }
    if (transition?.id && !transitions.has(transition.id)) {
      transitions.set(transition.id, {
        id: transition.id,
        actionKey: transition.actionKey,
        sourceStageKey: codes.get(transition.fromStageId) ?? "",
        priority: transition.priority,
        terminalOutcome: transition.terminalOutcome,
        condition: transition.condition,
        targetStageKey: transition.toStageId
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
  const [rows, requirements] = await Promise.all([
    loadGraphRows(versionId),
    loadWorkflowStageRequirements(versionId),
  ]);
  if (!rows[0]) return null;
  const assembled = assembleGraph(rows);
  attachWorkflowStageRequirements(assembled.graph.stages, requirements);
  return assembled;
}
