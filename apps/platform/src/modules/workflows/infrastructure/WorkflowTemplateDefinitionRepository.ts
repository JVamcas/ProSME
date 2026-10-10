import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import type { WorkflowTemplateDefinitionUpdateInput } from "../api/WorkflowTemplateSchemas";
import { workflowDefinitions } from "./workflow.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";

const definitionSelection = {
  id: workflowDefinitions.id,
  code: workflowDefinitions.code,
  name: workflowDefinitions.name,
  description: workflowDefinitions.description,
  updatedAt: workflowDefinitions.updatedAt,
};

export async function updateWorkflowTemplateDefinition(
  input: WorkflowTemplateDefinitionUpdateInput & {
    definitionId: string;
    actorId: string;
    correlationId: string;
  },
) {
  return getDatabase().transaction(async (transaction) => {
    const [before] = await transaction
      .select(definitionSelection)
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, input.definitionId),
          eq(workflowDefinitions.active, true),
          sql`date_trunc('milliseconds', ${workflowDefinitions.updatedAt}) = ${input.expectedUpdatedAt}::timestamptz`,
        ),
      )
      .for("update")
      .limit(1);
    if (!before) return null;
    const [after] = await transaction
      .update(workflowDefinitions)
      .set({
        code: input.code,
        name: input.name,
        description: input.description,
        updatedAt: sql`greatest(clock_timestamp(), ${workflowDefinitions.updatedAt} + interval '1 millisecond')`,
      })
      .where(eq(workflowDefinitions.id, input.definitionId))
      .returning(definitionSelection);
    await transaction.insert(workflowAuditEntries).values({
      action: "WORKFLOW_DEFINITION_UPDATED",
      actorId: input.actorId,
      correlationId: input.correlationId,
      targetId: input.definitionId,
      targetType: "WORKFLOW_DEFINITION",
      before,
      after,
    });
    return { ...after, updatedAt: after.updatedAt.toISOString() };
  });
}
