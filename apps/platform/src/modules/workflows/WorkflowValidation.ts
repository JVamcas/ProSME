import { reachableStages, stagesInCycles } from "./WorkflowGraphTraversal";
import { validateWorkflowStage } from "./WorkflowStageValidation";
import { validateWorkflowActionTargets } from "./domain/actions/WorkflowActionValidation";
import { validateWorkflowTransitions } from "./domain/transitions/WorkflowTransitionValidation";
import type {
  WorkflowGraphInput,
  WorkflowValidation,
  WorkflowValidationIssue,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";

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

function validateTransitionTargets(graph: WorkflowGraphInput) {
  const errors: WorkflowValidationIssue[] = [];
  graph.transitions.forEach((transition, index) => {
    const path = `transitions.${index}`;
    if (
      Boolean(transition.targetStageKey) ===
      Boolean(transition.terminalOutcome)
    ) {
      errors.push(
        issue(
          "INVALID_TRANSITION_TARGET",
          "A transition needs one stage target or terminal outcome.",
          path,
        ),
      );
    }
  });
  return errors;
}

function terminalDecisionErrors(graph: WorkflowGraphInput) {
  const errors: WorkflowValidationIssue[] = [];
  graph.stages.forEach((stage, index) => {
    if (!graph.transitions.some(
      (transition) => transition.sourceStageKey === stage.stableKey,
    )) {
      errors.push(
        issue(
          "TERMINAL_STAGE_WITHOUT_DECISION",
          `${stage.name} is terminal but has no terminal decision.`,
          `stages.${index}`,
        ),
      );
    }
  });
  return errors;
}

function repeatableReferenceErrors(graph: WorkflowGraphInput) {
  const cyclicStageKeys = stagesInCycles(graph);
  return graph.stages.flatMap((stage, index) =>
    cyclicStageKeys.has(stage.stableKey) && !stage.repeatable
      ? [
          issue(
            "INVALID_REPEATABLE_REFERENCE",
            `${stage.name} participates in a loop but is not repeatable.`,
            `stages.${index}.repeatable`,
          ),
        ]
      : [],
  );
}

function unreachableErrors(
  graph: WorkflowGraphInput,
  initialCode: string | undefined,
) {
  if (!initialCode) return [];
  const reachable = reachableStages(graph, initialCode);
  return graph.stages.flatMap((stage, index) =>
    reachable.has(stage.stableKey)
      ? []
      : [
          issue(
            "UNREACHABLE_STAGE",
            `${stage.name} is unreachable.`,
            `stages.${index}`,
          ),
        ],
  );
}

function validateDirectedGraph(
  graph: WorkflowGraphInput,
  initialCode: string | undefined,
) {
  const errors = validateTransitionTargets(graph);
  if (!graph.transitions.some((transition) => transition.terminalOutcome)) {
    errors.push(
      issue(
        "TERMINAL_OUTCOME",
        "At least one terminal outcome is required.",
        "transitions",
      ),
    );
  }
  errors.push(...terminalDecisionErrors(graph));
  errors.push(...unreachableErrors(graph, initialCode));
  errors.push(...repeatableReferenceErrors(graph));
  return errors;
}

export function validateWorkflowGraph(
  graph: WorkflowGraphInput,
): WorkflowValidation {
  const errors = graph.stages.flatMap(validateWorkflowStage);
  errors.push(...validateWorkflowActionTargets(graph));
  errors.push(...validateWorkflowTransitions(graph));
  if (graph.stages.length === 0) {
    errors.push(
      issue("MISSING_STAGE", "At least one enabled stage is required.", "stages"),
    );
  }
  if (graph.stages.length > 0 && !graph.stages.some((stage) => stage.enabled)) {
    errors.push(
      issue("MISSING_ENABLED_STAGE", "At least one stage must be enabled.", "stages"),
    );
  }
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
    duplicates(graph.stages.map((stage) => stage.stableKey)),
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
    duplicates(graph.stages.map((stage) => stage.displayOrder)),
  )) {
    errors.push(
      issue(
        "DUPLICATE_STAGE_SEQUENCE",
        `Stage sequence ${sequence} is duplicated.`,
        "stages",
      ),
    );
  }
  errors.push(...validateDirectedGraph(graph, initial[0]?.stableKey));
  return { valid: errors.length === 0, errors, warnings: [] };
}
