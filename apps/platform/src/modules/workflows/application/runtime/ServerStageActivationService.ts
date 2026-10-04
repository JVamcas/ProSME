import "server-only";

import type { StageConditionEvaluation } from "../../engine/StageCondition";
import {
  evaluateStageCondition,
  normalizeStageConditionRecord,
} from "../../engine/StageCondition";
import {
  findStageIteration,
  loadIncompleteJoinPredecessors,
  loadPriorStageContext,
  nextStageIterationNumber,
  loadStageReworkIteration,
  loadStageActivationTasks,
  lockStageActivationTarget,
  persistStageActivation,
  type StageActivationTransaction,
  withStageActivationTransaction,
} from "../../infrastructure/StageActivationRepository";
import { createStageActivationWorkflowRfi } from "../../infrastructure/WorkflowRfiRepository";
import { captureWorkflowTaskAssignmentNotification } from "./ServerWorkflowTaskAssignmentNotificationService";
import { captureWorkflowRfiCreatedNotification } from "./ServerWorkflowRfiNotificationService";

export type ActivateStageInput = {
  actorId: string;
  correlationId: string;
  iterationNumber?: number;
  iterationStrategy?: "FIRST" | "NEXT" | "REWORK";
  referralContext?: Record<string, unknown> | null;
  returnContext?: Record<string, unknown> | null;
  stageDefinitionId: string;
  workflowInstanceId: string;
};

export type StageActivationResult =
  | {
      kind: "activated";
      stageInstanceId: string;
      taskIds: string[];
    }
  | {
      kind: "already_active";
      stageInstanceId: string;
    }
  | {
      kind: "entry_condition_failed";
      evaluation: StageConditionEvaluation;
    }
  | {
      kind: "join_pending";
      incompletePredecessorStageKeys: string[];
    }
  | {
      kind: "invalid_iteration" | "stage_not_found";
    };

function validIteration(iterationNumber: number) {
  return Number.isSafeInteger(iterationNumber) && iterationNumber > 0;
}

export async function activateStageInTransaction(
  transaction: StageActivationTransaction,
  input: ActivateStageInput,
): Promise<StageActivationResult> {
  const target = await lockStageActivationTarget(
    transaction,
    input.workflowInstanceId,
    input.stageDefinitionId,
  );
  if (!target) return { kind: "stage_not_found" };
  const rework =
    input.iterationStrategy === "REWORK"
      ? await loadStageReworkIteration(
          transaction,
          input.workflowInstanceId,
          input.stageDefinitionId,
        )
      : null;
  if (rework?.activeStageInstanceId) {
    return {
      kind: "already_active",
      stageInstanceId: rework.activeStageInstanceId,
    };
  }
  const iterationNumber = rework
    ? rework.nextIterationNumber
    : input.iterationStrategy === "NEXT"
      ? await nextStageIterationNumber(
          transaction,
          input.workflowInstanceId,
          input.stageDefinitionId,
        )
      : (input.iterationNumber ?? 1);
  if (!validIteration(iterationNumber)) return { kind: "invalid_iteration" };
  // Explicit rework/referral creates a new working iteration; repeatable
  // governs ordinary graph traversal rather than these runtime handoffs.
  const controlActivation = Boolean(
    input.returnContext || input.referralContext,
  );
  if (!target.repeatable && iterationNumber !== 1 && !controlActivation) {
    return { kind: "invalid_iteration" };
  }

  const existing = await findStageIteration(
    transaction,
    input.workflowInstanceId,
    input.stageDefinitionId,
    iterationNumber,
  );
  if (existing) {
    return { kind: "already_active", stageInstanceId: existing.id };
  }
  const incompletePredecessorStageKeys = target.joinPredecessorStageKeys.length
    ? await loadIncompleteJoinPredecessors(
        transaction,
        input.workflowInstanceId,
        input.stageDefinitionId,
      )
    : [];
  if (incompletePredecessorStageKeys.length) {
    return { kind: "join_pending", incompletePredecessorStageKeys };
  }

  const [priorStages, tasks] = await Promise.all([
    loadPriorStageContext(transaction, input.workflowInstanceId),
    loadStageActivationTasks(transaction, input.stageDefinitionId),
  ]);
  const evaluation = evaluateStageCondition(target.entryCondition, {
    application: normalizeStageConditionRecord(target.application),
    eligibility: normalizeStageConditionRecord(target.eligibility ?? {}),
    fundingCall: normalizeStageConditionRecord(target.fundingCall),
    stages: priorStages.map((stage) => ({
      stableKey: stage.stableKey,
      values: normalizeStageConditionRecord(stage.values),
    })),
  });
  if (!evaluation.passed) {
    return { evaluation, kind: "entry_condition_failed" };
  }

  const activatedAt = new Date();
  const activated = await persistStageActivation(transaction, {
    activatedAt,
    actorId: input.actorId,
    correlationId: input.correlationId,
    iterationNumber,
    referralContext: input.referralContext,
    returnContext: input.returnContext,
    target,
    tasks,
  });
  const informationRequest = await createStageActivationWorkflowRfi(
    transaction,
    {
      actorId: input.actorId,
      correlationId: input.correlationId,
      stageDefinitionId: input.stageDefinitionId,
      stageInstanceId: activated.stage.id,
      workflowInstanceId: input.workflowInstanceId,
    },
  );
  if (informationRequest) {
    await captureWorkflowRfiCreatedNotification(
      transaction,
      informationRequest.requestInformationId,
    );
  }
  const taskNames = new Map(tasks.map((task) => [task.id, task.name]));
  await captureWorkflowTaskAssignmentNotification(transaction, {
    assignedAt: activatedAt,
    correlationId: input.correlationId,
    stageInstanceId: activated.stage.id,
    target,
    tasks: activated.tasks.map((task) => ({
      assignedUserId: task.assignedUserId,
      id: task.id,
      name: taskNames.get(task.workflowTaskDefinitionId)!,
    })),
  });
  return {
    kind: "activated",
    stageInstanceId: activated.stage.id,
    taskIds: activated.tasks.map((task) => task.id),
  };
}

export function activateStage(input: ActivateStageInput) {
  return withStageActivationTransaction((transaction) =>
    activateStageInTransaction(transaction, input),
  );
}
