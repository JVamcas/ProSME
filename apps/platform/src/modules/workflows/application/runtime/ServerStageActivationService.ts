import "server-only";

import type { StageConditionEvaluation } from "../../engine/StageCondition";
import {
  evaluateStageCondition,
  normalizeStageConditionRecord,
} from "../../engine/StageCondition";
import {
  findStageInstanceStatus,
  findStageIteration,
  loadPriorStageContext,
  loadStageActivationTasks,
  lockStageActivationTarget,
  persistStageActivation,
  type StageActivationTransaction,
  withStageActivationTransaction,
} from "../../infrastructure/StageActivationRepository";

export type ActivateStageInput = {
  actorId: string;
  correlationId: string;
  iterationNumber?: number;
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
      kind: "invalid_iteration" | "stage_conflict" | "stage_not_found";
    };

function validIteration(iterationNumber: number) {
  return Number.isSafeInteger(iterationNumber) && iterationNumber > 0;
}

export async function activateStageInTransaction(
  transaction: StageActivationTransaction,
  input: ActivateStageInput,
): Promise<StageActivationResult> {
  const iterationNumber = input.iterationNumber ?? 1;
  if (!validIteration(iterationNumber)) return { kind: "invalid_iteration" };

  const target = await lockStageActivationTarget(
    transaction,
    input.workflowInstanceId,
    input.stageDefinitionId,
  );
  if (!target) return { kind: "stage_not_found" };
  if (!target.repeatable && iterationNumber !== 1) {
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
  if (target.currentStageInstanceId) {
    const currentStatus = await findStageInstanceStatus(
      transaction,
      target.currentStageInstanceId,
    );
    if (currentStatus && currentStatus !== "COMPLETED"
      && currentStatus !== "CANCELLED") {
      return { kind: "stage_conflict" };
    }
  }

  const [priorStages, tasks] = await Promise.all([
    loadPriorStageContext(transaction, input.workflowInstanceId),
    loadStageActivationTasks(transaction, input.stageDefinitionId),
  ]);
  const evaluation = evaluateStageCondition(target.entryCondition, {
    application: normalizeStageConditionRecord(target.application),
    fundingCall: normalizeStageConditionRecord(target.fundingCall),
    stages: priorStages.map((stage) => ({
      stableKey: stage.stableKey,
      values: normalizeStageConditionRecord(stage.values),
    })),
  });
  if (!evaluation.passed) {
    return { evaluation, kind: "entry_condition_failed" };
  }

  const activated = await persistStageActivation(transaction, {
    activatedAt: new Date(),
    actorId: input.actorId,
    correlationId: input.correlationId,
    iterationNumber,
    referralContext: input.referralContext,
    returnContext: input.returnContext,
    target,
    tasks,
  });
  return {
    kind: "activated",
    stageInstanceId: activated.stage.id,
    taskIds: activated.tasks.map((task) => task.id),
  };
}

export function activateStage(input: ActivateStageInput) {
  return withStageActivationTransaction((transaction) =>
    activateStageInTransaction(transaction, input)
  );
}
