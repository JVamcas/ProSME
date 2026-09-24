import "server-only";

import type { StageCompletionResult } from "../../domain/runtime/StageCompletion";
import {
  evaluateStageCondition,
  normalizeStageConditionRecord,
} from "../../engine/StageCondition";
import { buildStageCompletionValues } from "../../engine/StageCompletionContext";
import { loadPriorStageContext } from "../../infrastructure/StageActivationRepository";
import {
  loadRequiredTaskCompletions,
  loadStageCompletionValues,
  lockStageCompletionTarget,
  persistStageCompletion,
  type StageCompletionTransaction,
} from "../../infrastructure/StageCompletionRepository";

export type CompleteStageInput = {
  actorId: string;
  correlationId: string;
  stageInstanceId: string;
};

function requirementsAreMet(
  requirements: Awaited<ReturnType<typeof loadRequiredTaskCompletions>>,
) {
  return requirements.every(
    (requirement) =>
      requirement.completedCount >= requirement.requiredCompletionCount,
  );
}

export async function completeStageInTransaction(
  transaction: StageCompletionTransaction,
  input: CompleteStageInput,
): Promise<StageCompletionResult> {
  const target = await lockStageCompletionTarget(
    transaction,
    input.stageInstanceId,
  );
  if (!target) return { kind: "stage_not_found" };
  if (target.status === "COMPLETED" && target.completedAt) {
    return {
      completedAt: target.completedAt,
      kind: "already_completed",
      stageInstanceId: target.stageInstanceId,
    };
  }
  if (target.status !== "ACTIVE") return { kind: "stage_not_active" };

  // These reads share one PostgreSQL transaction connection and must be queued.
  const priorStages = await loadPriorStageContext(
    transaction,
    target.workflowInstanceId,
  );
  const requirements = await loadRequiredTaskCompletions(
    transaction,
    target.stageInstanceId,
  );
  const valueRows = await loadStageCompletionValues(
    transaction,
    target.stageInstanceId,
  );
  const currentStageValues = buildStageCompletionValues(valueRows);
  const evaluation = evaluateStageCondition(target.exitCondition, {
    application: normalizeStageConditionRecord(target.application),
    eligibility: normalizeStageConditionRecord(target.eligibility ?? {}),
    fundingCall: normalizeStageConditionRecord(target.fundingCall),
    stages: [
      ...priorStages
        .filter((stage) => stage.stableKey !== target.stageKey)
        .map((stage) => ({
          stableKey: stage.stableKey,
          values: normalizeStageConditionRecord(stage.values),
        })),
      {
        stableKey: target.stageKey,
        values: normalizeStageConditionRecord(currentStageValues),
      },
    ],
  });
  if (!evaluation.passed) {
    return { evaluation, kind: "exit_condition_failed" };
  }
  if (!requirementsAreMet(requirements)) {
    return { kind: "requirements_not_met", requirements };
  }

  const completedAt = new Date();
  const completed = await persistStageCompletion(transaction, {
    actorId: input.actorId,
    completedAt,
    correlationId: input.correlationId,
    requirements,
    target,
  });
  return completed
    ? { completedAt, kind: "completed", stageInstanceId: target.stageInstanceId }
    : { kind: "stage_not_active" };
}
