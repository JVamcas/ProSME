import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";

export function workflowActionRoutes(
  transitions: readonly WorkflowTransitionDefinition[],
  stageKey: string,
  actionKey: string,
) {
  return transitions.filter(
    (transition) =>
      transition.sourceStageKey === stageKey
      && transition.actionKey === actionKey,
  );
}

export function replaceWorkflowActionRoutes(
  transitions: WorkflowGraphInput["transitions"],
  stageKey: string,
  previousActionKey: string | undefined,
  nextActionKey: string,
  routes: readonly WorkflowTransitionDefinition[],
): WorkflowGraphInput["transitions"] {
  const retained = previousActionKey
    ? transitions.filter(
        (transition) =>
          transition.sourceStageKey !== stageKey
          || transition.actionKey !== previousActionKey,
      )
    : transitions;

  return [
    ...retained,
    ...routes.map((route) => ({
      ...route,
      actionKey: nextActionKey,
      sourceStageKey: stageKey,
    })),
  ];
}

export function workflowRouteDestination(
  route: WorkflowTransitionDefinition,
  graph: WorkflowGraphInput,
) {
  if (route.terminalOutcome) {
    return `Outcome: ${route.terminalOutcome.replaceAll("_", " ").toLowerCase()}`;
  }

  return route.targetStageKeys
    .map(
      (targetKey) =>
        graph.stages.find((stage) => stage.stableKey === targetKey)?.name
        ?? targetKey,
    )
    .join(", ");
}
