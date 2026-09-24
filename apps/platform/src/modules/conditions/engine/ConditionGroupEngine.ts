import type {
  ConditionGroup,
  ConditionNode,
} from "../domain/ConditionGroup";
import type { Operator } from "../domain/Operator";
import {
  evaluateCondition,
  type ConditionEvaluationError,
  type ResolvedOperands,
} from "./ConditionEngine";
import type { FieldValues } from "./OperandResolver";

export type ConditionNodeEvaluation = {
  id: string;
  kind: "CONDITION";
  passed: boolean;
  resolvedOperands: ResolvedOperands;
  operator: Operator;
  error: ConditionEvaluationError | null;
};

export type ConditionGroupEvaluation = {
  id: string;
  kind: "GROUP";
  combinator: ConditionGroup["combinator"];
  passed: boolean;
  children: ConditionTreeEvaluation[];
};

export type ConditionTreeEvaluation =
  | ConditionNodeEvaluation
  | ConditionGroupEvaluation;

export function evaluateConditionNode(
  node: ConditionNode,
  fieldValues: FieldValues,
): ConditionTreeEvaluation {
  if (node.kind === "GROUP") {
    return evaluateConditionGroup(node, fieldValues);
  }

  return {
    id: node.id,
    kind: node.kind,
    ...evaluateCondition(node, fieldValues),
  };
}

export function evaluateConditionGroup(
  group: ConditionGroup,
  fieldValues: FieldValues,
): ConditionGroupEvaluation {
  const children = group.children.map((child) =>
    evaluateConditionNode(child, fieldValues),
  );
  const passed = group.combinator === "AND"
    ? children.every((child) => child.passed)
    : children.some((child) => child.passed);

  return {
    id: group.id,
    kind: group.kind,
    combinator: group.combinator,
    passed,
    children,
  };
}
