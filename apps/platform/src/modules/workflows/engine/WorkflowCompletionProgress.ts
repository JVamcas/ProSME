import type { WorkflowDataContext } from "@/modules/conditions/engine/WorkflowDataResolver";
import type { ConditionTreeEvaluation } from "@/modules/conditions/engine/ConditionGroupEngine";
import { workflowConditionFieldPaths } from "@/modules/conditions/engine/WorkflowDataResolver";
import type { ConditionNode } from "@/modules/conditions/domain/ConditionGroup";
import { formatConditionGroupPreview } from "@/modules/conditions/engine/ConditionPreview";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import type {
  WorkflowCompletionRequirement,
  WorkflowCompletionRequirements,
} from "../api/WorkflowCompletionRequirementsTypes";
import type { RequiredTaskCompletion } from "../domain/runtime/StageCompletion";
import { requiredReviewCompletions } from "../domain/runtime/ReviewThreshold";
import { evaluateStageCondition } from "./StageCondition";

function readableKey(key: string) {
  return key
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .join(" · ");
}

function evaluationError(
  node: ConditionTreeEvaluation | null,
): { code: string } | null {
  if (!node) return null;
  if (node.kind === "CONDITION") return node.error;
  for (const child of node.children) {
    const error = evaluationError(child);
    if (error) return error;
  }
  return null;
}

function conditionRequirement(
  node: ConditionNode,
  context: WorkflowDataContext,
  hideValues: boolean,
): WorkflowCompletionRequirement {
  const group =
    node.kind === "GROUP"
      ? node
      : {
          id: node.id,
          kind: "GROUP" as const,
          combinator: "AND" as const,
          children: [node],
        };
  const result = evaluateStageCondition(group, context);
  const error = result.resolutionError ?? evaluationError(result.evaluation);
  const missing =
    error &&
    ["VALUE_NOT_FOUND", "STAGE_NOT_FOUND", "FIELD_NOT_FOUND"].includes(
      error.code,
    );
  const state = result.passed
    ? "MET"
    : missing
      ? "PENDING"
      : error
        ? "UNAVAILABLE"
        : "NOT_MET";
  const fields = workflowConditionFieldPaths(group).map((key) => ({
    key,
    label: readableKey(key),
    type: "TEXT" as const,
  }));
  const leaf = result.evaluation?.children[0];
  let detail = result.passed
    ? "Condition satisfied."
    : "Condition is not satisfied.";
  if (missing) detail = "Awaiting required data or a recorded decision.";
  else if (error)
    detail =
      "This condition could not be evaluated. Check its configuration and source data.";
  else if (
    !hideValues &&
    node.kind === "CONDITION" &&
    leaf?.kind === "CONDITION"
  ) {
    detail = `Current: ${JSON.stringify(leaf.resolvedOperands.left) ?? "unavailable"}`;
    if (node.rightOperand) {
      detail += ` · Compared with: ${JSON.stringify(leaf.resolvedOperands.right) ?? "unavailable"}`;
    }
  }
  if (hideValues)
    detail = "Review values remain hidden until their configured release.";
  return {
    id: node.id,
    label:
      node.kind === "GROUP"
        ? node.combinator === "AND"
          ? "All of these must be met"
          : "At least one of these must be met"
        : formatConditionGroupPreview(group, fields, conditionBuilderOperators),
    state,
    detail,
    ...(node.kind === "GROUP"
      ? {
          combinator: node.combinator,
          children: node.children.map((child) =>
            conditionRequirement(child, context, hideValues),
          ),
        }
      : {}),
  };
}

export function buildWorkflowCompletionProgress(input: {
  requirements: RequiredTaskCompletion[];
  tasks: { taskDefinitionId: string | null; name: string; taskType: string }[];
  exitCondition: Parameters<typeof evaluateStageCondition>[0];
  context: WorkflowDataContext;
  hideValues: boolean;
}): WorkflowCompletionRequirements {
  const requirements: WorkflowCompletionRequirement[] = input.requirements.map(
    (requirement) => {
      const required = requiredReviewCompletions(
        {
          mode: requirement.completionMode,
          count: requirement.requiredCompletionCount,
          percentage: requirement.completionPercentage,
          rounding: "CEIL",
        },
        requirement.denominator,
      );
      const task = input.tasks.find(
        (item) => item.taskDefinitionId === requirement.taskDefinitionId,
      );
      const met = requirement.completedCount >= required;
      const decision = task?.taskType === "STAGE_DECISION";
      return {
        id: requirement.taskDefinitionId,
        taskDefinitionId: requirement.taskDefinitionId,
        label: task?.name ?? readableKey(requirement.taskKey),
        state: met ? "MET" : "PENDING",
        detail:
          `${requirement.completedCount} of ${required} required completions recorded` +
          (requirement.completionMode === "PERCENT"
            ? ` (${requirement.completionPercentage}% of ${requirement.denominator} reviewers, rounded up)`
            : "") +
          (!met && decision ? " · Awaiting decision" : ""),
      };
    },
  );
  if (input.exitCondition) {
    requirements.push(
      conditionRequirement(
        input.exitCondition,
        input.context,
        input.hideValues,
      ),
    );
  }
  return {
    requirements,
    satisfied: requirements.every((item) => item.state === "MET"),
  };
}
