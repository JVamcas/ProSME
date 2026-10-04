import type { WorkflowGraphInput } from "../definitions/WorkflowTypes";

export function removeWorkflowAction(
  graph: WorkflowGraphInput,
  stageKey: string,
  actionKey: string,
): WorkflowGraphInput {
  return {
    stages: graph.stages.map((stage) =>
      stage.stableKey === stageKey
        ? {
            ...stage,
            actions: stage.actions
              .filter((action) => action.stableKey !== actionKey)
              .map((action, index) => ({
                ...action,
                displayOrder: index + 1,
              })),
            tasks: stage.tasks.map((task) => ({
              ...task,
              actionKeys: task.actionKeys.filter((key) => key !== actionKey),
            })),
          }
        : stage,
    ),
    transitions: graph.transitions.filter(
      (transition) =>
        transition.sourceStageKey !== stageKey ||
        transition.actionKey !== actionKey,
    ),
  };
}
