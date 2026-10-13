import type { WorkflowStageInput } from "../../domain/definitions/WorkflowTypes";
import { validateTaskConfiguration } from "../../WorkflowTaskRegistry";

// Earlier templates kept scoring in both task configuration and stage tables.
// Reconcile exact matches; never create two fields for the same criterion.
export function normalizeLegacyTaskScoring(stage: WorkflowStageInput) {
  const result = structuredClone(stage);
  result.scoring ??= [];
  for (const task of result.tasks) {
    const parsed = validateTaskConfiguration(task.config);
    if (!parsed.success || !parsed.data.criteria?.length) continue;
    let scoring = result.scoring.find(
      (item) => item.taskStableKey === task.stableKey,
    );
    if (!scoring) {
      scoring = {
        taskStableKey: task.stableKey,
        aggregation: "WEIGHTED_AVERAGE",
        criteria: [],
      };
      result.scoring.push(scoring);
    }
    for (const criterion of parsed.data.criteria) {
      const matches = scoring.criteria.filter(
        (item) =>
          item.stableKey === criterion.code ||
          item.criterion === criterion.label,
      );
      if (matches.length > 1)
        throw new Error(
          `${task.name}: ambiguous legacy scoring criterion ${criterion.label}.`,
        );
      const match = matches[0];
      if (match) {
        if (
          match.weight !== criterion.weight ||
          match.scaleMaximum !== criterion.maximumScore ||
          match.mandatoryComment !== criterion.commentRequired
        ) {
          throw new Error(
            `${task.name}: conflicting legacy scoring settings for ${criterion.label}.`,
          );
        }
        continue;
      }
      scoring.criteria.push({
        stableKey: criterion.code,
        criterion: criterion.label,
        description: "",
        weight: criterion.weight,
        scaleMinimum: 0,
        scaleMaximum: criterion.maximumScore,
        mandatoryComment: criterion.commentRequired,
      });
    }
  }
  return result;
}
