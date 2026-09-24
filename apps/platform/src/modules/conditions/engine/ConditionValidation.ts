import type { Condition } from "../domain/Condition";
import type {
  ConditionFieldDefinition,
  ConditionFieldType,
  ConditionOperatorDefinition,
} from "../domain/ConditionConfiguration";
import type { ConditionGroup, ConditionNode } from "../domain/ConditionGroup";
import type { DirectOperand, JsonValue, Operand } from "../domain/Operand";
import {
  expectedValueDescription,
  rangeIsOutOfOrder,
  valueMatchesFieldType,
} from "./ConditionValueValidation";

export type ConditionValidationIssueCode =
  | "DUPLICATE_NODE_ID"
  | "EMPTY_GROUP"
  | "FIELD_NOT_FOUND"
  | "OPERATOR_NOT_FOUND"
  | "OPERATOR_NOT_COMPATIBLE"
  | "COMPUTED_OPERAND_TYPE"
  | "VALUE_REQUIRED"
  | "VALUE_NOT_ALLOWED"
  | "VALUE_TYPE"
  | "VALUE_LIST_EMPTY"
  | "VALUE_RANGE"
  | "VALUE_RANGE_ORDER";

export type ConditionValidationIssue = {
  code: ConditionValidationIssueCode;
  message: string;
  nodeId: string;
  path: readonly number[];
};

export type ConditionValidationResult = {
  issues: ConditionValidationIssue[];
  valid: boolean;
};

type ValidationContext = {
  fields: ReadonlyMap<string, ConditionFieldDefinition>;
  issues: ConditionValidationIssue[];
  operators: ReadonlyMap<string, ConditionOperatorDefinition>;
  seenIds: Set<string>;
};

function addIssue(
  context: ValidationContext,
  nodeId: string,
  path: readonly number[],
  code: ConditionValidationIssueCode,
  message: string,
) {
  context.issues.push({ code, message, nodeId, path });
}

function primitiveType(value: JsonValue): ConditionFieldType | undefined {
  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "number" && Number.isFinite(value)) return "NUMBER";
  if (typeof value === "string") return "TEXT";
  return undefined;
}

function validateNodeId(
  node: ConditionNode,
  path: readonly number[],
  context: ValidationContext,
) {
  if (context.seenIds.has(node.id)) {
    addIssue(
      context,
      node.id,
      path,
      "DUPLICATE_NODE_ID",
      "Every condition and group must have a unique identifier.",
    );
  }
  context.seenIds.add(node.id);
}

function resolveDirectOperandType(
  operand: DirectOperand,
  nodeId: string,
  path: readonly number[],
  context: ValidationContext,
) {
  if (operand.kind === "CONSTANT") return primitiveType(operand.value);
  const field = context.fields.get(operand.key);
  if (!field) {
    addIssue(
      context,
      nodeId,
      path,
      "FIELD_NOT_FOUND",
      `Field "${operand.key}" is not available.`,
    );
  }
  return field?.type;
}

function resolveOperandType(
  operand: Operand,
  nodeId: string,
  path: readonly number[],
  context: ValidationContext,
): ConditionFieldType | undefined {
  if (operand.kind !== "COMPUTED") {
    return resolveDirectOperandType(operand, nodeId, path, context);
  }
  const leftType = resolveDirectOperandType(
    operand.leftOperand,
    nodeId,
    path,
    context,
  );
  const rightType = resolveDirectOperandType(
    operand.rightOperand,
    nodeId,
    path,
    context,
  );
  if (leftType && leftType !== "NUMBER" || rightType && rightType !== "NUMBER") {
    addIssue(
      context,
      nodeId,
      path,
      "COMPUTED_OPERAND_TYPE",
      "Computed operands require numeric fields or constants.",
    );
  }
  return "NUMBER";
}

function validateSingleOperand(
  operand: Operand,
  expectedType: ConditionFieldType,
  condition: Condition,
  path: readonly number[],
  context: ValidationContext,
) {
  if (operand.kind === "CONSTANT") {
    if (!valueMatchesFieldType(operand.value, expectedType)) {
      addIssue(
        context,
        condition.id,
        path,
        "VALUE_TYPE",
        `Value must be ${expectedValueDescription(expectedType)}.`,
      );
    }
    return;
  }
  const operandType = resolveOperandType(
    operand,
    condition.id,
    path,
    context,
  );
  if (operandType && operandType !== expectedType) {
    addIssue(
      context,
      condition.id,
      path,
      "VALUE_TYPE",
      `Value must resolve to ${expectedValueDescription(expectedType)}.`,
    );
  }
}

