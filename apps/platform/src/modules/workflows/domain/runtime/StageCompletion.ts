import { requiredReviewCompletions } from "./ReviewThreshold";
import type { StageConditionEvaluation } from "../../engine/StageCondition";

export type RequiredTaskCompletion = {
  completedCount: number;
  completedTaskIds: string[];
  denominator: number;
  completionMode: "ALL" | "COUNT" | "PERCENT";
  completionPercentage: number | null;
  requiredCompletionCount: number;
  taskDefinitionId: string;
  taskKey: string;
};

export type StageCompletionResult =
  | {
      kind: "completed";
      referralReturn?: {
        targetStageDefinitionId: string;
        targetStageInstanceId: string;
        targetStageName: string;
      } | null;
      completedAt: Date;
      stageInstanceId: string;
    }
  | {
      kind: "already_completed";
      referralReturn?: {
        targetStageDefinitionId: string;
        targetStageInstanceId: string;
        targetStageName: string;
      } | null;
      completedAt: Date;
      stageInstanceId: string;
    }
  | {
      kind: "requirements_not_met";
      requirements: RequiredTaskCompletion[];
    }
  | {
      kind: "exit_condition_failed";
      evaluation: StageConditionEvaluation;
    }
  | {
      kind: "stage_not_active" | "stage_not_found";
    };

export function stageCompletionRequirementsAreMet(
  requirements: RequiredTaskCompletion[],
) {
  return requirements.every(
    (requirement) =>
      requirement.completedCount >=
      requiredReviewCompletions(
        {
          mode: requirement.completionMode,
          count: requirement.requiredCompletionCount,
          percentage: requirement.completionPercentage,
          rounding: "CEIL",
        },
        requirement.denominator,
      ),
  );
}
