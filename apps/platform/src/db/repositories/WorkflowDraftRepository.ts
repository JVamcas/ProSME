import "server-only";

import { and, eq, inArray, max } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageTaskDefinitions,
  workflowAuditEntries,
  workflowDefinitionVersions,
  workflowDefinitions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "@/db/schema";
import type { WorkflowGraphInput } from "@/modules/workflows/WorkflowTypes";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

async function insertGraph(
  transaction: Transaction,
  versionId: string,
  graph: WorkflowGraphInput,
) {
  const stages = graph.stages.map((stage) => ({
    applicantDescription: stage.applicantDescription,
    applicantLabel: stage.applicantLabel,
    applicantStatus: stage.applicantStatus,
    code: stage.code,
    initial: stage.initial,
    name: stage.name,
    sequence: stage.sequence,
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
  const tasks = graph.stages.flatMap((stage) =>
    stage.tasks.map((task) => ({
      assignmentRoleId: task.assignmentRoleId ?? null,
      assignmentUserId: task.assignmentUserId ?? null,
      code: task.code,
      config: task.config,
      formVersionId: task.formVersionId ?? null,
      name: task.name,
      required: task.required,
      sequence: task.sequence,
      stageId: stageIds.get(stage.code)!,
      type: task.type,
    })),
  );
  if (tasks.length)
    await transaction.insert(stageTaskDefinitions).values(tasks);
  const transitions = graph.transitions.map((transition) => ({
    actionCode: transition.actionCode,
    condition: transition.condition ?? null,
    fromStageId: stageIds.get(transition.fromStageCode)!,
    requiredCapability: transition.requiredCapability,
    terminalOutcome: transition.terminalOutcome ?? null,
    toStageId: transition.toStageCode
      ? stageIds.get(transition.toStageCode)!
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
      })
      .returning();
    await insertGraph(transaction, version.id, input.graph);
    await audit(transaction, {
      action: "WORKFLOW_CREATED",
      actorId: input.actorId,
      after: { code: definition.code, version: 1 },
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
}) {
  return getDatabase().transaction(async (transaction) => {
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
      })
      .returning();
    await insertGraph(transaction, version.id, input.graph);
    await audit(transaction, {
      action: "WORKFLOW_VERSION_CLONED",
      actorId: input.actorId,
      after: { version: version.versionNumber },
      correlationId: input.correlationId,
      targetId: version.id,
      targetType: "WORKFLOW_VERSION",
    });
    return version.id;
  });
}
