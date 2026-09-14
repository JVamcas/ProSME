import { hasWorkflowCycle, reachableStages } from "./WorkflowGraphTraversal";
import { validateWorkflowStage } from "./WorkflowStageValidation";
import type {
  WorkflowGraphInput,
  WorkflowValidation,
  WorkflowValidationIssue,
} from "./WorkflowTypes";

function issue(
  code: string,
  message: string,
  path: string,
): WorkflowValidationIssue {
  return { code, message, path };
}

function duplicates(values: (string | number)[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function validateTransitions(graph: WorkflowGraphInput, initialCode?: string) {
  const errors: WorkflowValidationIssue[] = [];
  const stageCodes = new Set(graph.stages.map((stage) => stage.code));
  graph.transitions.forEach((transition, index) => {
    const path = `transitions.${index}`;
    if (
      !stageCodes.has(transition.fromStageCode) ||
      (transition.toStageCode && !stageCodes.has(transition.toStageCode))
    ) {
      errors.push(
        issue(
          "INVALID_TRANSITION_STAGE",
          "Transition stages must belong to this version.",
          path,
        ),
      );
    }
    if (
      Boolean(transition.toStageCode) === Boolean(transition.terminalOutcome)
    ) {
      errors.push(
        issue(
          "INVALID_TRANSITION_TARGET",
          "A transition needs one stage target or terminal outcome.",
          path,
        ),
      );
    }
    if (initialCode && transition.toStageCode === initialCode) {
      errors.push(
        issue(
          "INITIAL_STAGE_TARGET",
          "Transitions cannot return to the initial stage.",
          path,
        ),
      );
    }
  });
  return errors;
}

export function validateWorkflowGraph(
  graph: WorkflowGraphInput,
): WorkflowValidation {
  const errors = graph.stages.flatMap(validateWorkflowStage);
  const initial = graph.stages.filter((stage) => stage.initial);
  if (initial.length !== 1)
    errors.push(
      issue(
        "INITIAL_STAGE",
        "Exactly one initial stage is required.",
        "stages",
      ),
    );
  for (const code of new Set(
    duplicates(graph.stages.map((stage) => stage.code)),
  )) {
    errors.push(
      issue(
        "DUPLICATE_STAGE_CODE",
        `Stage code ${code} is duplicated.`,
        "stages",
      ),
    );
  }
  for (const sequence of new Set(
    duplicates(graph.stages.map((stage) => stage.sequence)),
  )) {
    errors.push(
      issue(
        "DUPLICATE_STAGE_SEQUENCE",
        `Stage sequence ${sequence} is duplicated.`,
        "stages",
      ),
    );
  }
  errors.push(...validateTransitions(graph, initial[0]?.code));
  if (!graph.transitions.some((transition) => transition.terminalOutcome)) {
    errors.push(
      issue(
        "TERMINAL_OUTCOME",
        "At least one terminal outcome is required.",
        "transitions",
      ),
    );
  }
  if (hasWorkflowCycle(graph))
    errors.push(
      issue(
        "WORKFLOW_CYCLE",
        "Workflow stages cannot contain a cycle.",
        "transitions",
      ),
    );
  graph.stages.forEach((stage, index) => {
    if (
      !graph.transitions.some(
        (transition) => transition.fromStageCode === stage.code,
      )
    ) {
      errors.push(
        issue(
          "MISSING_TRANSITION",
          `${stage.name} needs an outgoing transition.`,
          `stages.${index}`,
        ),
      );
    }
  });
  if (initial[0]) {
    const reachable = reachableStages(graph, initial[0].code);
    graph.stages.forEach((stage, index) => {
      if (!reachable.has(stage.code))
        errors.push(
          issue(
            "UNREACHABLE_STAGE",
            `${stage.name} is unreachable.`,
            `stages.${index}`,
          ),
        );
    });
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}
