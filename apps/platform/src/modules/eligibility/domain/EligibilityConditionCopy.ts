import type {
  ConditionGroup,
  ConditionNode,
} from "@/modules/conditions/domain/ConditionGroup";
import type { EligibilityRule } from "./EligibilityRule";

export function copyEligibilityConditions(
  definitions: ConditionGroup[],
  rules: EligibilityRule[],
) {
  const ids = new Map<string, string>();
  function copy(node: ConditionNode): ConditionNode {
    const id = ids.get(node.id) ?? crypto.randomUUID();
    ids.set(node.id, id);
    if (node.kind === "GROUP") {
      return { ...node, id, children: node.children.map(copy) };
    }
    return { ...node, id };
  }
  const copied = definitions.map(
    (definition) => copy(definition) as ConditionGroup,
  );
  return {
    definitions: copied,
    rules: rules.map((rule) => ({
      ...rule,
      condition:
        rule.condition.kind === "GROUP"
          ? {
              ...rule.condition,
              conditionGroupId:
                ids.get(rule.condition.conditionGroupId) ??
                rule.condition.conditionGroupId,
            }
          : {
              ...rule.condition,
              conditionGroupId:
                ids.get(rule.condition.conditionGroupId) ??
                rule.condition.conditionGroupId,
              conditionId:
                ids.get(rule.condition.conditionId) ??
                rule.condition.conditionId,
            },
    })),
  };
}
