import type { WorkflowGraphInput } from "./WorkflowTypes";

/** Drafts use stage policy; immutable historical action records stay readable. */
export function removeWorkflowWithdrawalActions(
  graph: WorkflowGraphInput,
): WorkflowGraphInput {
  const removedByStage = new Map(
    graph.stages.map((stage) => [
      stage.stableKey,
      new Set(
        stage.actions
          .filter((action) => action.actionType === "WITHDRAW")
          .map((action) => action.stableKey),
      ),
    ]),
  );
  return {
    stages: graph.stages.map((stage) => ({
      ...stage,
      allowApplicantWithdrawal: stage.allowApplicantWithdrawal ?? true,
      actions: stage.actions.filter(
        (action) => action.actionType !== "WITHDRAW",
      ),
      tasks: stage.tasks.map((task) => ({
        ...task,
        actionKeys: task.actionKeys.filter(
          (key) => !removedByStage.get(stage.stableKey)?.has(key),
        ),
      })),
    })),
    transitions: graph.transitions.filter(
      (transition) =>
        !removedByStage
          .get(transition.sourceStageKey)
          ?.has(transition.actionKey),
    ),
  };
}
