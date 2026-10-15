import type {
  WorkflowGraphInput,
  WorkflowValidationIssue,
} from "../domain/definitions/WorkflowTypes";
import { workflowScoringAggregations } from "../domain/definitions/WorkflowStageScoringDefinition";
import type { WorkflowConditionFormFields } from "./WorkflowConditionFields";

export function validateWorkflowScoring(
  graph: WorkflowGraphInput,
  forms: WorkflowConditionFormFields,
): WorkflowValidationIssue[] {
  const errors: WorkflowValidationIssue[] = [];
  graph.stages.forEach((stage, stageIndex) => {
    stage.tasks.forEach((task, taskIndex) => {
      if (
        task.config &&
        typeof task.config === "object" &&
        "formPurpose" in task.config &&
        task.config.formPurpose === "ELIGIBILITY_VERIFICATION"
      )
        return;
      if (!task.formBinding) return;
      const fields = forms.get(task.formBinding.formVersionId) ?? [];
      const aggregateCount = fields.filter(
        (field) => field.type === "SCORING_AGGREGATE",
      ).length;
      if (
        fields.some((field) => field.type === "SCORE") &&
        aggregateCount === 0
      ) {
        errors.push({
          code: "SCORING_AGGREGATE_REQUIRED",
          message: `${stage.name} — ${task.name}: the scoring form needs a scoring aggregate with a configured calculation rule before publication.`,
          path: `stages.${stageIndex}.tasks.${taskIndex}.formBinding.formVersionId`,
        });
      }
      if (aggregateCount > 1) {
        errors.push({
          code: "AMBIGUOUS_SCORING_AGGREGATE",
          message: `${stage.name} — ${task.name}: use one scoring aggregate so the stage score has a single review result to average.`,
          path: `stages.${stageIndex}.tasks.${taskIndex}.formBinding.formVersionId`,
        });
      }
    });
    stage.scoring?.forEach((scoring, scoringIndex) => {
      if (
        scoring.criteria.length > 0 &&
        !workflowScoringAggregations.includes(scoring.aggregation)
      ) {
        const task = stage.tasks.find(
          (candidate) => candidate.stableKey === scoring.taskStableKey,
        );
        errors.push({
          code: "SCORING_AGGREGATE_REQUIRED",
          message: `${stage.name}${task ? ` — ${task.name}` : ""}: configure a scoring aggregation rule before publication.`,
          path: `stages.${stageIndex}.scoring.${scoringIndex}.aggregation`,
        });
      }
    });
  });
  return errors;
}
