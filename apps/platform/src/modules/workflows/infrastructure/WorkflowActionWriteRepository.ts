import "server-only";

import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type { WorkflowActionDefinition } from "../domain/actions/WorkflowActionDefinition";
import type { WorkflowStageInput } from "../domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "../domain/transitions/WorkflowTransitionDefinition";
import {
  workflowActionDefinitions,
  workflowDefinitionVersions,
} from "./workflow.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";
import {
  replaceWorkflowActionRoutes,
  syncWorkflowActionBindings,
} from "./WorkflowActionRelationsRepository";

type SaveActionInput = {
  definitionId: string;
  versionId: string;
  expectedRowVersion: number;
  actorId: string;
  correlationId: string;
  stage: WorkflowStageInput;
  previous?: WorkflowActionDefinition;
  action: WorkflowActionDefinition;
  taskIds: string[];
  bindingsChanged: boolean;
  previousRoutes: WorkflowTransitionDefinition[];
  routes: WorkflowTransitionDefinition[];
  stageIds: Map<string, string>;
};

export async function saveDraftWorkflowAction(input: SaveActionInput) {
  return getDatabase().transaction(async (transaction) => {
    // The version compare-and-swap locks the draft before any child mutation.
    // A graph read by the service can only be written against that same revision.
    const [version] = await transaction
      .update(workflowDefinitionVersions)
      .set({
        rowVersion: input.expectedRowVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workflowDefinitionVersions.id, input.versionId),
          eq(workflowDefinitionVersions.definitionId, input.definitionId),
          eq(workflowDefinitionVersions.status, "DRAFT"),
          eq(workflowDefinitionVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .returning({ rowVersion: workflowDefinitionVersions.rowVersion });
    if (!version) return null;
    const action = { ...input.action, id: input.previous?.id ?? randomUUID() };
    if (!isDeepStrictEqual(input.previous, action)) {
      const row = {
        ...action,
        condition: action.condition ?? null,
        stageId: input.stage.id!,
      };
      if (input.previous) {
        await transaction
          .update(workflowActionDefinitions)
          .set(row)
          .where(
            and(
              eq(workflowActionDefinitions.id, action.id),
              eq(workflowActionDefinitions.stageId, input.stage.id!),
            ),
          );
      } else {
        await transaction.insert(workflowActionDefinitions).values(row);
      }
    }
    if (input.bindingsChanged) {
      await syncWorkflowActionBindings(
        transaction,
        input.stage.id!,
        action.stableKey,
        input.taskIds,
      );
    }
    const routes = isDeepStrictEqual(input.previousRoutes, input.routes)
      ? input.previousRoutes
      : await replaceWorkflowActionRoutes(
          transaction,
          input.versionId,
          input.stage.id!,
          action.stableKey,
          input.routes,
          input.stageIds,
        );
    await transaction.insert(workflowAuditEntries).values({
      action: input.previous
        ? "WORKFLOW_ACTION_UPDATED"
        : "WORKFLOW_ACTION_CREATED",
      actorId: input.actorId,
      correlationId: input.correlationId,
      targetId: input.versionId,
      targetType: "WORKFLOW_VERSION",
      before: {
        action: input.previous ?? null,
        rowVersion: input.expectedRowVersion,
      },
      after: {
        action,
        taskIds: input.taskIds,
        routes,
        rowVersion: version.rowVersion,
      },
    });
    return { action, routes, rowVersion: version.rowVersion };
  });
}
