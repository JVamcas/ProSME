import type { Condition } from "../domain/Condition";
import type {
  ConditionFieldDefinition,
  ConditionOperatorDefinition,
} from "../domain/ConditionConfiguration";
import type { ConditionGroup } from "../domain/ConditionGroup";
import type { DirectOperand, JsonValue, Operand } from "../domain/Operand";

type PreviewContext = {
  fields: ReadonlyMap<string, ConditionFieldDefinition>;
  operators: ReadonlyMap<string, ConditionOperatorDefinition>;
};

const computedSymbols = {
  ADD: "+",
  SUBTRACT: "−",
  MULTIPLY: "×",
  DIVIDE: "÷",
} as const;

function formatValue(value: JsonValue): string {
  if (value === null) return "empty";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `“${value}”`;
  if (Array.isArray(value)) {
    return value.map(formatValue).join(", ");
  }
  return JSON.stringify(value);
}

function directOperandPreview(
  operand: DirectOperand,
  context: PreviewContext,
) {
  if (operand.kind === "CONSTANT") return formatValue(operand.value);
  return context.fields.get(operand.key)?.label ?? `[Unknown field: ${operand.key}]`;
}

function operandPreview(operand: Operand, context: PreviewContext): string {
  if (operand.kind !== "COMPUTED") {
    return directOperandPreview(operand, context);
  }
  return `(${directOperandPreview(operand.leftOperand, context)} ${computedSymbols[operand.operation]} ${directOperandPreview(operand.rightOperand, context)})`;
}

function valuePreview(
  condition: Condition,
  definition: ConditionOperatorDefinition | undefined,
  context: PreviewContext,
) {
  if (!definition || definition.valueShape === "NONE") return "";
  if (!condition.rightOperand) return " [value required]";
  if (
    definition.valueShape === "RANGE"
    && condition.rightOperand.kind === "CONSTANT"
    && Array.isArray(condition.rightOperand.value)
  ) {
    const [lower, upper] = condition.rightOperand.value;
    return ` ${formatValue(lower)} and ${formatValue(upper)}`;
  }
  if (
    definition.valueShape === "LIST"
    && condition.rightOperand.kind === "CONSTANT"
    && Array.isArray(condition.rightOperand.value)
  ) {
    return condition.rightOperand.value.length
      ? ` (${condition.rightOperand.value.map(formatValue).join(", ")})`
      : " [add values]";
  }
  return ` ${operandPreview(condition.rightOperand, context)}`;
}

function conditionPreview(condition: Condition, context: PreviewContext) {
  const definition = context.operators.get(condition.operator);
  return [
    operandPreview(condition.leftOperand, context),
    definition?.label ?? `[Unknown operator: ${condition.operator}]`,
    valuePreview(condition, definition, context),
  ].join(" ").replace(/\s+/g, " ").trim();
}

function groupPreview(
  group: ConditionGroup,
  context: PreviewContext,
  nested: boolean,
): string {
  if (group.children.length === 0) return "[Empty group]";
  const text = group.children.map((child) => child.kind === "GROUP"
    ? groupPreview(child, context, true)
    : conditionPreview(child, context)).join(` ${group.combinator} `);
  return nested ? `(${text})` : text;
}

export function formatConditionGroupPreview(
  group: ConditionGroup,
  fields: readonly ConditionFieldDefinition[],
  operators: readonly ConditionOperatorDefinition[],
) {
  return groupPreview(group, {
    fields: new Map(fields.map((field) => [field.key, field])),
    operators: new Map(operators.map((item) => [item.code, item])),
  }, false);
}
