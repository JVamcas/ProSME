import "server-only";

import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import {
  workflowDefinitions,
  workflowDefinitionVersions,
} from "./workflow.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";
import { deleteWorkflowVersionGraphs } from "./WorkflowGraphDeletionRepository";

type DeleteTemplateInput = {
  actorId: string;
  correlationId: string;
  definitionId: string;
  expectedRowVersion: number;
  versionId: string;
};

function foreignKeyConflict(error: unknown): boolean {
  let cause = error;
  for (let depth = 0; depth < 5; depth++) {
    if (!cause || typeof cause !== "object") return false;
    if ("code" in cause && cause.code === "23503") return true;
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return false;
}

export async function deleteWorkflowDefinition(input: DeleteTemplateInput) {
  try {
    return await getDatabase().transaction(async (transaction) => {
      const [definition] = await transaction
        .select({ id: workflowDefinitions.id })
        .from(workflowDefinitions)
        .where(eq(workflowDefinitions.id, input.definitionId))
        .for("update");
      if (!definition) return null;
      // Lock the whole version set before deciding whether the template is draft-only.
      const versions = await transaction
        .select({
          id: workflowDefinitionVersions.id,
          status: workflowDefinitionVersions.status,
          rowVersion: workflowDefinitionVersions.rowVersion,
        })
        .from(workflowDefinitionVersions)
        .where(eq(workflowDefinitionVersions.definitionId, input.definitionId))
        .orderBy(desc(workflowDefinitionVersions.versionNumber))
        .for("update");
      const latest = versions[0];
      if (
        !latest ||
        latest.id !== input.versionId ||
        latest.rowVersion !== input.expectedRowVersion ||
        versions.some((version) => version.status !== "DRAFT")
      )
        return null;
      const ids = versions.map((version) => version.id);
      const parameters = sql.join(
        ids.map((id) => sql`${id}::uuid`),
        sql`, `,
      );
      await deleteWorkflowVersionGraphs(transaction, ids);
      // Internal conversion mappings belong to the deleted draft-only template.
      // External references remain protected by their restrictive foreign keys.
      const mappings = await transaction.execute(sql`
        DELETE FROM app_workflow_form_migrations
        WHERE source_version_id IN (${parameters}) AND target_version_id IN (${parameters})
        RETURNING source_version_id, target_version_id, mapping
      `);
      await transaction.insert(workflowAuditEntries).values({
        action: "WORKFLOW_DEFINITION_DELETED",
        actorId: input.actorId,
        correlationId: input.correlationId,
        targetId: input.definitionId,
        targetType: "WORKFLOW_DEFINITION",
        before: { versions, conversions: mappings.rows },
        after: { deleted: true },
      });
      await transaction
        .delete(workflowDefinitionVersions)
        .where(inArray(workflowDefinitionVersions.id, ids));
      await transaction
        .delete(workflowDefinitions)
        .where(eq(workflowDefinitions.id, input.definitionId));
      return definition.id;
    });
  } catch (error) {
    if (foreignKeyConflict(error)) return null;
    throw error;
  }
}
