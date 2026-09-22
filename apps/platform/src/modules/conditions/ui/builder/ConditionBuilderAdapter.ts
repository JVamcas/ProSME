import type { RuleGroupType, RuleType } from "react-querybuilder";

import type { Condition } from "../../domain/Condition";
import type { ConditionOperatorDefinition } from "../../domain/ConditionConfiguration";
import type { ConditionGroup, ConditionNode } from "../../domain/ConditionGroup";
import type { JsonValue, Operand } from "../../domain/Operand";
import { operator } from "../../domain/Operator";

type BuilderRuleMeta = {
  leftOperand?: Operand;
};

function isOperand(value: unknown): value is Operand {
  if (!value || typeof value !== "object" || !("kind" in value)) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === "FIELD" || kind === "CONSTANT" || kind === "COMPUTED";
}

function firstFieldKey(operand: Operand): string {
  if (operand.kind === "FIELD") return operand.key;
  if (operand.kind === "COMPUTED") {
    if (operand.leftOperand.kind === "FIELD") return operand.leftOperand.key;
    if (operand.rightOperand.kind === "FIELD") return operand.rightOperand.key;
  }
  return "";
}

function conditionToRule(condition: Condition): RuleType {
  return {
    field: firstFieldKey(condition.leftOperand),
    id: condition.id,
    meta: { leftOperand: condition.leftOperand } satisfies BuilderRuleMeta,
    operator: condition.operator,
    value: condition.rightOperand ?? "",
  };
}

export function conditionGroupToQuery(group: ConditionGroup): RuleGroupType {
  return {
    combinator: group.combinator,
    id: group.id,
    rules: group.children.map((child) => child.kind === "GROUP"
      ? conditionGroupToQuery(child)
      : conditionToRule(child)),
  };
}

function ruleToCondition(
  rule: RuleType,
  operators: readonly ConditionOperatorDefinition[],
  createId: () => string,
): Condition {
  const meta = rule.meta as BuilderRuleMeta | undefined;
  const definition = operators.find((item) => item.code === rule.operator);
  const condition: Condition = {
    id: rule.id ?? createId(),
    kind: "CONDITION",
    leftOperand: meta?.leftOperand ?? { kind: "FIELD", key: rule.field },
    operator: operator(rule.operator),
  };
  if (definition?.valueShape !== "NONE") {
    condition.rightOperand = isOperand(rule.value)
      ? rule.value
      : { kind: "CONSTANT", value: rule.value as JsonValue };
  }
  return condition;
}

export function queryToConditionGroup(
  query: RuleGroupType,
  operators: readonly ConditionOperatorDefinition[],
  createId: () => string,
): ConditionGroup {
  return {
    id: query.id ?? createId(),
    kind: "GROUP",
    combinator: query.combinator === "OR" ? "OR" : "AND",
    children: query.rules.map((child): ConditionNode => "rules" in child
      ? queryToConditionGroup(child, operators, createId)
      : ruleToCondition(child, operators, createId)),
  };
}
