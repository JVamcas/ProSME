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
  const actionKeys = new Set(
    graph.stages.flatMap((stage) => stage.actions.map((action) => action.stableKey)),
  );
  return graph.stages.flatMap((stage, stageIndex) =>
    stage.actions.flatMap((action, actionIndex) => {
      const path = `stages.${stageIndex}.actions.${actionIndex}.configuration`;
      const invalidTargets = targetStageKeys(action).filter(
        (target) => !stageKeys.has(target),
      );
      const errors = invalidTargets.map((target) => ({
        code: "INVALID_ACTION_STAGE_TARGET",
        message: `${action.label} references unknown stage ${target}.`,
        path,
      }));
      if (action.actionType !== "REJECT") return errors;
      const transitions = graph.transitions.filter(
        (transition) => transition.sourceStageKey === stage.stableKey
          && transition.actionKey === action.stableKey,
      );
      const hasTerminalTarget = transitions.some(
        (transition) => Boolean(transition.terminalOutcome),
      );
      const hasStageTarget = transitions.some(
        (transition) => Boolean(transition.targetStageKey),
      );
      if (hasTerminalTarget === hasStageTarget
        || (action.configuration.outcome.type === "TERMINAL") !== hasTerminalTarget) {
        errors.push({
          code: "INVALID_REJECTION_OUTCOME",
          message: `${action.label} must use only transitions matching its configured rejection outcome.`,
          path: `${path}.outcome`,
        });
      }
      const reversal = action.configuration.reversibleActionKey;
      if (reversal && !actionKeys.has(reversal)) {
        errors.push({
          code: "INVALID_REJECTION_REVERSAL",
          message: `${action.label} references unknown reversal action ${reversal}.`,
          path: `${path}.reversibleActionKey`,
        });
      }
      return errors;
    }),
  );
}
