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
import {
  isRuntimeWorkflowControlAction,
  isSupportedWorkflowAction,
} from "../../domain/actions/WorkflowActionDefinition";
import { readWorkflowControlDestinations } from "../../infrastructure/WorkflowControlDestinationRepository";
import type { WorkflowActionDefinition } from "../../domain/actions/WorkflowActionDefinition";
import { taskActionMatchesType } from "../../domain/runtime/WorkflowTaskCompletionPolicy";
import {
  readWorkflowActionAvailabilitySource,
  workflowActionAvailabilityDatabase,
  type WorkflowActionAvailabilitySource,
  type StoredWorkflowAction,
} from "../../infrastructure/WorkflowActionAvailabilityRepository";
import { configuredActionTargetsAreValid } from "../../infrastructure/WorkflowActionTargetRepository";
import { readWorkflowRfiFieldOptions } from "../../infrastructure/WorkflowRfiFieldRepository";
import { loadSequentialTransitions } from "../../infrastructure/TransitionExecutionRepository";
import { buildWorkflowActionConditionContext } from "./ServerWorkflowActionContextService";
import {
  evaluateWorkflowActionConditions,
  evaluateWorkflowActionPolicy,
} from "./WorkflowActionPolicy";
import {
  readWorkflowActionReadiness,
  workflowActionReadinessReason,
} from "./ServerWorkflowActionReadinessService";

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
    approvalEligibilityReady: source.stage.approvalEligibilityReady,
    activeDeferral: source.stage.activeDeferral,
    activeDeferralReady: source.stage.activeDeferralReady,
    activeHold: source.stage.activeHold,
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

  const preliminary = source.actions
    .filter((action) => isSupportedWorkflowAction(action.actionType))
    .map((action) => {
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
            configurationValid:
              Boolean(definition) &&
              (!source.task ||
                taskActionMatchesType({
                  actionType: action.actionType,
                  taskType: source.task.taskType,
                })),
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
    return preliminary.map((item) =>
      toAvailability(
        source,
        item.action,
        item.definition,
        false,
        item.policy.unavailableReason,
      ),
    );
  }

  const database = workflowActionAvailabilityDatabase();
  const [context, readiness, editableFields] = await Promise.all([
    buildWorkflowActionConditionContext(database, source.stage, true),
    readWorkflowActionReadiness(database, {
      actionTypes: candidates.map((item) => item.action.actionType),
      actorId: actor.id,
      recordQuorumEvaluation: false,
      previewFormSubmission: source.task?.taskType === "STAGE_DECISION",
      stageDefinitionId: source.stage.stageDefinitionId,
      stageInstanceId: source.stage.stageInstanceId,
      taskId: source.task?.id,
    }),
    candidates.some(
      (item) => item.definition.actionType === "REQUEST_INFORMATION",
    )
      ? readWorkflowRfiFieldOptions(
          database,
          String(source.stage.application.id),
        )
      : Promise.resolve([]),
  ]);
  const evaluated = new Map<string, WorkflowActionAvailability>();
  await Promise.all(
    candidates.map(async (item) => {
      const action = { ...item.definition, id: item.action.id };
      const runtimeControl = isRuntimeWorkflowControlAction(action.actionType);
      const [destinations, configuredTargetsValid, transitions] =
        await Promise.all([
          isRuntimeWorkflowControlAction(action.actionType)
            ? readWorkflowControlDestinations(database, {
                actionType: action.actionType,
                sourceStageInstanceId: source.stage.stageInstanceId,
                workflowInstanceId: source.stage.workflowInstanceId,
              })
            : Promise.resolve([]),
          runtimeControl
            ? Promise.resolve(true)
            : configuredActionTargetsAreValid(database, {
                action,
                stage: source.stage,
              }),
          loadSequentialTransitions(database, {
            actionKey: action.stableKey,
            sourceStageDefinitionId: source.stage.stageDefinitionId,
            workflowVersionId: source.stage.workflowVersionId,
          }),
        ]);
      const configuredConditions = evaluateWorkflowActionConditions(
        action,
        transitions.transitions,
        context,
      );
      const conditions = runtimeControl
        ? evaluateWorkflowActionConditions(action, [], context)
        : configuredConditions;
      const targetsValid = runtimeControl
        ? destinations.length > 0
        : configuredTargetsValid;
      const defaultDestination = transitions.transitions.find(
        (transition) =>
          transition.id === configuredConditions.selectedTransitionId,
      )?.targetStages[0];
      const policy = evaluateWorkflowActionPolicy(
        actor,
        policyTarget(source, item.action),
        {
          conditionsPass: conditions.available,
          configurationValid: true,
          targetsValid,
        },
      );
      const readinessReason = workflowActionReadinessReason(
        action.actionType,
        readiness,
      );
      evaluated.set(
        action.stableKey,
        toAvailability(
          source,
          item.action,
          action,
          policy.available && readinessReason === null,
          policy.unavailableReason ?? readinessReason,
        ),
      );
      if (runtimeControl) {
        const availability = evaluated.get(action.stableKey)!;
        availability.requiredInput = {
          ...availability.requiredInput,
          destinationStages: destinations,
          defaultDestinationStageId: destinations.some(
            (destination) => destination.id === defaultDestination?.id,
          )
            ? defaultDestination?.id
            : undefined,
        };
        if (policy.unavailableReason && !targetsValid) {
          availability.unavailableReason =
            action.actionType === "RETURN"
              ? "No completed previous stage is available to reopen."
              : "No previous stage is available in this workflow.";
        }
      }
      if (action.actionType === "REQUEST_INFORMATION") {
        const availability = evaluated.get(action.stableKey)!;
        availability.requiredInput = {
          ...availability.requiredInput,
          editableFieldPaths: editableFields.map((field) => field.path),
          editableFields,
        };
      }
    }),
  );

  return preliminary.map(
    (item) =>
      evaluated.get(item.action.stableKey) ??
      toAvailability(
        source,
        item.action,
        item.definition,
        false,
        item.policy.unavailableReason,
      ),
  );
}
