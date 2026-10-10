import "server-only";

import { and, desc, eq, inArray, max } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageTaskActionBindings,
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowDefinitionVersions,
  workflowDefinitions,
  workflowActionDefinitions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "./workflow.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";
import {
  workflowStageJoinPredecessors,
  workflowTransitionTargets,
} from "./workflow-parallel.schema";
import {
  workflowStageChecklistDefinitions,
  workflowStageCommentFields,
  workflowStageDocumentRequirements,
  workflowStageScoringConfigurations,
  workflowStageScoringCriteria,
} from "./workflow-stage-requirements.schema";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { insertWorkflowGraph } from "./WorkflowGraphWriteRepository";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

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
  copiedFrom?: { definitionId: string; versionId: string };
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
    await insertWorkflowGraph(transaction, version.id, input.graph);
    await audit(transaction, {
      action: "WORKFLOW_CREATED",
      actorId: input.actorId,
      after: {
        code: definition.code,
        version: 1,
        versionId: version.id,
        status: "DRAFT",
        ...(input.copiedFrom ? { copiedFrom: input.copiedFrom } : {}),
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
    const taskRows = stageIds.length
      ? await transaction
          .select({ id: stageTaskDefinitions.id })
          .from(stageTaskDefinitions)
          .where(inArray(stageTaskDefinitions.stageId, stageIds))
      : [];
    const taskIds = taskRows.map((task) => task.id);
    if (stageIds.length) {
      await transaction
        .delete(stageTaskActionBindings)
        .where(inArray(stageTaskActionBindings.stageId, stageIds));
      await transaction
        .delete(workflowTransitionTargets)
        .where(inArray(workflowTransitionTargets.targetStageId, stageIds));
      await transaction
        .delete(workflowStageJoinPredecessors)
        .where(inArray(workflowStageJoinPredecessors.stageId, stageIds));
    }
    await transaction
      .delete(workflowTransitionDefinitions)
      .where(eq(workflowTransitionDefinitions.versionId, input.versionId));
    if (taskIds.length)
      await transaction
        .delete(stageTaskFormBindings)
        .where(inArray(stageTaskFormBindings.taskDefinitionId, taskIds));
    if (stageIds.length)
      await transaction
        .delete(workflowStageCommentFields)
        .where(inArray(workflowStageCommentFields.stageId, stageIds));
    if (stageIds.length)
      await transaction
        .delete(workflowStageScoringCriteria)
        .where(inArray(workflowStageScoringCriteria.stageId, stageIds));
    if (stageIds.length)
      await transaction
        .delete(workflowStageScoringConfigurations)
        .where(inArray(workflowStageScoringConfigurations.stageId, stageIds));
    if (stageIds.length)
      await transaction
        .delete(workflowStageChecklistDefinitions)
        .where(inArray(workflowStageChecklistDefinitions.stageId, stageIds));
    if (stageIds.length)
      await transaction
        .delete(workflowStageDocumentRequirements)
        .where(inArray(workflowStageDocumentRequirements.stageId, stageIds));
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
    await insertWorkflowGraph(transaction, input.versionId, input.graph);
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
    const [sourceRows, draftRows, latestRows] = await Promise.all([
      transaction
        .select({
          id: workflowDefinitionVersions.id,
          metadata: workflowDefinitionVersions.metadata,
        })
        .from(workflowDefinitionVersions)
        .where(
          and(
            eq(workflowDefinitionVersions.id, input.sourceVersionId),
            eq(workflowDefinitionVersions.definitionId, input.definitionId),
          ),
        )
        .limit(1),
      transaction
        .select({ id: workflowDefinitionVersions.id })
        .from(workflowDefinitionVersions)
        .where(
          and(
            eq(workflowDefinitionVersions.definitionId, input.definitionId),
            eq(workflowDefinitionVersions.status, "DRAFT"),
            eq(
              workflowDefinitionVersions.sourceVersionId,
              input.sourceVersionId,
            ),
          ),
        )
        .orderBy(desc(workflowDefinitionVersions.versionNumber))
        .limit(1),
      transaction
        .select({ value: max(workflowDefinitionVersions.versionNumber) })
        .from(workflowDefinitionVersions)
        .where(eq(workflowDefinitionVersions.definitionId, input.definitionId)),
    ]);
    if (!sourceRows[0]) throw new Error("Workflow source version not found.");
    if (draftRows[0]) return draftRows[0].id;
    const latest = latestRows[0];
    const [version] = await transaction
      .insert(workflowDefinitionVersions)
      .values({
        createdBy: input.actorId,
        definitionId: input.definitionId,
        sourceVersionId: input.sourceVersionId,
        versionNumber: (latest?.value ?? 0) + 1,
        metadata: sourceRows[0].metadata.code
          ? sourceRows[0].metadata
          : {
              code: definition.code,
              name: definition.name,
              description: definition.description,
            },
      })
      .returning();
    await insertWorkflowGraph(transaction, version.id, input.graph);
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
