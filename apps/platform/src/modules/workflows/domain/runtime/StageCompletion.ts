import type { StageConditionEvaluation } from "../../engine/StageCondition";

export type RequiredTaskCompletion = {
  completedCount: number;
  requiredCompletionCount: number;
  taskDefinitionId: string;
  taskKey: string;
};

export type StageCompletionResult =
  | {
      kind: "completed";
      completedAt: Date;
      stageInstanceId: string;
    }
  | {
      kind: "already_completed";
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
