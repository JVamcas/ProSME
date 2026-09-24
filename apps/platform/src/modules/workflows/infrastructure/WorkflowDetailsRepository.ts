import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageTaskActionBindings,
  stageTaskDefinitions,
  workflowActionDefinitions,
  workflowAuditEntries,
  workflowDefinitions,
  workflowDefinitionVersions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "@/db/schema";
import type { UpdateWorkflowDetailsInput } from "@/modules/workflows/api/WorkflowTransportTypes";

type DetailsUpdate = UpdateWorkflowDetailsInput & {
  actorId: string;
  correlationId: string;
  definitionId: string;
  versionId: string;
};

export async function updateWorkflowDefinitionDetails(input: DetailsUpdate) {
  return getDatabase().transaction(async (transaction) => {
    const [updatedVersion] = await transaction
      .update(workflowDefinitionVersions)
      .set({
        metadata: {
          code: input.code,
          name: input.name,
          description: input.description,
        },
        rowVersion: input.expectedRowVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workflowDefinitionVersions.id, input.versionId),
          eq(workflowDefinitionVersions.status, "DRAFT"),
          eq(workflowDefinitionVersions.definitionId, input.definitionId),
          eq(workflowDefinitionVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .returning({ id: workflowDefinitionVersions.id });
    if (!updatedVersion) return null;
    const [before] = await transaction
      .select({
        code: workflowDefinitions.code,
        description: workflowDefinitions.description,
        name: workflowDefinitions.name,
      })
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.id, input.definitionId));
    if (!before) return null;
    const after = {
      code: input.code,
      description: input.description,
      name: input.name,
    };
    await transaction
      .update(workflowDefinitions)
      .set({ ...after, updatedAt: new Date() })
      .where(eq(workflowDefinitions.id, input.definitionId));
    await transaction.insert(workflowAuditEntries).values({
      action: "WORKFLOW_DETAILS_UPDATED",
      actorId: input.actorId,
      after,
      before,
      correlationId: input.correlationId,
      targetId: input.versionId,
      targetType: "WORKFLOW_VERSION",
    });
    return input.versionId;
  });
}

export async function deleteWorkflowDefinition(input: {
  actorId: string;
  correlationId: string;
  definitionId: string;
  expectedRowVersion: number;
  versionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const versions = await transaction
      .select({
        id: workflowDefinitionVersions.id,
        rowVersion: workflowDefinitionVersions.rowVersion,
        status: workflowDefinitionVersions.status,
      })
      .from(workflowDefinitionVersions)
      .where(eq(workflowDefinitionVersions.definitionId, input.definitionId))
      .for("update");
    const [version] = versions;
    if (
      versions.length !== 1 ||
      version.id !== input.versionId ||
      version.status !== "DRAFT" ||
      version.rowVersion !== input.expectedRowVersion
    ) {
      return null;
    }
    const [definition] = await transaction
      .select({ id: workflowDefinitions.id })
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.id, input.definitionId))
      .for("update");
    if (!definition) return null;

    await transaction.insert(workflowAuditEntries).values({
      action: "WORKFLOW_DEFINITION_DELETED",
      actorId: input.actorId,
      after: { deleted: true },
      before: { rowVersion: input.expectedRowVersion, status: "DRAFT" },
      correlationId: input.correlationId,
      targetId: input.definitionId,
      targetType: "WORKFLOW_DEFINITION",
    });

    const stages = await transaction
      .select({ id: workflowStageDefinitions.id })
      .from(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.versionId, input.versionId));
    const stageIds = stages.map((stage) => stage.id);
    if (stageIds.length) {
      await transaction
        .delete(stageTaskActionBindings)
        .where(inArray(stageTaskActionBindings.stageId, stageIds));
    }
    await transaction
      .delete(workflowTransitionDefinitions)
      .where(eq(workflowTransitionDefinitions.versionId, input.versionId));
    if (stageIds.length) {
      await transaction
        .delete(workflowActionDefinitions)
        .where(inArray(workflowActionDefinitions.stageId, stageIds));
      await transaction
        .delete(stageTaskDefinitions)
        .where(inArray(stageTaskDefinitions.stageId, stageIds));
    }
    await transaction
      .delete(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.versionId, input.versionId));
    await transaction
      .delete(workflowDefinitionVersions)
      .where(eq(workflowDefinitionVersions.id, input.versionId));
    await transaction
      .delete(workflowDefinitions)
      .where(eq(workflowDefinitions.id, input.definitionId));
    return definition.id;
  });
}
