import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { WorkflowActionSaveInput } from "../../api/WorkflowActionSaveSchema";
import {
  changedWorkflowActionGraph,
  changedWorkflowActionStage,
} from "../../domain/actions/WorkflowActionChange";
import { saveDraftWorkflowAction } from "../../infrastructure/WorkflowActionWriteRepository";
import { validateWorkflowActionSave } from "./WorkflowActionSaveValidation";
import {
  loadWorkflowEditor,
  workflowEditorViewFromRecord,
  WorkflowConflictError,
  WorkflowNotFoundError,
} from "./ServerWorkflowSupport";

export async function saveWorkflowAction(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: WorkflowActionSaveInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionUpdate,
  );
  const record = await loadWorkflowEditor(input.versionId);
  if (record.definition.id !== definitionId) throw new WorkflowNotFoundError();
  if (record.version.status !== "DRAFT") {
    throw new WorkflowConflictError("Only draft versions can be edited.");
  }
  if (record.version.rowVersion !== input.expectedRowVersion)
    throw new WorkflowConflictError();
  const stage = record.graph.stages.find(
    (item) => item.stableKey === input.stageKey,
  );
  if (!stage) throw new WorkflowNotFoundError();
  const previous = validateWorkflowActionSave(record.graph, stage, input);
  const action = {
    ...input.action,
    id: previous?.id,
    condition: input.action.condition ?? null,
  };
  const change = { ...input, action };
  const nextStage = changedWorkflowActionStage(stage, change);
  const taskIds = nextStage.tasks
    .filter((task) => task.actionKeys.includes(action.stableKey))
    .map((task) => task.id!);
  const bindingsChanged = stage.tasks.some(
    (task) =>
      task.actionKeys.includes(action.stableKey) !== taskIds.includes(task.id!),
  );
  const saved = await saveDraftWorkflowAction({
    definitionId,
    versionId: input.versionId,
    expectedRowVersion: input.expectedRowVersion,
    actorId: actor.id,
    correlationId,
    stage,
    previous,
    action,
    taskIds,
    bindingsChanged,
    previousRoutes: record.graph.transitions.filter(
      (route) =>
        route.sourceStageKey === stage.stableKey &&
        route.actionKey === action.stableKey,
    ),
    routes: input.routes,
    stageIds: new Map(
      record.graph.stages.map((item) => [item.stableKey, item.id!]),
    ),
  });
  if (!saved) throw new WorkflowConflictError();
  const savedStage = {
    ...nextStage,
    actions: nextStage.actions
      .map((item) =>
        item.stableKey === action.stableKey ? saved.action : item,
      )
      .sort((left, right) => left.displayOrder - right.displayOrder),
  };
  // Reuse the already loaded graph and the rows returned by the transaction.
  // Validation runs once; saving does not read the entire editor again.
  return workflowEditorViewFromRecord(
    {
      ...record,
      graph: changedWorkflowActionGraph(record.graph, savedStage, {
        ...change,
        routes: saved.routes,
      }),
      version: { ...record.version, rowVersion: saved.rowVersion },
    },
    false,
  );
}
