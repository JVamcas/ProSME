import "server-only";

import { and, eq, inArray, max } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageTaskDefinitions,
  workflowAuditEntries,
  workflowDefinitionVersions,
  workflowDefinitions,
  workflowActionDefinitions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "@/db/schema";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

async function insertGraph(
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
  const actions = graph.stages.flatMap((stage) =>
    stage.actions.map((action) => ({
      actionType: action.actionType,
      configuration: action.configuration,
      displayOrder: action.displayOrder,
      enabled: action.enabled,
      label: action.label,
      reasonCodeRequired: action.reasonCodeRequired,
      stableKey: action.stableKey,
      stageId: stageIds.get(stage.stableKey)!,
    })),
  );
  if (actions.length) {
    await transaction.insert(workflowActionDefinitions).values(actions);
  }
  const tasks = graph.stages.flatMap((stage) =>
    stage.tasks.map((task) => ({
      assignmentMode: task.assignmentMode,
      coiRequired: task.coiRequired,
      config: task.config,
      description: task.description,
      displayOrder: task.displayOrder,
      formVersionId: task.formVersionId ?? null,
      name: task.name,
      namedUserOverrideId: task.namedUserOverrideId ?? null,
      quorum: task.quorum,
      required: task.required,
      requiredCompletionCount: task.requiredCompletionCount,
      reviewerCount: task.reviewerCount,
      roleId: task.roleId ?? null,
      stableKey: task.stableKey,
      stageId: stageIds.get(stage.stableKey)!,
      type: task.type,
    })),
  );
  if (tasks.length)
    await transaction.insert(stageTaskDefinitions).values(tasks);
  const transitions = graph.transitions.map((transition) => ({
    actionKey: transition.actionKey,
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

async function audit(
  transaction: Transaction,
  input: {
    action: string;
    actorId: string;
    after: Record<string, unknown>;
    before?: Record<string, unknown>;
    correlationId: string;
    targetId: string;
    targetType: string;
  },
) {
  await transaction
    .insert(workflowAuditEntries)
    .values({ ...input, before: input.before ?? null });
}

export async function createWorkflowDefinition(input: {
  actorId: string;
  code: string;
  correlationId: string;
  description: string;
  graph: WorkflowGraphInput;
  name: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction
      .insert(workflowDefinitions)
      .values({
        code: input.code,
        description: input.description,
        name: input.name,
      })
      .returning();
    const [version] = await transaction
      .insert(workflowDefinitionVersions)
      .values({
        createdBy: input.actorId,
        definitionId: definition.id,
        versionNumber: 1,
        metadata: {
          code: input.code,
          name: input.name,
          description: input.description,
        },
      })
      .returning();
    await insertGraph(transaction, version.id, input.graph);
    await audit(transaction, {
      action: "WORKFLOW_CREATED",
      actorId: input.actorId,
      after: {
        code: definition.code,
        version: 1,
        versionId: version.id,
        status: "DRAFT",
      },
      correlationId: input.correlationId,
      targetId: definition.id,
      targetType: "WORKFLOW_DEFINITION",
    });
    return version.id;
  });
}

export async function replaceWorkflowDraft(input: {
  actorId: string;
  correlationId: string;
  expectedRowVersion: number;
  graph: WorkflowGraphInput;
  versionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [updated] = await transaction
      .update(workflowDefinitionVersions)
      .set({ rowVersion: input.expectedRowVersion + 1, updatedAt: new Date() })
      .where(
        and(
          eq(workflowDefinitionVersions.id, input.versionId),
          eq(workflowDefinitionVersions.status, "DRAFT"),
          eq(workflowDefinitionVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .returning({ id: workflowDefinitionVersions.id });
    if (!updated) return null;
    const stages = await transaction
      .select({ id: workflowStageDefinitions.id })
      .from(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.versionId, input.versionId));
    const stageIds = stages.map((stage) => stage.id);
    await transaction
      .delete(workflowTransitionDefinitions)
      .where(eq(workflowTransitionDefinitions.versionId, input.versionId));
    if (stageIds.length)
      await transaction
        .delete(workflowActionDefinitions)
        .where(inArray(workflowActionDefinitions.stageId, stageIds));
    if (stageIds.length)
      await transaction
        .delete(stageTaskDefinitions)
        .where(inArray(stageTaskDefinitions.stageId, stageIds));
    await transaction
      .delete(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.versionId, input.versionId));
    await insertGraph(transaction, input.versionId, input.graph);
    await audit(transaction, {
      action: "WORKFLOW_DRAFT_UPDATED",
      actorId: input.actorId,
      after: { rowVersion: input.expectedRowVersion + 1 },
      before: { rowVersion: input.expectedRowVersion },
      correlationId: input.correlationId,
      targetId: input.versionId,
      targetType: "WORKFLOW_VERSION",
    });
    return input.versionId;
  });
}

export async function cloneWorkflowVersion(input: {
  actorId: string;
  correlationId: string;
  definitionId: string;
  graph: WorkflowGraphInput;
  sourceVersionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.id, input.definitionId))
      .for("update");
    if (!definition) throw new Error("Workflow template not found.");
    const [latest] = await transaction
      .select({ value: max(workflowDefinitionVersions.versionNumber) })
      .from(workflowDefinitionVersions)
      .where(eq(workflowDefinitionVersions.definitionId, input.definitionId));
    const [version] = await transaction
      .insert(workflowDefinitionVersions)
      .values({
        createdBy: input.actorId,
        definitionId: input.definitionId,
        versionNumber: (latest?.value ?? 0) + 1,
        metadata: {
          code: definition.code,
          name: definition.name,
          description: definition.description,
        },
      })
      .returning();
    await insertGraph(transaction, version.id, input.graph);
    await audit(transaction, {
      action: "WORKFLOW_VERSION_CLONED",
      actorId: input.actorId,
      after: {
        sourceVersionId: input.sourceVersionId,
        version: version.versionNumber,
      },
      correlationId: input.correlationId,
      targetId: version.id,
      targetType: "WORKFLOW_VERSION",
    });
    return version.id;
  });
}
