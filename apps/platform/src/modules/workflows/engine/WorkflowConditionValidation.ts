import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type {
  WorkflowGraphInput,
  WorkflowValidationIssue,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  workflowConditionFields,
  type WorkflowConditionFormFields,
} from "./WorkflowConditionFields";

function issuePath(base: string, path: readonly number[]) {
  return path.reduce(
    (current, childIndex) => `${current}.children.${childIndex}`,
    base,
  );
}

function validateCondition(
  condition: ConditionGroup | null,
  fields: ReturnType<typeof workflowConditionFields>,
  path: string,
): WorkflowValidationIssue[] {
  if (!condition) return [];
  return validateConditionGroup(
    condition,
    fields,
    conditionBuilderOperators,
  ).issues.map((conditionIssue) => ({
    code: "INVALID_WORKFLOW_CONDITION",
    message: conditionIssue.message,
    path: issuePath(path, conditionIssue.path),
  }));
}

export function validateWorkflowConditions(
  graph: WorkflowGraphInput,
  forms: WorkflowConditionFormFields,
): WorkflowValidationIssue[] {
  const errors: WorkflowValidationIssue[] = [];
  graph.stages.forEach((stage, stageIndex) => {
    errors.push(...validateCondition(
      stage.entryCondition,
      workflowConditionFields(graph, forms, stage, false),
      `stages.${stageIndex}.entryCondition`,
    ));
    errors.push(...validateCondition(
      stage.exitCondition,
      workflowConditionFields(graph, forms, stage, true),
      `stages.${stageIndex}.exitCondition`,
    ));
    stage.actions.forEach((action, actionIndex) => {
      errors.push(...validateCondition(
        action.condition ?? null,
        workflowConditionFields(graph, forms, stage, true),
        `stages.${stageIndex}.actions.${actionIndex}.condition`,
      ));
    });
  });
  const stages = new Map(
    graph.stages.map((stage) => [stage.stableKey, stage]),
  );
  graph.transitions.forEach((transition, transitionIndex) => {
    const source = stages.get(transition.sourceStageKey);
    if (!source) return;
    errors.push(...validateCondition(
      transition.condition,
      workflowConditionFields(graph, forms, source, true),
      `transitions.${transitionIndex}.condition`,
    ));
  });
  return errors;
}
