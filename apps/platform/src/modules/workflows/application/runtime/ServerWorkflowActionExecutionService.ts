import { recordReviewThresholdEvaluations } from "../../infrastructure/WorkflowReviewThresholdRepository";
import "server-only";
import { readApplicableWorkflowHolds } from "../../infrastructure/WorkflowHoldRepository";
import { assertWorkflowHoldAction } from "./WorkflowHoldPolicy";

import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import { IdempotencyConflictError } from "@/lib/resource-errors";
import {
  claimWorkflowActionRuntimeVersion,
  completeActionTask,
  findWorkflowActionExecution,
  lockWorkflowActionExecutionTarget,
  type WorkflowActionExecutionTarget,
  type WorkflowActionExecutionTransaction,
} from "../../infrastructure/WorkflowActionExecutionRepository";
import {
  withWorkflowActionExecutionTransaction,
  workflowActionExecutionDatabase,
} from "../../infrastructure/WorkflowActionExecutionConnection";
import { loadRequiredTaskCompletions } from "../../infrastructure/StageCompletionRepository";
import {
  readWorkflowActionReadiness,
  workflowActionCompletesTask,
  workflowActionReadinessReason,
} from "./ServerWorkflowActionReadinessService";
import { prepareWorkflowActionRouting } from "./ServerWorkflowActionRoutingService";
import {
  validateActionInputAgainstConfiguration,
  WorkflowActionExecutionError,
  type WorkflowActionExecutionResult,
} from "../../domain/actions/WorkflowActionExecution";
import { workflowActionDefinitionSchema } from "../../domain/actions/WorkflowActionSchemas";
import {
  executeConfiguredWorkflowActionOutcome,
  type ExecuteWorkflowActionInput,
} from "./ServerWorkflowActionOutcomeService";
import {
  evaluateWorkflowActionPolicy,
  requiredWorkflowActionPermission,
  type WorkflowActionPolicyResult,
} from "./WorkflowActionPolicy";
import {
  buildRequestInformationCreationRequest,
  createRequestInformation,
} from "./WorkflowRequestInformationHook";

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
    fail(
      "INVALID_RUNTIME_CONTEXT",
      "The stage does not belong to the workflow.",
    );
  }
  if (target.stage.rowVersion !== input.expectedRuntimeVersion) {
    fail(
      "STALE_RUNTIME_VERSION",
      "The workflow changed. Refresh and try again.",
    );
  }
}

function policyTarget(target: WorkflowActionExecutionTarget) {
  return {
    approvalEligibilityReady: target.stage.approvalEligibilityReady,
    activeDeferral: target.stage.activeDeferral,
    activeDeferralReady: target.stage.activeDeferralReady,
    activeHold: target.stage.activeHold,
    action: target.action,
    stageStatus: target.stage.status,
    task: target.task,
    workflowStatus: target.stage.workflowStatus ?? "ACTIVE",
  };
}

function isIdempotencyConstraint(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505",
  );
}

async function assertHoldScope(
  transaction: WorkflowActionExecutionTransaction,
  actor: AuthenticatedUser,
  target: WorkflowActionExecutionTarget,
  input: ExecuteWorkflowActionInput,
) {
  if (["PUT_ON_HOLD", "RESUME"].includes(target.action.actionType)) {
    requirePermission(
      actor,
      requiredWorkflowActionPermission(target.action, target.task),
    );
    if (target.task && !target.task.assignedToActor) {
      fail("INVALID_RUNTIME_CONTEXT", "This task is not assigned to you.");
    }
    const holds = await readApplicableWorkflowHolds(transaction, {
      workflowInstanceId: input.workflowInstanceId,
      stageInstanceId: input.sourceStageInstanceId,
      taskId: target.task?.id,
    });
    assertWorkflowHoldAction(actor, target, input.input, holds);
  }
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
      if (target.action.actionType === "REQUEST_INFORMATION") {
        requirePermission(
          actor,
          permissionCodes.fundingApplicationInformationRequestCreate,
        );
      }
      assertRuntimeIdentityAndVersion(target, input);
      await assertHoldScope(transaction, actor, target, input);
      const parsedAction = workflowActionDefinitionSchema.safeParse(
        target.action,
      );
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
      const {
        targetsValid,
        conditionContext,
        configuredTransitions,
        conditions,
        runtimeDestination,
      } = await prepareWorkflowActionRouting(transaction, target, input.input);
      enforceWorkflowActionPolicy(
        actor,
        target,
        evaluateWorkflowActionPolicy(actor, policyTarget(target), {
          conditionsPass: conditions.available,
          configurationValid: true,
          targetsValid,
        }),
      );
      const readiness = await readWorkflowActionReadiness(transaction, {
        actionTypes: [target.action.actionType],
        actorId: actor.id,
        recordQuorumEvaluation: true,
        stageDefinitionId: target.stage.stageDefinitionId,
        stageInstanceId: target.stage.stageInstanceId,
        taskId: target.task?.id,
      });
      const readinessReason = workflowActionReadinessReason(
        target.action.actionType,
        readiness,
      );
      if (readinessReason) fail("ACTION_UNAVAILABLE", readinessReason);
      const requestInformation =
        target.action.actionType === "REQUEST_INFORMATION" &&
        input.input.actionType === "REQUEST_INFORMATION"
          ? await createRequestInformation(
              transaction,
              buildRequestInformationCreationRequest({
                actorId: actor.id,
                command: { ...input, input: input.input },
                target: { ...target, action: target.action },
              }),
            )
          : null;
      const resultingRuntimeVersion = await claimWorkflowActionRuntimeVersion(
        transaction,
        target.stage.stageInstanceId,
        input.expectedRuntimeVersion,
        ["RESUME", "PUT_ON_HOLD"].includes(target.action.actionType)
          ? ["ACTIVE", "BLOCKED"]
          : ["ACTIVE"],
      );
      if (!resultingRuntimeVersion) {
        fail(
          "STALE_RUNTIME_VERSION",
          "The workflow changed. Refresh and try again.",
        );
      }
      if (
        target.task &&
        workflowActionCompletesTask(target.action.actionType)
      ) {
        const completed = await completeActionTask(transaction, {
          normalizedInput: input.input,
          task: target.task,
        });
        if (!completed) {
          fail(
            "ACTION_UNAVAILABLE",
            "The task changed before the action completed.",
          );
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
        runtimeDestination,
        requestInformation,
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
