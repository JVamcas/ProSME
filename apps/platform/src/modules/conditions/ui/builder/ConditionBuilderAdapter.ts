import type { RuleGroupType, RuleType } from "react-querybuilder";

import type { Condition } from "../../domain/Condition";
import type { ConditionOperatorDefinition } from "../../domain/ConditionConfiguration";
import type { ConditionGroup, ConditionNode } from "../../domain/ConditionGroup";
import type { JsonValue } from "../../domain/Operand";
import { operator } from "../../domain/Operator";

function conditionToRule(condition: Condition): RuleType {
  if (condition.leftOperand.kind !== "FIELD") {
    throw new Error("The condition builder requires a field left operand.");
  }
  if (
    condition.rightOperand
    && condition.rightOperand.kind !== "CONSTANT"
  ) {
    throw new Error("The condition builder requires a constant value operand.");
  }
  return {
    field: condition.leftOperand.key,
    id: condition.id,
    operator: condition.operator,
    value: condition.rightOperand?.value ?? "",
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
  const definition = operators.find((item) => item.code === rule.operator);
  const condition: Condition = {
    id: rule.id ?? createId(),
    kind: "CONDITION",
    leftOperand: { kind: "FIELD", key: rule.field },
    operator: operator(rule.operator),
  };
  if (definition?.valueShape !== "NONE") {
    condition.rightOperand = {
      kind: "CONSTANT",
      value: rule.value as JsonValue,
    };
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
