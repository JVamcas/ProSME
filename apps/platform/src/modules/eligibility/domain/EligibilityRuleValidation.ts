import type { ConditionGroup, ConditionNode } from "@/modules/conditions/domain/ConditionGroup";
import type { EligibilityRule } from "./EligibilityRule";

export type EligibilityRuleValidationIssue = {
  code: string;
  message: string;
  ruleIndex: number;
};

function hasCondition(node: ConditionNode, conditionId: string): boolean {
  if (node.kind === "CONDITION") return node.id === conditionId;
  return node.children.some((child) => hasCondition(child, conditionId));
}

export function validateEligibilityRules(
  rules: readonly EligibilityRule[],
  groups: ReadonlyMap<string, ConditionGroup>,
): EligibilityRuleValidationIssue[] {
  const issues: EligibilityRuleValidationIssue[] = [];
  const reasonCodes = new Set<string>();
  const orders = new Set<number>();

  rules.forEach((rule, ruleIndex) => {
    const group = groups.get(rule.condition.conditionGroupId);
    if (!group) {
      issues.push({
        code: "CONDITION_GROUP_NOT_FOUND",
        message: "The referenced condition group does not exist.",
        ruleIndex,
      });
    } else if (
      rule.condition.kind === "CONDITION"
      && !hasCondition(group, rule.condition.conditionId)
    ) {
      issues.push({
        code: "CONDITION_NOT_FOUND",
        message: "The referenced condition does not exist in its group.",
        ruleIndex,
      });
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(rule.reasonCode)) {
      issues.push({
        code: "INVALID_REASON_CODE",
        message: "Reason codes must use uppercase letters, numbers, and underscores.",
        ruleIndex,
      });
    } else if (reasonCodes.has(rule.reasonCode)) {
      issues.push({
        code: "DUPLICATE_REASON_CODE",
        message: "Reason codes must be unique within a ruleset version.",
        ruleIndex,
      });
    }
    reasonCodes.add(rule.reasonCode);

    if (!Number.isInteger(rule.order) || rule.order < 1) {
      issues.push({
        code: "INVALID_ORDER",
        message: "Rule order must be a positive integer.",
        ruleIndex,
      });
    } else if (orders.has(rule.order)) {
      issues.push({
        code: "DUPLICATE_ORDER",
        message: "Rule order must be unique within a ruleset version.",
        ruleIndex,
      });
    }
    orders.add(rule.order);

    if (!rule.applicantMessage.trim()) {
      issues.push({
        code: "APPLICANT_MESSAGE_REQUIRED",
        message: "An applicant-facing message is required.",
        ruleIndex,
      });
    }
  });

  return issues;
}
