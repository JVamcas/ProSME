import { describe, expect, it } from "vitest";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { operator } from "@/modules/conditions/domain/Operator";
import type { EligibilityRule } from "@/modules/eligibility/domain/EligibilityRule";
import { copyEligibilityConditions } from "@/modules/eligibility/domain/EligibilityConditionCopy";

const group: ConditionGroup = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "GROUP",
  combinator: "AND",
  children: [
    {
      id: "10000000-0000-4000-8000-000000000002",
      kind: "GROUP",
      combinator: "OR",
      children: [
        {
          id: "10000000-0000-4000-8000-000000000003",
          kind: "CONDITION",
          leftOperand: { kind: "FIELD", key: "application.amount" },
          operator: operator("GREATER_THAN"),
          rightOperand: { kind: "CONSTANT", value: 0 },
        },
      ],
    },
  ],
};

function rule(condition: EligibilityRule["condition"]): EligibilityRule {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    applicantMessage: "An amount is required.",
    executionMode: "BOTH",
    failureType: "HARD_FAIL",
    order: 1,
    reasonCode: "AMOUNT_REQUIRED",
    condition,
  };
}

describe("replacement ruleset condition isolation", () => {
  it("copies nested groups and redirects both group and leaf references", () => {
    const original = structuredClone(group);
    const copied = copyEligibilityConditions(
      [group],
      [
        rule({ kind: "GROUP", conditionGroupId: group.id }),
        rule({
          kind: "CONDITION",
          conditionGroupId: group.id,
          conditionId: (group.children[0] as ConditionGroup).children[0].id,
        }),
      ],
    );
    expect(copied.definitions[0].id).not.toBe(group.id);
    expect(copied.definitions[0].children[0].id).not.toBe(group.children[0].id);
    expect(copied.rules[0].condition.conditionGroupId).toBe(
      copied.definitions[0].id,
    );
    expect(copied.rules[1].condition).toMatchObject({
      conditionId: (copied.definitions[0].children[0] as ConditionGroup)
        .children[0].id,
    });
    copied.definitions[0].combinator = "OR";
    expect(group).toEqual(original);
  });
});
