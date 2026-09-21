import { describe, expect, it } from "vitest";

import {
  eligibilityBuilderRuleSchema,
  eligibilityRuleSetBuilderSchema,
} from "@/modules/eligibility/api/EligibilityRuleSetSchemas";

const ruleId = "50000000-0000-4000-8000-000000000001";
const groupId = "50000000-0000-4000-8000-000000000002";
const nestedGroupId = "50000000-0000-4000-8000-000000000003";
const conditionId = "50000000-0000-4000-8000-000000000004";

function validRule(overrides: Record<string, unknown> = {}) {
  return {
    applicantMessage: "Your business must employ at least one person.",
    condition: {
      children: [{
        children: [{
          id: conditionId,
          kind: "CONDITION",
          leftOperand: {
            key: "application.business.employee_count",
            kind: "FIELD",
          },
          operator: "GREATER_THAN",
          rightOperand: { kind: "CONSTANT", value: 0 },
        }],
        combinator: "OR",
        id: nestedGroupId,
        kind: "GROUP",
      }],
      combinator: "AND",
      id: groupId,
      kind: "GROUP",
    },
    executionMode: "BOTH",
    failureType: "HARD_FAIL",
    id: ruleId,
    order: 1,
    reasonCode: "EMPLOYEE_REQUIRED",
    ...overrides,
  };
}

describe("eligibility builder schemas", () => {
  it("accepts nested conditions and eligibility outcome metadata", () => {
    const result = eligibilityBuilderRuleSchema.safeParse(validRule());

    expect(result.success).toBe(true);
  });

  it("defers contextual field validation and rejects incomplete groups", () => {
    const unknownField = validRule();
    const condition = (
      unknownField.condition as {
        children: Array<{ children: Array<{ leftOperand: { key: string } }> }>;
      }
    ).children[0].children[0];
    condition.leftOperand.key = "application.unknown";

    const unknownResult = eligibilityBuilderRuleSchema.safeParse(unknownField);
    const emptyResult = eligibilityBuilderRuleSchema.safeParse(validRule({
      condition: {
        children: [],
        combinator: "AND",
        id: groupId,
        kind: "GROUP",
      },
    }));

    expect(unknownResult.success).toBe(true);
    expect(emptyResult.success).toBe(false);
  });

  it("requires unique reason codes and contiguous display order", () => {
    const result = eligibilityRuleSetBuilderSchema.safeParse({
      expectedRowVersion: 1,
      rules: [
        validRule(),
        validRule({
          id: "50000000-0000-4000-8000-000000000005",
          order: 3,
        }),
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Reason codes must be unique within a ruleset version.",
        "Rule order must be contiguous and start at one.",
      ]),
    );
  });
});
