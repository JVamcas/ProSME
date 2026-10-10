import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase, type DatabaseTransaction } from "@/db/client";
import {
  stageTaskActionBindings,
  workflowActionDefinitions,
  workflowDefinitionVersions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "./workflow.schema";
import { workflowTransitionTargets } from "./workflow-parallel.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";

type DeleteActionInput = {
  actorId: string;
  correlationId: string;
  definitionId: string;
  versionId: string;
  expectedRowVersion: number;
  stageKey: string;
  actionKey: string;
};

async function reorderStageActions(
  transaction: DatabaseTransaction,
  stageId: string,
) {
  // Move into a disjoint positive range before compacting. The immediate unique
  // index on (stage_id, display_order) must hold throughout both updates.
  await transaction.execute(sql`
    WITH positions AS (
      SELECT id, max(display_order) OVER () + row_number() OVER (ORDER BY display_order, id) AS temporary_order
      FROM app_workflow_action_definitions WHERE stage_id = ${stageId}::uuid
    )
    UPDATE app_workflow_action_definitions action
    SET display_order = positions.temporary_order
    FROM positions WHERE action.id = positions.id
  `);
  await transaction.execute(sql`
    WITH positions AS (
      SELECT id, row_number() OVER (ORDER BY display_order, id) AS final_order
      FROM app_workflow_action_definitions WHERE stage_id = ${stageId}::uuid
    )
    UPDATE app_workflow_action_definitions action
    SET display_order = positions.final_order
    FROM positions WHERE action.id = positions.id
  `);
}

export async function deleteDraftWorkflowAction(input: DeleteActionInput) {
  return getDatabase().transaction(async (transaction) => {
    const [target] = await transaction
      .select({
        status: workflowDefinitionVersions.status,
        rowVersion: workflowDefinitionVersions.rowVersion,
        stageId: workflowStageDefinitions.id,
        actionId: workflowActionDefinitions.id,
        label: workflowActionDefinitions.label,
      })
      .from(workflowDefinitionVersions)
      .leftJoin(
        workflowStageDefinitions,
        and(
          eq(workflowStageDefinitions.versionId, workflowDefinitionVersions.id),
          eq(workflowStageDefinitions.code, input.stageKey),
        ),
      )
      .leftJoin(
        workflowActionDefinitions,
        and(
          eq(workflowActionDefinitions.stageId, workflowStageDefinitions.id),
          eq(workflowActionDefinitions.stableKey, input.actionKey),
        ),
      )
      .where(
        and(
          eq(workflowDefinitionVersions.id, input.versionId),
          eq(workflowDefinitionVersions.definitionId, input.definitionId),
        ),
      )
      .for("update", { of: workflowDefinitionVersions });
    if (!target) return { kind: "not_found" } as const;
    if (target.status !== "DRAFT") return { kind: "not_draft" } as const;
    if (target.rowVersion !== input.expectedRowVersion)
      return { kind: "conflict" } as const;
    if (!target.stageId || !target.actionId)
      return { kind: "missing_action" } as const;

    const routes = and(
      eq(workflowTransitionDefinitions.versionId, input.versionId),
      eq(workflowTransitionDefinitions.fromStageId, target.stageId),
      eq(workflowTransitionDefinitions.actionKey, input.actionKey),
    );
    // Restrictive foreign keys require dependent bindings/targets to be removed
    // before their routes and action. The version lock serializes draft edits.
    await transaction
      .delete(workflowTransitionTargets)
      .where(
        inArray(
          workflowTransitionTargets.transitionId,
          transaction
            .select({ id: workflowTransitionDefinitions.id })
            .from(workflowTransitionDefinitions)
            .where(routes),
        ),
      );
    await transaction.delete(workflowTransitionDefinitions).where(routes);
    await transaction
      .delete(stageTaskActionBindings)
      .where(
        and(
          eq(stageTaskActionBindings.stageId, target.stageId),
          eq(stageTaskActionBindings.actionKey, input.actionKey),
        ),
      );
    await transaction
      .delete(workflowActionDefinitions)
      .where(eq(workflowActionDefinitions.id, target.actionId));
    await reorderStageActions(transaction, target.stageId);
    await transaction
      .update(workflowDefinitionVersions)
      .set({ rowVersion: input.expectedRowVersion + 1, updatedAt: new Date() })
      .where(eq(workflowDefinitionVersions.id, input.versionId));
    await transaction.insert(workflowAuditEntries).values({
      action: "WORKFLOW_ACTION_DELETED",
      actorId: input.actorId,
      correlationId: input.correlationId,
      targetId: input.versionId,
      targetType: "WORKFLOW_VERSION",
      before: {
        actionId: target.actionId,
        label: target.label,
        rowVersion: input.expectedRowVersion,
      },
      after: {
        actionKey: input.actionKey,
        stageKey: input.stageKey,
        rowVersion: input.expectedRowVersion + 1,
      },
    });
    return { kind: "deleted", versionId: input.versionId } as const;
  });
}
