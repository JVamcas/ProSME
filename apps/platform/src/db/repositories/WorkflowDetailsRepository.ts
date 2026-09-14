import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  workflowAuditEntries,
  workflowDefinitions,
  workflowDefinitionVersions,
} from "@/db/schema";
import type { UpdateWorkflowDetailsInput } from "@/modules/workflows/WorkflowTransportTypes";

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
      .set({ rowVersion: input.expectedRowVersion + 1, updatedAt: new Date() })
      .where(
        and(
          eq(workflowDefinitionVersions.id, input.versionId),
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
      targetId: input.definitionId,
      targetType: "WORKFLOW_DEFINITION",
    });
    return input.versionId;
  });
}
