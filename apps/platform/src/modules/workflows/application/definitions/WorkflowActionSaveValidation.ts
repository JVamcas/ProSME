import { RequestValidationError } from "@/lib/resource-errors";
import type { WorkflowActionSaveInput } from "../../api/WorkflowActionSaveSchema";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "../../domain/definitions/WorkflowTypes";

export function validateWorkflowActionSave(
  graph: WorkflowGraphInput,
  stage: WorkflowStageInput,
  input: WorkflowActionSaveInput,
) {
  const previous = stage.actions.find(
    (action) => action.stableKey === input.actionKey,
  );
  if (input.actionKey && !previous) {
    throw new RequestValidationError(
      "The action no longer exists in this stage.",
    );
  }
  if (input.actionKey && input.actionKey !== input.action.stableKey) {
    throw new RequestValidationError(
      "An existing action's stable key cannot change.",
    );
  }
  if (input.action.id && input.action.id !== previous?.id) {
    throw new RequestValidationError(
      "The action ID does not belong to this stage action.",
    );
  }
  const other = stage.actions.filter(
    (action) => action.stableKey !== input.actionKey,
  );
  if (other.some((action) => action.stableKey === input.action.stableKey)) {
    throw new RequestValidationError(
      "Action keys must be unique within the stage.",
    );
  }
  if (
    other.some((action) => action.displayOrder === input.action.displayOrder)
  ) {
    throw new RequestValidationError(
      "Action display orders must be unique within the stage.",
    );
  }
  const taskKeys = new Set(stage.tasks.map((task) => task.stableKey));
  if (input.taskStableKeys.some((key) => !taskKeys.has(key))) {
    throw new RequestValidationError(
      "Selected tasks must belong to this stage.",
    );
  }
  const stageKeys = new Set(graph.stages.map((item) => item.stableKey));
  const ownedRoutes = new Set(
    graph.transitions
      .filter(
        (route) =>
          route.sourceStageKey === stage.stableKey &&
          route.actionKey === input.actionKey,
      )
      .map((route) => route.id),
  );
  const ids = input.routes.flatMap((route) => (route.id ? [route.id] : []));
  const priorities = input.routes.map((route) => route.priority);
  if (
    new Set(ids).size !== ids.length ||
    new Set(priorities).size !== priorities.length
  ) {
    throw new RequestValidationError(
      "Routes must have unique IDs and priorities.",
    );
  }
  for (const route of input.routes) {
    if (
      route.sourceStageKey !== stage.stableKey ||
      route.actionKey !== input.action.stableKey
    ) {
      throw new RequestValidationError(
        "Routes must belong to the selected stage action.",
      );
    }
    if (route.id && !ownedRoutes.has(route.id)) {
      throw new RequestValidationError(
        "A route ID does not belong to this stage action.",
      );
    }
    if (route.targetStageKeys.some((key) => !stageKeys.has(key))) {
      throw new RequestValidationError(
        "Route targets must belong to this workflow version.",
      );
    }
  }
  return previous;
}
