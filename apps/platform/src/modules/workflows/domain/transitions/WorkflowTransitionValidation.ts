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
    const action = source?.actions.find(
      (candidate) => candidate.stableKey === transition.actionKey,
    );
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
    transition.targetStageKeys.forEach((targetStageKey, targetIndex) => {
      const target = stages.get(targetStageKey);
      if (!target) {
        errors.push(
          issue(
            "INVALID_TRANSITION_TARGET",
            "The transition target stage does not exist.",
            `${path}.targetStageKeys.${targetIndex}`,
          ),
        );
      } else if (
        (action?.actionType === "RETURN" || action?.actionType === "REFER")
        && !target.repeatable
      ) {
        errors.push(
          issue(
            "NON_REPEATABLE_SEMANTIC_TARGET",
            "Return and referral targets must be repeatable stages.",
            `${path}.targetStageKeys.${targetIndex}`,
          ),
        );
      }
    });
    if (
      (action?.actionType === "RETURN" || action?.actionType === "REFER")
      && transition.targetStageKeys.length !== 1
    ) {
      errors.push(
        issue(
          "INVALID_SEMANTIC_TARGET_COUNT",
          "Return and referral transitions require exactly one target stage.",
          `${path}.targetStageKeys`,
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
  graph.stages.forEach((stage, stageIndex) => {
    if (stage.joinPredecessorStageKeys.length === 1) {
      errors.push(issue(
        "INVALID_JOIN_PREDECESSOR_COUNT",
        "A join requires at least two predecessor stages.",
        `stages.${stageIndex}.joinPredecessorStageKeys`,
      ));
    }
    stage.joinPredecessorStageKeys.forEach((predecessorKey, predecessorIndex) => {
      if (!stages.has(predecessorKey) || predecessorKey === stage.stableKey) {
        errors.push(issue(
          "INVALID_JOIN_PREDECESSOR",
          "Join predecessors must reference another stage in this workflow.",
          `stages.${stageIndex}.joinPredecessorStageKeys.${predecessorIndex}`,
        ));
      }
      const hasIncomingTransition = graph.transitions.some(
        (transition) =>
          transition.sourceStageKey === predecessorKey &&
          transition.targetStageKeys.includes(stage.stableKey),
      );
      if (!hasIncomingTransition) {
        errors.push(issue(
          "MISSING_JOIN_TRANSITION",
          "Every join predecessor must have a transition to the join stage.",
          `stages.${stageIndex}.joinPredecessorStageKeys.${predecessorIndex}`,
        ));
      }
    });
    if (new Set(stage.joinPredecessorStageKeys).size !== stage.joinPredecessorStageKeys.length) {
      errors.push(issue(
        "DUPLICATE_JOIN_PREDECESSOR",
        "Join predecessors must be unique.",
        `stages.${stageIndex}.joinPredecessorStageKeys`,
      ));
    }
  });
  return errors;
}
