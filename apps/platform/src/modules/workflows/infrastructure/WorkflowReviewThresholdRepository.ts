import "server-only";

import { and, eq } from "drizzle-orm";

import { requiredReviewCompletions } from "../domain/runtime/ReviewThreshold";
import type { RequiredTaskCompletion } from "../domain/runtime/StageCompletion";
import type { StageCompletionTransaction } from "./StageCompletionRepository";
import { reviewThresholdEvaluations } from "./workflow-review.schema";

export async function recordReviewThresholdEvaluations(
  transaction: StageCompletionTransaction,
  input: {
    actorId: string;
    requirements: RequiredTaskCompletion[];
    stageInstanceId: string;
    triggerTaskId: string | null;
  },
) {
  if (!input.requirements.length) return;
  const prior = await transaction
    .select({ taskDefinitionId: reviewThresholdEvaluations.taskDefinitionId })
    .from(reviewThresholdEvaluations)
    .where(
      and(
        eq(reviewThresholdEvaluations.stageInstanceId, input.stageInstanceId),
        eq(reviewThresholdEvaluations.firstSatisfied, true),
      ),
    );
  const alreadySatisfied = new Set(prior.map((row) => row.taskDefinitionId));
  await transaction.insert(reviewThresholdEvaluations).values(
    input.requirements.map((requirement) => {
      const rule = {
        mode: requirement.completionMode,
        count: requirement.requiredCompletionCount,
        percentage: requirement.completionPercentage,
        rounding: "CEIL" as const,
      };
      const requiredCount = requiredReviewCompletions(
        rule,
        requirement.denominator,
      );
      return {
        stageInstanceId: input.stageInstanceId,
        taskDefinitionId: requirement.taskDefinitionId,
        rule,
        denominator: requirement.denominator,
        requiredCount,
        completedTaskIds: requirement.completedTaskIds,
        satisfied: requirement.completedCount >= requiredCount,
        firstSatisfied:
          requirement.completedCount >= requiredCount &&
          !alreadySatisfied.has(requirement.taskDefinitionId),
        triggerTaskId: input.triggerTaskId,
      };
    }),
  );
}
