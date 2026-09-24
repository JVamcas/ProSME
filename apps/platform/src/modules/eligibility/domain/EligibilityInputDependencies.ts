import type { ConditionGroup, ConditionNode } from "@/modules/conditions/domain/ConditionGroup";
import type { Operand } from "@/modules/conditions/domain/Operand";

function operandReferencesPath(
  operand: Operand | undefined,
  path: string,
): boolean {
  if (!operand) return false;
  if (operand.kind === "FIELD") return operand.key === path;
  if (operand.kind === "CONSTANT") return false;
  return operandReferencesPath(operand.leftOperand, path)
    || operandReferencesPath(operand.rightOperand, path);
}

function nodeReferencesPath(node: ConditionNode, path: string): boolean {
  if (node.kind === "GROUP") {
    return node.children.some((child) => nodeReferencesPath(child, path));
  }
  return operandReferencesPath(node.leftOperand, path)
    || operandReferencesPath(node.rightOperand, path);
}

export function conditionNodeReferencesEligibilityInput(
  node: ConditionNode,
  stableKey: string,
) {
  return nodeReferencesPath(node, `eligibility.${stableKey}`);
}

export function conditionGroupReferencesEligibilityInput(
  group: ConditionGroup,
  stableKey: string,
) {
  return conditionNodeReferencesEligibilityInput(group, stableKey);
}