function validateListOrRange(
  condition: Condition,
  expectedType: ConditionFieldType,
  valueShape: "LIST" | "RANGE",
  path: readonly number[],
  context: ValidationContext,
) {
  const value = condition.rightOperand?.kind === "CONSTANT"
    ? condition.rightOperand.value
    : undefined;
  if (!Array.isArray(value)) {
    addIssue(
      context,
      condition.id,
      path,
      "VALUE_TYPE",
      valueShape === "RANGE"
        ? "Between requires two values."
        : "This operator requires a list of values.",
    );
    return;
  }
  if (valueShape === "LIST" && value.length === 0) {
    addIssue(
      context,
      condition.id,
      path,
      "VALUE_LIST_EMPTY",
      "Add at least one value to the list.",
    );
  }
  if (valueShape === "RANGE" && value.length !== 2) {
    addIssue(
      context,
      condition.id,
      path,
      "VALUE_RANGE",
      "Between requires exactly two values.",
    );
  }
  if (value.some((item) => !valueMatchesFieldType(item, expectedType))) {
    addIssue(
      context,
      condition.id,
      path,
      "VALUE_TYPE",
      `Every value must be ${expectedValueDescription(expectedType)}.`,
    );
  }
  if (
    valueShape === "RANGE"
    && value.length === 2
    && valueMatchesFieldType(value[0], expectedType)
    && valueMatchesFieldType(value[1], expectedType)
    && rangeIsOutOfOrder(value[0], value[1])
  ) {
    addIssue(
      context,
      condition.id,
      path,
      "VALUE_RANGE_ORDER",
      "The lower bound must not be greater than the upper bound.",
    );
  }
}

function validateCondition(
  condition: Condition,
  path: readonly number[],
  context: ValidationContext,
) {
  const leftType = resolveOperandType(
    condition.leftOperand,
    condition.id,
    path,
    context,
  );
  const definition = context.operators.get(condition.operator);
  if (!definition) {
    addIssue(
      context,
      condition.id,
      path,
      "OPERATOR_NOT_FOUND",
      `Operator "${condition.operator}" is not available.`,
    );
    return;
  }
  if (leftType && !definition.allowedFieldTypes.includes(leftType)) {
    addIssue(
      context,
      condition.id,
      path,
      "OPERATOR_NOT_COMPATIBLE",
      `${definition.label} cannot be used with ${leftType.toLowerCase()} fields.`,
    );
  }
  if (definition.valueShape === "NONE") {
    if (condition.rightOperand) {
      addIssue(
        context,
        condition.id,
        path,
        "VALUE_NOT_ALLOWED",
        `${definition.label} does not accept a value.`,
      );
    }
    return;
  }
  if (!condition.rightOperand) {
    addIssue(
      context,
      condition.id,
      path,
      "VALUE_REQUIRED",
      `${definition.label} requires a value.`,
    );
    return;
  }
  if (!leftType) return;
  if (definition.valueShape === "LIST" || definition.valueShape === "RANGE") {
    validateListOrRange(
      condition,
      leftType,
      definition.valueShape,
      path,
      context,
    );
    return;
  }
  const expectedType = condition.operator === "WITHIN_LAST_N_MONTHS"
    ? "NUMBER"
    : leftType;
  validateSingleOperand(
    condition.rightOperand,
    expectedType,
    condition,
    path,
    context,
  );
  if (
    condition.operator === "WITHIN_LAST_N_MONTHS"
    && condition.rightOperand.kind === "CONSTANT"
    && (typeof condition.rightOperand.value !== "number"
      || !Number.isInteger(condition.rightOperand.value)
      || condition.rightOperand.value < 1)
  ) {
    addIssue(
      context,
      condition.id,
      path,
      "VALUE_TYPE",
      "Month count must be a positive integer.",
    );
  }
}

function validateGroup(
  group: ConditionGroup,
  path: readonly number[],
  context: ValidationContext,
) {
  validateNodeId(group, path, context);
  if (group.children.length === 0) {
    addIssue(
      context,
      group.id,
      path,
      "EMPTY_GROUP",
      "A condition group must contain at least one condition or group.",
    );
  }
  group.children.forEach((child, index) => {
    const childPath = [...path, index];
    if (child.kind === "GROUP") {
      validateGroup(child, childPath, context);
      return;
    }
    validateNodeId(child, childPath, context);
    validateCondition(child, childPath, context);
  });
}

export function validateConditionGroup(
  group: ConditionGroup,
  fields: readonly ConditionFieldDefinition[],
  operators: readonly ConditionOperatorDefinition[],
): ConditionValidationResult {
  const issues: ConditionValidationIssue[] = [];
  validateGroup(group, [], {
    fields: new Map(fields.map((field) => [field.key, field])),
    issues,
    operators: new Map(operators.map((item) => [item.code, item])),
    seenIds: new Set(),
  });
  return { issues, valid: issues.length === 0 };
}
