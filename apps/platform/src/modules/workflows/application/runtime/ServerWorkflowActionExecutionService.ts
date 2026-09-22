import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  IdempotencyConflictError,
} from "@/lib/resource-errors";
import { buildStageCompletionValues } from "../../engine/StageCompletionContext";
import {
  evaluateStageCondition,
  normalizeStageConditionRecord,
} from "../../engine/StageCondition";
import { loadPriorStageContext } from "../../infrastructure/StageActivationRepository";
import { loadStageCompletionValues } from "../../infrastructure/StageCompletionRepository";
import {
  claimWorkflowActionRuntimeVersion,
  completeActionTask,
  configuredActionTargetsAreValid,
  findWorkflowActionExecution,
  lockWorkflowActionExecutionTarget,
  recordWorkflowActionExecution,
  withWorkflowActionExecutionTransaction,
  workflowActionExecutionDatabase,
  type WorkflowActionExecutionTarget,
} from "../../infrastructure/WorkflowActionExecutionRepository";
import {
  validateActionInputAgainstConfiguration,
  WorkflowActionExecutionError,
  type WorkflowActionExecutionRequest,
  type WorkflowActionExecutionResult,
} from "../../domain/actions/WorkflowActionExecution";
import { workflowActionDefinitionSchema } from "../../domain/actions/WorkflowActionSchemas";
import type { WorkflowActionType } from "../../domain/actions/WorkflowActionDefinition";
import { executeSequentialTransitionInTransaction } from "./ServerSequentialTransitionService";

const decisionActionTypes = new Set<WorkflowActionType>([
  "APPROVE_ADVANCE",
  "DEFER",
  "REJECT",
  "RETURN",
  "WITHDRAW",
]);

type ExecuteInput = WorkflowActionExecutionRequest & {
  actionKey: string;
  correlationId: string;
  idempotencyKey: string;
  workflowInstanceId: string;
};

function fail(
  code: ConstructorParameters<typeof WorkflowActionExecutionError>[0],
  message: string,
): never {
  throw new WorkflowActionExecutionError(code, message);
}

function assertPermissionAndContext(
  actor: AuthenticatedUser,
  target: WorkflowActionExecutionTarget,
) {
  const permission = target.task
    ? decisionActionTypes.has(target.action.actionType)
      ? target.task.permissions.decide
      : target.task.permissions.edit
    : decisionActionTypes.has(target.action.actionType)
      ? permissionCodes.workflowTaskAssignedDecide
      : permissionCodes.workflowTaskAssignedProcess;
  requirePermission(actor, permission);
  if (target.task && !target.task.assignedToActor) {
    fail("INVALID_RUNTIME_CONTEXT", "The task is not assigned to this actor.");
  }
}

function assertRuntimeState(
  target: WorkflowActionExecutionTarget,
  input: ExecuteInput,
) {
  if (target.stage.workflowInstanceId !== input.workflowInstanceId) {
    fail("INVALID_RUNTIME_CONTEXT", "The stage does not belong to the workflow.");
  }
  if (target.stage.rowVersion !== input.expectedRuntimeVersion) {
    fail("STALE_RUNTIME_VERSION", "The workflow changed. Refresh and try again.");
  }
  if (target.task
    && !["CLAIMED", "IN_PROGRESS"].includes(target.task.status)) {
    fail("ACTION_UNAVAILABLE", "The task state does not permit this action.");
  }
}

async function buildConditionContext(
  transaction: Parameters<
    Parameters<typeof withWorkflowActionExecutionTransaction>[0]
  >[0],
  target: WorkflowActionExecutionTarget,
) {
  const priorStages = await loadPriorStageContext(
    transaction,
    target.stage.workflowInstanceId,
  );
  const values = await loadStageCompletionValues(
    transaction,
    target.stage.stageInstanceId,
  );
  return {
    application: normalizeStageConditionRecord(target.stage.application),
    eligibility: normalizeStageConditionRecord(target.stage.eligibility),
    fundingCall: normalizeStageConditionRecord(target.stage.fundingCall),
    stages: [
      ...priorStages
        .filter((stage) => stage.stableKey !== target.stage.stageKey)
        .map((stage) => ({
          stableKey: stage.stableKey,
          values: normalizeStageConditionRecord(stage.values),
        })),
      {
        stableKey: target.stage.stageKey,
        values: normalizeStageConditionRecord(
          buildStageCompletionValues(values),
        ),
      },
    ],
  };
}

function transitionResult(
  transition: Awaited<ReturnType<typeof executeSequentialTransitionInTransaction>>,
) {
  switch (transition.kind) {
    case "source_stage_not_completed":
      return {
        kind: "STAGE_ACTIVE" as const,
        targetStageInstanceId: null,
        targetStageName: null,
        workflowStatus: "ACTIVE" as const,
      };
    case "transitioned":
      return {
        kind: "STAGE_ACTIVATED" as const,
        targetStageInstanceId: transition.targetStageInstanceId,
        targetStageName: transition.targetStageName,
        workflowStatus: transition.workflowStatus,
      };
    case "workflow_completed":
      return {
        kind: "WORKFLOW_COMPLETED" as const,
        targetStageInstanceId: null,
        targetStageName: null,
        workflowStatus: transition.workflowStatus,
      };
    case "transition_not_found":
      return {
        kind: "NONE" as const,
        targetStageInstanceId: null,
        targetStageName: null,
        workflowStatus: "ACTIVE" as const,
      };
    case "transition_condition_failed":
    case "target_entry_condition_failed":
      return fail(
        "CONDITION_FAILED",
        "The configured action or transition conditions did not pass.",
      );
    default:
      return fail(
        "ACTION_UNAVAILABLE",
        "The configured action cannot execute from the current runtime state.",
      );
  }
}

