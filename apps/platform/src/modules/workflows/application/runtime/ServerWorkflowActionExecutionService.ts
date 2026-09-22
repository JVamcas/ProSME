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
  recordWorkflowActionExecution,
  withWorkflowActionExecutionTransaction,
  workflowActionExecutionDatabase,
  type WorkflowActionExecutionTarget,
} from "../../infrastructure/WorkflowActionExecutionRepository";
import { configuredActionTargetsAreValid } from "../../infrastructure/WorkflowActionTargetRepository";
import { recordApprovalDecision } from "../../infrastructure/WorkflowDecisionRepository";
import {
  validateActionInputAgainstConfiguration,
  WorkflowActionExecutionError,
  type WorkflowActionExecutionRequest,
  type WorkflowActionExecutionResult,
} from "../../domain/actions/WorkflowActionExecution";
import { workflowActionDefinitionSchema } from "../../domain/actions/WorkflowActionSchemas";
import { loadSequentialTransitions } from "../../infrastructure/TransitionExecutionRepository";
import { executeSequentialTransitionInTransaction } from "./ServerSequentialTransitionService";
import { buildWorkflowActionConditionContext } from "./ServerWorkflowActionContextService";
import {
  evaluateWorkflowActionConditions,
  evaluateWorkflowActionPolicy,
  requiredWorkflowActionPermission,
  type WorkflowActionPolicyResult,
} from "./WorkflowActionPolicy";

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
  input: ExecuteInput,
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
          conditionSelection: {
            selectedTransitionId: conditions.selectedTransitionId,
            transitionEvaluations: conditions.transitionEvaluations,
          },
          conditionContext,
          correlationId: input.correlationId,
          sourceStageInstanceId: input.sourceStageInstanceId,
        }),
      );
      const executionId = crypto.randomUUID();
      const decisionId = target.action.actionType === "APPROVE_ADVANCE"
        ? crypto.randomUUID()
        : null;
      const executedAt = new Date().toISOString();
      const result: WorkflowActionExecutionResult = {
        actionExecutionId: executionId,
        actionKey: target.action.stableKey,
        actionType: target.action.actionType,
        decisionId,
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
          action: conditions.actionEvaluation,
          capturedAt: executedAt,
          transitions: conditions.transitionEvaluations,
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
      if (decisionId) {
        await recordApprovalDecision(transaction, {
          actionDefinitionId: target.action.id,
          actionExecutionId: executionId,
          actionKey: target.action.stableKey,
          actorId: actor.id,
          correlationId: input.correlationId,
          decidedAt: new Date(executedAt),
          decisionId,
          normalizedInput: input.input,
          sourceStageInstanceId: target.stage.stageInstanceId,
          taskId: target.task?.id ?? null,
          workflowInstanceId: target.stage.workflowInstanceId,
        });
      }
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
