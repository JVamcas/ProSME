import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { EligibilityRule } from "@/modules/eligibility/domain/EligibilityRule";
import { validateEligibilityRules } from "@/modules/eligibility/domain/EligibilityRuleValidation";

const group: ConditionGroup = {
  children: [
    {
      id: "20000000-0000-4000-8000-000000000002",
      kind: "CONDITION",
      leftOperand: { key: "business.employee_count", kind: "FIELD" },
      operator: "GREATER_THAN" as never,
      rightOperand: { kind: "CONSTANT", value: 0 },
    },
  ],
  combinator: "AND",
  id: "20000000-0000-4000-8000-000000000001",
  kind: "GROUP",
};

function rule(overrides: Partial<EligibilityRule> = {}): EligibilityRule {
  return {
    applicantMessage: "The business must employ at least one person.",
    condition: {
      conditionGroupId: group.id,
      conditionId: group.children[0].id,
      kind: "CONDITION",
    },
    executionMode: "BOTH",
    failureType: "HARD_FAIL",
    order: 1,
    reasonCode: "EMPLOYEE_COUNT_REQUIRED",
    ...overrides,
  };
}

describe("eligibility rule validation", () => {
  it("accepts generic condition and condition-group references", () => {
    const issues = validateEligibilityRules(
      [
        rule(),
        rule({
          condition: { conditionGroupId: group.id, kind: "GROUP" },
          executionMode: "SCREENING",
          failureType: "WARNING",
          order: 2,
          reasonCode: "GROUP_WARNING",
        }),
      ],
      new Map([[group.id, group]]),
    );

    expect(issues).toEqual([]);
  });

  it("rejects missing references and invalid persisted outcome metadata", () => {
    const issues = validateEligibilityRules(
      [
        rule({
          applicantMessage: " ",
          condition: {
            conditionGroupId: group.id,
            conditionId: "20000000-0000-4000-8000-000000000099",
            kind: "CONDITION",
          },
          order: 0,
          reasonCode: "not-valid",
        }),
      ],
      new Map([[group.id, group]]),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "CONDITION_NOT_FOUND",
      "INVALID_REASON_CODE",
      "INVALID_ORDER",
      "APPLICANT_MESSAGE_REQUIRED",
    ]);
  });

  it("rejects duplicate reason codes and display order", () => {
    const issues = validateEligibilityRules(
      [rule(), rule()],
      new Map([[group.id, group]]),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "DUPLICATE_REASON_CODE",
      "DUPLICATE_ORDER",
    ]);
  });
});
