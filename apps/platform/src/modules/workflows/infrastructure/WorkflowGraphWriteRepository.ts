import "server-only";

import { getDatabase } from "@/db/client";
import {
  stageTaskActionBindings,
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowActionDefinitions,
  workflowStageChecklistDefinitions,
  workflowStageCommentFields,
  workflowStageDefinitions,
  workflowStageDocumentRequirements,
  workflowStageScoringConfigurations,
  workflowStageScoringCriteria,
  workflowTransitionDefinitions,
} from "@/db/schema";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export async function insertWorkflowGraph(
  transaction: Transaction,
  versionId: string,
  graph: WorkflowGraphInput,
) {
  const stages = graph.stages.map((stage) => ({
    applicantDescription: stage.publicStatusMapping.description,
    applicantLabel: stage.publicStatusMapping.label,
    applicantStatus: stage.publicStatusMapping.status,
    code: stage.stableKey,
    coiGated: stage.coiGated,
    description: stage.description,
    enabled: stage.enabled,
    entryCondition: stage.entryCondition,
    exitCondition: stage.exitCondition,
    initial: stage.initial,
    name: stage.name,
    optional: stage.optional,
    repeatable: stage.repeatable,
    sequence: stage.displayOrder,
    slaHours: stage.slaHours ?? null,
    versionId,
  }));
  if (!stages.length) return;
  const stageRows = await transaction
    .insert(workflowStageDefinitions)
    .values(stages)
    .returning({
      id: workflowStageDefinitions.id,
      code: workflowStageDefinitions.code,
    });
  const stageIds = new Map(stageRows.map((stage) => [stage.code, stage.id]));
  const taskIds = await insertActionsAndTasks(
    transaction,
    graph,
    stageIds,
  );
  await insertStageRequirements(transaction, graph, stageIds, taskIds);
  const transitions = graph.transitions.map((transition) => ({
    actionKey: transition.actionKey,
    condition: transition.condition,
    fromStageId: stageIds.get(transition.sourceStageKey)!,
    priority: transition.priority,
    terminalOutcome: transition.terminalOutcome ?? null,
    toStageId: transition.targetStageKey
      ? stageIds.get(transition.targetStageKey)!
      : null,
    versionId,
  }));
  if (transitions.length) {
    await transaction.insert(workflowTransitionDefinitions).values(transitions);
  }
}

async function insertStageRequirements(
  transaction: Transaction,
  graph: WorkflowGraphInput,
  stageIds: Map<string, string>,
  taskIds: Map<string, string>,
) {
  const checklistItems = graph.stages.flatMap((stage) => {
    const stageId = stageIds.get(stage.stableKey)!;
    return stage.checklistItems.map(({ taskStableKey, ...item }) => ({
      ...item,
      id: undefined,
      stageId,
      taskDefinitionId: taskIds.get(`${stageId}:${taskStableKey}`)!,
    }));
  });
  if (checklistItems.length) {
    await transaction
      .insert(workflowStageChecklistDefinitions)
      .values(checklistItems);
  }
  const commentFields = graph.stages.flatMap((stage) =>
    stage.commentFields.map((field) => ({
      ...field,
      id: undefined,
      stageId: stageIds.get(stage.stableKey)!,
    })),
  );
  if (commentFields.length) {
    await transaction.insert(workflowStageCommentFields).values(commentFields);
  }
  const documentRequirements = graph.stages.flatMap((stage) =>
    stage.documentRequirements.map((requirement) => ({
      ...requirement,
      id: undefined,
      stageId: stageIds.get(stage.stableKey)!,
    })),
  );
  if (documentRequirements.length) {
    await transaction
      .insert(workflowStageDocumentRequirements)
      .values(documentRequirements);
  }
  const configurations = graph.stages.flatMap((stage) =>
    stage.scoring
      ? [{
          aggregation: stage.scoring.aggregation,
          stageId: stageIds.get(stage.stableKey)!,
        }]
      : [],
  );
  if (configurations.length) {
    await transaction
      .insert(workflowStageScoringConfigurations)
      .values(configurations);
  }
  const criteria = graph.stages.flatMap((stage) =>
    (stage.scoring?.criteria ?? []).map((criterion) => ({
      ...criterion,
      id: undefined,
      stageId: stageIds.get(stage.stableKey)!,
    })),
  );
  if (criteria.length) {
    await transaction.insert(workflowStageScoringCriteria).values(criteria);
  }
}

async function insertActionsAndTasks(
  transaction: Transaction,
  graph: WorkflowGraphInput,
  stageIds: Map<string, string>,
) {
  const actions = graph.stages.flatMap((stage) =>
    stage.actions.map((action) => ({
      ...action,
      id: undefined,
      stageId: stageIds.get(stage.stableKey)!,
    })),
  );
  if (actions.length) {
    await transaction.insert(workflowActionDefinitions).values(actions);
  }
  const tasks = graph.stages.flatMap((stage) =>
    stage.tasks.map((task) => {
      const configuration = task.config && typeof task.config === "object"
        && !Array.isArray(task.config)
        ? { ...task.config } as Record<string, unknown>
        : {};
      delete configuration.items;
      return {
      assignmentMode: task.assignmentMode,
      coiRequired: task.coiRequired,
      config: configuration,
      description: task.description,
      displayOrder: task.displayOrder,
      name: task.name,
      permissions: task.permissions,
      namedUserOverrideId: task.namedUserOverrideId ?? null,
      quorum: task.quorum,
      quorumRule: task.quorum ? task.quorumRule ?? null : null,
      required: task.required,
      requiredCompletionCount: task.requiredCompletionCount,
      completionMode: task.completionMode ?? "COUNT",
      completionPercentage: task.completionPercentage ?? null,
      reviewerCount: task.reviewerCount,
      reviewRelease: task.reviewRelease ?? "STAGE_COMPLETED",
      submittedReplacementPolicy: task.submittedReplacementPolicy ?? "DENY",
      roleId: task.roleId ?? null,
      stableKey: task.stableKey,
      stageId: stageIds.get(stage.stableKey)!,
      };
    }),
  );
  const taskRows = tasks.length
    ? await transaction
        .insert(stageTaskDefinitions)
        .values(tasks)
        .returning({
          id: stageTaskDefinitions.id,
          stableKey: stageTaskDefinitions.stableKey,
          stageId: stageTaskDefinitions.stageId,
        })
    : [];
  const taskIds = new Map(
    taskRows.map((task) => [`${task.stageId}:${task.stableKey}`, task.id]),
  );
  const formBindings = graph.stages.flatMap((stage) => {
    const stageId = stageIds.get(stage.stableKey)!;
    return stage.tasks.flatMap((task) =>
      task.formBinding
        ? [{
            contextFields: task.formBinding.contextFields,
            formVersionId: task.formBinding.formVersionId,
            taskDefinitionId: taskIds.get(`${stageId}:${task.stableKey}`)!,
          }]
        : [],
    );
  });
  if (formBindings.length) {
    await transaction.insert(stageTaskFormBindings).values(formBindings);
  }
  const taskActions = graph.stages.flatMap((stage) => {
    const stageId = stageIds.get(stage.stableKey)!;
    return stage.tasks.flatMap((task) =>
      task.actionKeys.map((actionKey) => ({
        actionKey,
        stageId,
        taskDefinitionId: taskIds.get(`${stageId}:${task.stableKey}`)!,
      })),
    );
  });
  if (taskActions.length) {
    await transaction.insert(stageTaskActionBindings).values(taskActions);
  }
  return taskIds;
}
