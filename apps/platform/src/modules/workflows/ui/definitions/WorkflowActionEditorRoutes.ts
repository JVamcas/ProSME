import type { WorkflowActionDefinition } from "../../domain/actions/WorkflowActionDefinition";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";

export function workflowActionRoutes(
  transitions: readonly WorkflowTransitionDefinition[],
  stageKey: string,
  actionKey: string,
) {
  return transitions.filter(
    (transition) =>
      transition.sourceStageKey === stageKey &&
      transition.actionKey === actionKey,
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
          transition.sourceStageKey !== stageKey ||
          transition.actionKey !== previousActionKey,
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
        graph.stages.find((stage) => stage.stableKey === targetKey)?.name ??
        targetKey,
    )
    .join(", ");
}

// Carry legacy action-level wording into the route editor without losing edits.
export function workflowActionRoutesForEditor(
  transitions: readonly WorkflowTransitionDefinition[],
  stageKey: string,
  action: WorkflowActionDefinition,
) {
  const routes = workflowActionRoutes(transitions, stageKey, action.stableKey);
  if (
    action.actionType !== "REJECT" ||
    action.configuration.outcome.type !== "TERMINAL"
  ) {
    return routes;
  }
  const { label, description } =
    action.configuration.outcome.publicStatusMapping;
  return routes.map((route) => ({
    ...route,
    terminalApplicantStatus: route.terminalOutcome
      ? (route.terminalApplicantStatus ?? { label, description })
      : null,
  }));
}
