import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  emptyWorkflowActionInputMetadata,
  workflowActionInputMetadata,
  workflowActionPresentation,
  type WorkflowActionAvailability,
} from "../../domain/actions/WorkflowActionAvailability";
import { workflowActionDefinitionSchema } from "../../domain/actions/WorkflowActionSchemas";
import type { WorkflowActionDefinition } from "../../domain/actions/WorkflowActionDefinition";
import {
  readWorkflowActionAvailabilitySource,
  workflowActionAvailabilityDatabase,
  type WorkflowActionAvailabilitySource,
  type StoredWorkflowAction,
} from "../../infrastructure/WorkflowActionAvailabilityRepository";
import { configuredActionTargetsAreValid } from "../../infrastructure/WorkflowActionTargetRepository";
import { loadSequentialTransitions } from "../../infrastructure/TransitionExecutionRepository";
import { buildWorkflowActionConditionContext } from "./ServerWorkflowActionContextService";
import {
  evaluateWorkflowActionConditions,
  evaluateWorkflowActionPolicy,
} from "./WorkflowActionPolicy";

export type GetWorkflowActionAvailabilityInput = {
  sourceStageInstanceId: string;
  taskId?: string;
  workflowInstanceId: string;
};

function assertReadAccess(
  actor: AuthenticatedUser,
  source: WorkflowActionAvailabilitySource,
) {
  if (!source.task) {
    requirePermission(actor, permissionCodes.workflowTaskAllRead);
    return;
  }
  requirePermission(actor, source.task.permissions.view);
  if (!source.task.assignedToActor) {
    throw new ResourceNotFoundError("workflow task");
  }
}

function policyTarget(
  source: WorkflowActionAvailabilitySource,
  action: StoredWorkflowAction,
) {
  return {
    action,
    stageStatus: source.stage.status,
    task: source.task,
    workflowStatus: source.stage.workflowStatus ?? "ACTIVE",
  };
}

function toAvailability(
  source: WorkflowActionAvailabilitySource,
  action: StoredWorkflowAction,
  definition: WorkflowActionDefinition | null,
  available: boolean,
  unavailableReason: string | null,
): WorkflowActionAvailability {
  return {
    actionType: action.actionType,
    available,
    key: action.stableKey,
    label: action.label,
    presentation: definition
      ? workflowActionPresentation(definition)
      : { displayOrder: action.displayOrder, variant: "outline" },
    requiredInput: definition
      ? workflowActionInputMetadata(definition)
      : emptyWorkflowActionInputMetadata,
    runtimeVersion: source.stage.rowVersion,
    unavailableReason,
  };
}

export async function getWorkflowActionAvailability(
  user: AuthenticatedUser | null,
  input: GetWorkflowActionAvailabilityInput,
): Promise<WorkflowActionAvailability[]> {
  const actor = requireAuthenticatedUser(user);
  const source = await readWorkflowActionAvailabilitySource({
    actorId: actor.id,
    ...input,
  });
  if (!source) throw new ResourceNotFoundError("workflow action source");
  assertReadAccess(actor, source);

  const preliminary = source.actions.map((action) => {
    const parsed = workflowActionDefinitionSchema.safeParse(action);
    const definition = parsed.success ? parsed.data : null;
    return {
      action,
      definition,
      policy: evaluateWorkflowActionPolicy(
        actor,
        policyTarget(source, action),
        {
          conditionsPass: true,
          configurationValid: Boolean(definition),
          targetsValid: true,
        },
      ),
    };
  });
  const candidates = preliminary.filter(
    (item): item is typeof item & { definition: WorkflowActionDefinition } =>
      item.policy.available && item.definition !== null,
  );
  if (!candidates.length) {
    return preliminary.map((item) => toAvailability(
      source,
      item.action,
      item.definition,
      false,
      item.policy.unavailableReason,
    ));
  }

  const database = workflowActionAvailabilityDatabase();
  const context = await buildWorkflowActionConditionContext(
    database,
    source.stage,
    true,
  );
  const evaluated = new Map<string, WorkflowActionAvailability>();
  await Promise.all(candidates.map(async (item) => {
    const action = { ...item.definition, id: item.action.id };
    const [targetsValid, transitions] = await Promise.all([
      configuredActionTargetsAreValid(database, {
        action,
        stage: source.stage,
      }),
      loadSequentialTransitions(database, {
        actionKey: action.stableKey,
        sourceStageDefinitionId: source.stage.stageDefinitionId,
        workflowVersionId: source.stage.workflowVersionId,
      }),
    ]);
    const conditions = evaluateWorkflowActionConditions(
      action,
      transitions.transitions,
      context,
    );
    const policy = evaluateWorkflowActionPolicy(
      actor,
      policyTarget(source, item.action),
      {
        conditionsPass: conditions.available,
        configurationValid: true,
        targetsValid,
      },
    );
    evaluated.set(action.stableKey, toAvailability(
      source,
      item.action,
      action,
      policy.available,
      policy.unavailableReason,
    ));
  }));

  return preliminary.map((item) =>
    evaluated.get(item.action.stableKey)
      ?? toAvailability(
        source,
        item.action,
        item.definition,
        false,
        item.policy.unavailableReason,
      )
  );
}
