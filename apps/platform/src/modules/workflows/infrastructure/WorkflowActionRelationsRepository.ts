import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import type { WorkflowTransitionDefinition } from "../domain/transitions/WorkflowTransitionDefinition";
import {
  stageTaskActionBindings,
  workflowTransitionDefinitions,
} from "./workflow.schema";
import { workflowTransitionTargets } from "./workflow-parallel.schema";

export async function syncWorkflowActionBindings(
  transaction: DatabaseTransaction,
  stageId: string,
  actionKey: string,
  taskIds: string[],
) {
  await transaction
    .delete(stageTaskActionBindings)
    .where(
      and(
        eq(stageTaskActionBindings.stageId, stageId),
        eq(stageTaskActionBindings.actionKey, actionKey),
        taskIds.length
          ? notInArray(stageTaskActionBindings.taskDefinitionId, taskIds)
          : undefined,
      ),
    );
  if (taskIds.length) {
    await transaction
      .insert(stageTaskActionBindings)
      .values(
        taskIds.map((taskDefinitionId) => ({
          taskDefinitionId,
          stageId,
          actionKey,
        })),
      )
      .onConflictDoNothing();
  }
}

export async function replaceWorkflowActionRoutes(
  transaction: DatabaseTransaction,
  versionId: string,
  stageId: string,
  actionKey: string,
  routes: WorkflowTransitionDefinition[],
  stageIds: Map<string, string>,
) {
  const scope = and(
    eq(workflowTransitionDefinitions.versionId, versionId),
    eq(workflowTransitionDefinitions.fromStageId, stageId),
    eq(workflowTransitionDefinitions.actionKey, actionKey),
  );
  await transaction
    .delete(workflowTransitionTargets)
    .where(
      inArray(
        workflowTransitionTargets.transitionId,
        transaction
          .select({ id: workflowTransitionDefinitions.id })
          .from(workflowTransitionDefinitions)
          .where(scope),
      ),
    );
  await transaction.delete(workflowTransitionDefinitions).where(scope);
  const saved = routes.map((route) => ({
    ...route,
    id: route.id ?? randomUUID(),
  }));
  if (!saved.length) return saved;
  await transaction.insert(workflowTransitionDefinitions).values(
    saved.map((route) => ({
      id: route.id,
      versionId,
      fromStageId: stageId,
      actionKey,
      terminalOutcome: route.terminalOutcome ?? null,
      terminalApplicantStatus: route.terminalApplicantStatus ?? null,
      priority: route.priority,
      condition: route.condition,
    })),
  );
  const targets = saved.flatMap((route) =>
    route.targetStageKeys.map((key) => ({
      transitionId: route.id,
      targetStageId: stageIds.get(key)!,
    })),
  );
  if (targets.length)
    await transaction.insert(workflowTransitionTargets).values(targets);
  return saved;
}
