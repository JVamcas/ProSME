import "server-only";

import type { WorkflowGraphInput } from "../domain/definitions/WorkflowTypes";
import { workflowActionDefinitionSchema } from "../domain/actions/WorkflowActionSchemas";
import { readWorkflowGraphRows } from "./WorkflowGraphReadRepository";
import {
  attachWorkflowStageRequirements,
  loadWorkflowStageRequirements,
} from "./WorkflowStageRequirementsReadRepository";

type GraphRows = Awaited<ReturnType<typeof readWorkflowGraphRows>>;

function assembleGraph(rows: GraphRows) {
  const stages = new Map<string, WorkflowGraphInput["stages"][number]>();
  for (const stage of rows.stages) {
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
      allowApplicantWithdrawal: stage.allowApplicantWithdrawal,
      coiGated: stage.coiGated,
      coiFormVersionId: stage.coiFormVersionId,
      entryCondition: stage.entryCondition,
      exitCondition: stage.exitCondition,
      joinPredecessorStageKeys: [],
      checklistItems: [],
      commentFields: [],
      documentRequirements: [],
      scoring: null,
      initial: stage.initial,
      slaHours: stage.slaHours,
      actions: [],
      tasks: [],
    });
  }
  for (const { stageId, ...action } of rows.actions) {
    stages
      .get(stageId)
      ?.actions.push(workflowActionDefinitionSchema.parse(action));
  }
  const tasks = new Map<
    string,
    WorkflowGraphInput["stages"][number]["tasks"][number]
  >();
  for (const {
    task: { stageId, ...task },
    formBinding,
  } of rows.tasks) {
    const assembled: WorkflowGraphInput["stages"][number]["tasks"][number] = {
      ...task,
      actionKeys: [],
      formBinding: formBinding?.formVersionId ? formBinding : null,
    };
    tasks.set(task.id, assembled);
    stages.get(stageId)?.tasks.push(assembled);
  }
  for (const binding of rows.taskActions) {
    tasks.get(binding.taskDefinitionId)?.actionKeys.push(binding.actionKey);
  }
  for (const { stageId, predecessorStageId } of rows.predecessors) {
    const predecessor = stages.get(predecessorStageId);
    if (predecessor) {
      stages.get(stageId)?.joinPredecessorStageKeys.push(predecessor.stableKey);
    }
  }
  const transitions = new Map<
    string,
    WorkflowGraphInput["transitions"][number]
  >();
  for (const { fromStageId, ...transition } of rows.transitions) {
    transitions.set(transition.id, {
      ...transition,
      sourceStageKey: stages.get(fromStageId)?.stableKey ?? "",
      targetStageKeys: [],
    });
  }
  for (const { transitionId, targetStageId } of rows.targets) {
    const target = stages.get(targetStageId);
    if (target) {
      transitions.get(transitionId)?.targetStageKeys.push(target.stableKey);
    }
  }
  return {
    stages: [...stages.values()],
    transitions: [...transitions.values()],
  };
}

export async function findWorkflowGraph(versionId: string) {
  const [rows, requirements] = await Promise.all([
    readWorkflowGraphRows(versionId),
    loadWorkflowStageRequirements(versionId),
  ]);
  if (!rows.header) return null;
  const graph = assembleGraph(rows);
  attachWorkflowStageRequirements(graph.stages, requirements);
  return {
    definition: { ...rows.header.definition, ...rows.header.version.metadata },
    graph,
    version: rows.header.version,
  };
}
