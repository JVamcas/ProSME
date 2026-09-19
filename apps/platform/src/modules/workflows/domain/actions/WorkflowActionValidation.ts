import type {
  WorkflowGraphInput,
  WorkflowValidationIssue,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";

function targetStageKeys(
  action: WorkflowGraphInput["stages"][number]["actions"][number],
) {
  switch (action.actionType) {
    case "WITHDRAW":
      return action.configuration.allowedStageKeys;
    default:
      return [];
  }
}

export function validateWorkflowActionTargets(
  graph: WorkflowGraphInput,
): WorkflowValidationIssue[] {
  const stageKeys = new Set(graph.stages.map((stage) => stage.stableKey));
  return graph.stages.flatMap((stage, stageIndex) =>
    stage.actions.flatMap((action, actionIndex) => {
      const invalidTargets = targetStageKeys(action).filter(
        (target) => !stageKeys.has(target),
      );
      return invalidTargets.map((target) => ({
        code: "INVALID_ACTION_STAGE_TARGET",
        message: `${action.label} references unknown stage ${target}.`,
        path: `stages.${stageIndex}.actions.${actionIndex}.configuration`,
      }));
    }),
  );
}