function isIdempotencyConstraint(error: unknown) {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && error.code === "23505",
  );
}

export async function executeWorkflowAction(
  user: AuthenticatedUser | null,
  input: ExecuteInput,
): Promise<WorkflowActionExecutionResult> {
  const actor = requireAuthenticatedUser(user);
  const replayCommand = {
    actionKey: input.actionKey,
    actorId: actor.id,
    expectedRuntimeVersion: input.expectedRuntimeVersion,
    input: input.input,
    sourceStageInstanceId: input.sourceStageInstanceId,
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  };
  const database = workflowActionExecutionDatabase();
  const replay = await findWorkflowActionExecution(
    database,
    input.idempotencyKey,
    replayCommand,
  );
  if (replay) {
    if (replay.matchesCommand) return replay.result;
    throw new IdempotencyConflictError(
      "That idempotency key was already used for another workflow action.",
    );
  }

  try {
    return await withWorkflowActionExecutionTransaction(async (transaction) => {
      const target = await lockWorkflowActionExecutionTarget(transaction, {
        actionKey: input.actionKey,
        actorId: actor.id,
        sourceStageInstanceId: input.sourceStageInstanceId,
        taskId: input.taskId,
      });
      if (!target) {
        const concurrentReplay = await findWorkflowActionExecution(
          transaction,
          input.idempotencyKey,
          replayCommand,
        );
        if (concurrentReplay?.matchesCommand) return concurrentReplay.result;
        if (concurrentReplay) {
          throw new IdempotencyConflictError(
            "That idempotency key was already used for another workflow action.",
          );
        }
        fail(
          "ACTION_NOT_CONFIGURED",
          "The action is not configured for this workflow stage and task.",
        );
      }
      assertRuntimeState(target, input);
      assertPermissionAndContext(actor, target);
      const parsedAction = workflowActionDefinitionSchema.safeParse(target.action);
      if (!parsedAction.success) {
        fail(
          "INVALID_RUNTIME_CONTEXT",
          "The published action configuration is invalid.",
        );
      }
      target.action = { ...parsedAction.data, id: target.action.id };
      const inputError = validateActionInputAgainstConfiguration(
        target.action,
        input.input,
        target.stage.stageKey,
      );
      if (inputError) fail("INVALID_ACTION_INPUT", inputError);
      if (!await configuredActionTargetsAreValid(transaction, target)) {
        fail(
          "INVALID_RUNTIME_CONTEXT",
          "The published action contains an invalid target reference.",
        );
      }

      const conditionContext = await buildConditionContext(transaction, target);
      const actionEvaluation = evaluateStageCondition(
        target.action.condition ?? null,
        conditionContext,
      );
      if (!actionEvaluation.passed) {
        fail("CONDITION_FAILED", "The configured action conditions did not pass.");
      }
      const resultingRuntimeVersion = await claimWorkflowActionRuntimeVersion(
        transaction,
        target.stage.stageInstanceId,
        input.expectedRuntimeVersion,
      );
      if (!resultingRuntimeVersion) {
        fail("STALE_RUNTIME_VERSION", "The workflow changed. Refresh and try again.");
      }
      if (target.task) {
        const completed = await completeActionTask(transaction, {
          normalizedInput: input.input,
          task: target.task,
        });
        if (!completed) {
          fail("ACTION_UNAVAILABLE", "The task changed before the action completed.");
        }
      }
      const transition = transitionResult(
        await executeSequentialTransitionInTransaction(transaction, {
          actionKey: input.actionKey,
          actorId: actor.id,
          conditionContext,
          correlationId: input.correlationId,
          sourceStageInstanceId: input.sourceStageInstanceId,
        }),
      );
      const executionId = crypto.randomUUID();
      const executedAt = new Date().toISOString();
      const result: WorkflowActionExecutionResult = {
        actionExecutionId: executionId,
        actionKey: target.action.stableKey,
        actionType: target.action.actionType,
        executedAt,
        resultingRuntimeVersion,
        sourceStageInstanceId: target.stage.stageInstanceId,
        taskId: target.task?.id ?? null,
        transition,
        workflowInstanceId: target.stage.workflowInstanceId,
      };
      await recordWorkflowActionExecution(transaction, {
        action: target.action,
        actorId: actor.id,
        conditionEvaluation: {
          action: actionEvaluation,
          capturedAt: executedAt,
        },
        correlationId: input.correlationId,
        expectedRuntimeVersion: input.expectedRuntimeVersion,
        id: executionId,
        idempotencyKey: input.idempotencyKey,
        normalizedInput: input.input,
        resolvedTarget: {
          kind: transition.kind,
          targetStageInstanceId: transition.targetStageInstanceId,
          targetStageName: transition.targetStageName,
        },
        result,
        resultingRuntimeVersion,
        sourceStageInstanceId: target.stage.stageInstanceId,
        taskBefore: target.task,
        taskId: target.task?.id ?? null,
        workflowInstanceId: target.stage.workflowInstanceId,
      });
      return result;
    });
  } catch (error) {
    if (!isIdempotencyConstraint(error)) throw error;
    const racedReplay = await findWorkflowActionExecution(
      database,
      input.idempotencyKey,
      replayCommand,
    );
    if (racedReplay?.matchesCommand) return racedReplay.result;
    throw new IdempotencyConflictError(
      "That idempotency key was already used for another workflow action.",
    );
  }
}
