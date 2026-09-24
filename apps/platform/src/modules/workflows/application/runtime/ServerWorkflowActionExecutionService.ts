import "server-only";

import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  IdempotencyConflictError,
} from "@/lib/resource-errors";
import {
  claimWorkflowActionRuntimeVersion,
  completeActionTask,
  findWorkflowActionExecution,
  lockWorkflowActionExecutionTarget,
  withWorkflowActionExecutionTransaction,
  workflowActionExecutionDatabase,
  type WorkflowActionExecutionTarget,
} from "../../infrastructure/WorkflowActionExecutionRepository";
import {
  loadRequiredTaskCompletions,
  recordReviewThresholdEvaluations,
} from "../../infrastructure/StageCompletionRepository";
import { evaluateStageQuorum } from "../../infrastructure/WorkflowQuorumRepository";
import { configuredActionTargetsAreValid } from "../../infrastructure/WorkflowActionTargetRepository";
import {
  validateActionInputAgainstConfiguration,
  WorkflowActionExecutionError,
  type WorkflowActionExecutionResult,
} from "../../domain/actions/WorkflowActionExecution";
import { workflowActionDefinitionSchema } from "../../domain/actions/WorkflowActionSchemas";
import { loadSequentialTransitions } from "../../infrastructure/TransitionExecutionRepository";
import {
  executeConfiguredWorkflowActionOutcome,
  type ExecuteWorkflowActionInput,
} from "./ServerWorkflowActionOutcomeService";
import { buildWorkflowActionConditionContext } from "./ServerWorkflowActionContextService";
import {
  evaluateWorkflowActionConditions,
  evaluateWorkflowActionPolicy,
  requiredWorkflowActionPermission,
  type WorkflowActionPolicyResult,
} from "./WorkflowActionPolicy";

function fail(
  code: ConstructorParameters<typeof WorkflowActionExecutionError>[0],
  message: string,
): never {
  throw new WorkflowActionExecutionError(code, message);
}

function enforceWorkflowActionPolicy(
  actor: AuthenticatedUser,
  target: WorkflowActionExecutionTarget,
  result: WorkflowActionPolicyResult,
) {
  if (result.available) return;
  switch (result.reason) {
    case "PERMISSION_DENIED":
      requirePermission(
        actor,
        requiredWorkflowActionPermission(target.action, target.task),
      );
      return;
    case "CONDITION_FAILED":
      fail("CONDITION_FAILED", result.unavailableReason!);
    case "INVALID_CONFIGURATION":
      fail("INVALID_RUNTIME_CONTEXT", result.unavailableReason!);
    case "ACTION_DISABLED":
    case "INVALID_STATE":
      fail("ACTION_UNAVAILABLE", result.unavailableReason!);
    default:
      fail("INVALID_RUNTIME_CONTEXT", result.unavailableReason!);
  }
}

function assertRuntimeIdentityAndVersion(
  target: WorkflowActionExecutionTarget,
  input: ExecuteWorkflowActionInput,
) {
  if (target.stage.workflowInstanceId !== input.workflowInstanceId) {
    fail("INVALID_RUNTIME_CONTEXT", "The stage does not belong to the workflow.");
  }
  if (target.stage.rowVersion !== input.expectedRuntimeVersion) {
    fail("STALE_RUNTIME_VERSION", "The workflow changed. Refresh and try again.");
  }
}

function policyTarget(target: WorkflowActionExecutionTarget) {
  return {
    action: target.action,
    stageStatus: target.stage.status,
    task: target.task,
    workflowStatus: target.stage.workflowStatus ?? "ACTIVE",
  };
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
  input: ExecuteWorkflowActionInput,
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
      assertRuntimeIdentityAndVersion(target, input);
      const parsedAction = workflowActionDefinitionSchema.safeParse(target.action);
      if (parsedAction.success) {
        target.action = { ...parsedAction.data, id: target.action.id };
      }
      enforceWorkflowActionPolicy(
        actor,
        target,
        evaluateWorkflowActionPolicy(actor, policyTarget(target), {
          conditionsPass: true,
          configurationValid: parsedAction.success,
          targetsValid: true,
        }),
      );
      const inputError = validateActionInputAgainstConfiguration(
        target.action,
        input.input,
        target.stage.stageKey,
      );
      if (inputError) fail("INVALID_ACTION_INPUT", inputError);
      const targetsValid = await configuredActionTargetsAreValid(
        transaction,
        target,
      );

      const conditionContext = await buildWorkflowActionConditionContext(
        transaction,
        target.stage,
      );
      const configuredTransitions = await loadSequentialTransitions(
        transaction,
        {
          actionKey: target.action.stableKey,
          sourceStageDefinitionId: target.stage.stageDefinitionId,
          workflowVersionId: target.stage.workflowVersionId,
        },
      );
      const conditions = evaluateWorkflowActionConditions(
        target.action,
        configuredTransitions.transitions,
        conditionContext,
      );
      enforceWorkflowActionPolicy(
        actor,
        target,
        evaluateWorkflowActionPolicy(actor, policyTarget(target), {
          conditionsPass: conditions.available,
          configurationValid: true,
          targetsValid,
        }),
      );
      if (target.action.actionType === "APPROVE_ADVANCE"
        || target.action.actionType === "REJECT") {
        const quorumSatisfied = await evaluateStageQuorum(transaction, {
          actorId: actor.id,
          stageDefinitionId: target.stage.stageDefinitionId,
          stageInstanceId: target.stage.stageInstanceId,
        });
        if (!quorumSatisfied) {
          fail("ACTION_UNAVAILABLE", "The required participation quorum is absent.");
        }
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
        const requirements = await loadRequiredTaskCompletions(
          transaction,
          target.stage.stageInstanceId,
        );
        await recordReviewThresholdEvaluations(transaction, {
          actorId: actor.id,
          requirements,
          stageInstanceId: target.stage.stageInstanceId,
          triggerTaskId: target.task.id,
        });
      }
      return executeConfiguredWorkflowActionOutcome(transaction, {
        actorId: actor.id,
        command: input,
        conditions,
        conditionContext,
        configuredTransitions,
        resultingRuntimeVersion,
        target,
      });
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
