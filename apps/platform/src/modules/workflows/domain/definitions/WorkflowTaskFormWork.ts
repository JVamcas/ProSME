import type { WorkflowStageInput, WorkflowTaskInput } from "./WorkflowTypes";

export function taskUsesFormSections(config: unknown): boolean {
  return Boolean(
    config &&
    typeof config === "object" &&
    "workFormVersion" in config &&
    config.workFormVersion === 1,
  );
}

export function taskHasLegacyWork(
  stage: WorkflowStageInput,
  task: WorkflowTaskInput,
) {
  return (
    stage.checklistItems.some(
      (item) => item.taskStableKey === task.stableKey,
    ) ||
    (stage.commentFields ?? []).some(
      (item) => item.taskStableKey === task.stableKey,
    ) ||
    stage.documentRequirements.some(
      (item) => item.taskStableKey === task.stableKey,
    ) ||
    (stage.scoring ?? []).some(
      (item) => item.taskStableKey === task.stableKey && item.criteria.length,
    )
  );
}
