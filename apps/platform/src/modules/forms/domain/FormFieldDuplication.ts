import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type {
  DirectOperand,
  Operand,
} from "@/modules/conditions/domain/Operand";
import { generateWorkflowStableKey } from "@/modules/workflows/domain/WorkflowStableKey";
import type { FormField } from "../FormTypes";

function remapDirectOperand(
  operand: DirectOperand,
  oldKey: string,
  newKey: string,
): DirectOperand {
  return operand.kind === "FIELD" && operand.key === oldKey
    ? { ...operand, key: newKey }
    : operand;
}

function remapOperand(
  operand: Operand,
  oldKey: string,
  newKey: string,
): Operand {
  if (operand.kind !== "COMPUTED")
    return remapDirectOperand(operand, oldKey, newKey);
  return {
    ...operand,
    leftOperand: remapDirectOperand(operand.leftOperand, oldKey, newKey),
    rightOperand: remapDirectOperand(operand.rightOperand, oldKey, newKey),
  };
}

function remapCondition(
  group: ConditionGroup,
  oldKey: string,
  newKey: string,
): ConditionGroup {
  return {
    ...group,
    children: group.children.map((node) => {
      if (node.kind === "GROUP") return remapCondition(node, oldKey, newKey);
      return {
        ...node,
        leftOperand: remapOperand(node.leftOperand, oldKey, newKey),
        ...(node.rightOperand
          ? { rightOperand: remapOperand(node.rightOperand, oldKey, newKey) }
          : {}),
      };
    }),
  };
}

export function createDuplicatedFormField(source: FormField): FormField {
  const duplicate = structuredClone(source);
  duplicate.id = crypto.randomUUID();
  duplicate.key = generateWorkflowStableKey();
  if (duplicate.workflowDocument)
    duplicate.workflowDocument.stableKey = duplicate.key;
  if (duplicate.visibilityCondition) {
    duplicate.visibilityCondition = remapCondition(
      duplicate.visibilityCondition,
      source.key,
      duplicate.key,
    );
  }
  for (const rule of [
    "validationCondition",
    "editableCondition",
    "requiredCondition",
  ] as const) {
    const condition = duplicate.rules?.[rule];
    if (condition && duplicate.rules) {
      duplicate.rules[rule] = remapCondition(
        condition,
        source.key,
        duplicate.key,
      );
    }
  }
  return duplicate;
}
