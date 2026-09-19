import { hasWorkflowCycle, reachableStages } from "./WorkflowGraphTraversal";
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

function validateTransitionTargets(
  graph: WorkflowGraphInput,
  initialCode?: string,
) {
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
    if (initialCode && transition.targetStageKey === initialCode) {
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

function isSequentialFormGraph(graph: WorkflowGraphInput) {
  return graph.stages.length > 0
    && graph.stages.every((stage) =>
      stage.tasks.length > 0
      && stage.tasks.every((task) => Boolean(task.formVersionId))
    );
}

function missingTransitionErrors(graph: WorkflowGraphInput) {
  const errors: WorkflowValidationIssue[] = [];
  graph.stages.forEach((stage, index) => {
    if (!graph.transitions.some(
      (transition) => transition.sourceStageKey === stage.stableKey,
    )) {
      errors.push(
        issue(
          "MISSING_TRANSITION",
          `${stage.name} needs an outgoing transition.`,
          `stages.${index}`,
        ),
      );
    }
  });
  return errors;
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

function validateLegacyGraph(
  graph: WorkflowGraphInput,
  initialCode: string | undefined,
) {
  const errors = validateTransitionTargets(graph, initialCode);
  if (!graph.transitions.some((transition) => transition.terminalOutcome)) {
    errors.push(
      issue(
        "TERMINAL_OUTCOME",
        "At least one terminal outcome is required.",
        "transitions",
      ),
    );
  }
  if (hasWorkflowCycle(graph)) {
    errors.push(
      issue(
        "WORKFLOW_CYCLE",
        "Workflow stages cannot contain a cycle.",
        "transitions",
      ),
    );
  }
  errors.push(...missingTransitionErrors(graph));
  errors.push(...unreachableErrors(graph, initialCode));
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
  const sequentialFormGraph = isSequentialFormGraph(graph);
  if (
    sequentialFormGraph
    && initial[0]
    && graph.stages.some(
      (stage) => stage.displayOrder < initial[0].displayOrder,
    )
  ) {
    errors.push(
      issue(
        "INITIAL_STAGE_SEQUENCE",
        "The initial stage must have the lowest sequence.",
        "stages",
      ),
    );
  }
  if (sequentialFormGraph) {
    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
  errors.push(...validateLegacyGraph(graph, initial[0]?.stableKey));
  return { valid: errors.length === 0, errors, warnings: [] };
}
