import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import { workflowConditionNodeFieldPaths } from "@/modules/conditions/engine/WorkflowDataResolver";
import type { EligibilityRuleSetBuilderView } from "../api/EligibilityRuleSetTransport";
import type { EligibilityEvaluationMode } from "../domain/EligibilityEvaluation";
import { eligibilityFieldsForExecutionMode } from "../domain/EligibilityFieldRegistry";

export function eligibilityTestFields(
  builder: EligibilityRuleSetBuilderView,
  mode: EligibilityEvaluationMode,
): ConditionFieldDefinition[] {
  const paths = new Set(builder.rules
    .filter((rule) => rule.executionMode === "BOTH" || rule.executionMode === mode)
    .flatMap((rule) => workflowConditionNodeFieldPaths(rule.condition)));
  const questions = new Map(builder.availableQuestions.map((question) => [
    `eligibility.${question.code}`,
    question,
  ]));

  return eligibilityFieldsForExecutionMode(builder.conditionFields, mode)
    .filter((field) => field.key.startsWith("eligibility.") && paths.has(field.key))
    .map((field) => {
      const question = questions.get(field.key);
      let label = field.label;
      if (question) {
        label = mode === "SELF_CHECK"
          ? question.applicantLabel
          : question.reviewerLabel;
      }
      return { key: field.key, label, type: field.type };
    });
}
