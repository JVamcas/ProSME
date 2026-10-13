import type {
  ConditionGroup,
  ConditionNode,
} from "@/modules/conditions/domain/ConditionGroup";
import type { JsonValue, Operand } from "@/modules/conditions/domain/Operand";
import { evaluateConditionNode } from "@/modules/conditions/engine/ConditionGroupEngine";

export type FormRuleOutcome = "TRUE" | "FALSE" | "UNAVAILABLE" | "INVALID";

export function formConditionValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  )
    return value;
  if (Array.isArray(value)) return value.map(formConditionValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        formConditionValue(child),
      ]),
    );
  }
  return null;
}

function operandUnavailable(
  operand: Operand | undefined,
  values: Readonly<Record<string, unknown>>,
): boolean {
  if (!operand || operand.kind === "CONSTANT") return false;
  if (operand.kind === "COMPUTED") {
    return (
      operandUnavailable(operand.leftOperand, values) ||
      operandUnavailable(operand.rightOperand, values)
    );
  }
  const value = values[operand.key];
  return value === undefined || value === null || value === "";
}

function outcome(
  node: ConditionNode,
  values: Readonly<Record<string, unknown>>,
): FormRuleOutcome {
  if (node.kind === "GROUP") {
    if (!node.children.length) return "INVALID";
    const outcomes = node.children.map((child) => outcome(child, values));
    if (outcomes.includes("INVALID")) return "INVALID";
    if (node.combinator === "AND" && outcomes.includes("FALSE")) return "FALSE";
    if (node.combinator === "OR" && outcomes.includes("TRUE")) return "TRUE";
    if (outcomes.includes("UNAVAILABLE")) return "UNAVAILABLE";
    return node.combinator === "AND" ? "TRUE" : "FALSE";
  }
  const unary =
    node.operator === "IS_EMPTY" || node.operator === "IS_NOT_EMPTY";
  if (
    !unary &&
    (operandUnavailable(node.leftOperand, values) ||
      operandUnavailable(node.rightOperand, values))
  )
    return "UNAVAILABLE";
  const supplied = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      formConditionValue(value),
    ]),
  );
  if (
    unary &&
    node.leftOperand.kind === "FIELD" &&
    !Object.hasOwn(supplied, node.leftOperand.key)
  ) {
    supplied[node.leftOperand.key] = null;
  }
  const evaluated = evaluateConditionNode(node, supplied);
  if (evaluated.kind === "CONDITION" && evaluated.error) return "INVALID";
  return evaluated.passed ? "TRUE" : "FALSE";
}

export function evaluateFormRule(
  condition: ConditionGroup | null | undefined,
  values: Readonly<Record<string, unknown>>,
): FormRuleOutcome {
  return condition ? outcome(condition, values) : "TRUE";
}
