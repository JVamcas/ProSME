import type {
  WorkflowGraphInput,
  WorkflowValidationIssue,
} from "../definitions/WorkflowTypes";

function issue(
  code: string,
  message: string,
  path: string,
): WorkflowValidationIssue {
  return { code, message, path };
}

export function validateWorkflowTransitions(
  graph: WorkflowGraphInput,
): WorkflowValidationIssue[] {
  const stages = new Map(
    graph.stages.map((stage) => [stage.stableKey, stage]),
  );
  const errors: WorkflowValidationIssue[] = [];
  const priorities = new Set<string>();

  graph.transitions.forEach((transition, index) => {
    const path = `transitions.${index}`;
    const source = stages.get(transition.sourceStageKey);
    if (!source) {
      errors.push(
        issue(
          "INVALID_TRANSITION_SOURCE",
          "The transition source stage does not exist.",
          `${path}.sourceStageKey`,
        ),
      );
    } else if (
      !source.actions.some((action) => action.stableKey === transition.actionKey)
    ) {
      errors.push(
        issue(
          "INVALID_TRANSITION_ACTION",
          "The transition action is not configured on its source stage.",
          `${path}.actionKey`,
        ),
      );
    }
    if (
      transition.targetStageKey &&
      !stages.has(transition.targetStageKey)
    ) {
      errors.push(
        issue(
          "INVALID_TRANSITION_TARGET",
          "The transition target stage does not exist.",
          `${path}.targetStageKey`,
        ),
      );
    }
    const priorityKey = [
      transition.sourceStageKey,
      transition.actionKey,
      transition.priority,
    ].join(":");
    if (priorities.has(priorityKey)) {
      errors.push(
        issue(
          "DUPLICATE_TRANSITION_PRIORITY",
          "Priorities must be unique for transitions using the same action.",
          `${path}.priority`,
        ),
      );
    }
    priorities.add(priorityKey);
  });
  return errors;
}
