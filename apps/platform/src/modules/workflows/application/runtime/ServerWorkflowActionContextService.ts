import "server-only";

import { buildStageCompletionValues } from "../../engine/StageCompletionContext";
import { normalizeStageConditionRecord } from "../../engine/StageCondition";
import { loadPriorStageContext } from "../../infrastructure/StageActivationRepository";
import {
  loadStageCompletionValues,
  type StageCompletionTarget,
  type StageCompletionTransaction,
} from "../../infrastructure/StageCompletionRepository";

export async function buildWorkflowActionConditionContext(
  executor: Pick<StageCompletionTransaction, "execute">,
  stage: StageCompletionTarget,
  concurrent = false,
) {
  const [priorStages, values] = concurrent
    ? await Promise.all([
        loadPriorStageContext(executor, stage.workflowInstanceId),
        loadStageCompletionValues(executor, stage.stageInstanceId),
      ])
    : [
        await loadPriorStageContext(executor, stage.workflowInstanceId),
        await loadStageCompletionValues(executor, stage.stageInstanceId),
      ];
  return {
    application: normalizeStageConditionRecord(stage.application),
    eligibility: normalizeStageConditionRecord(stage.eligibility),
    fundingCall: normalizeStageConditionRecord(stage.fundingCall),
    stages: [
      ...priorStages
        .filter((item) => item.stableKey !== stage.stageKey)
        .map((item) => ({
          stableKey: item.stableKey,
          values: normalizeStageConditionRecord(item.values),
        })),
      {
        stableKey: stage.stageKey,
        values: normalizeStageConditionRecord(
          buildStageCompletionValues(values),
        ),
      },
    ],
  };
}
