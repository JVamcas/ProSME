import { describe, expect, it } from "vitest";

import type { ConditionNode } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import type {
  EligibilityEvaluationMode,
  EligibilityEvaluationRule,
  EligibilityEvaluationRuleSet,
} from "@/modules/eligibility/domain/EligibilityEvaluation";
import { evaluateEligibilityRuleSet } from "@/modules/eligibility/engine/EligibilityEvaluator";

function condition(
  id: string,
  field: string,
  expected: string | number,
): ConditionNode {
  return {
    id,
    kind: "CONDITION",
    leftOperand: { key: field, kind: "FIELD" },
    operator: typeof expected === "number"
      ? basicOperators.GREATER_THAN
      : basicOperators.EQUALS,
    rightOperand: { kind: "CONSTANT", value: expected },
  };
}

function rule(
  id: string,
  failureType: EligibilityEvaluationRule["failureType"],
  executionMode: EligibilityEvaluationRule["executionMode"],
  conditionDefinition: ConditionNode,
  order: number,
): EligibilityEvaluationRule {
  return {
    applicantMessage: `Message for ${id}`,
    condition: conditionDefinition.kind === "GROUP"
      ? {
          conditionGroupId: conditionDefinition.id,
          kind: "GROUP",
        }
      : {
          conditionGroupId: "10000000-0000-4000-8000-000000000001",
          conditionId: conditionDefinition.id,
          kind: "CONDITION",
        },
    conditionDefinition,
    executionMode,
    failureType,
    id,
    order,
    reasonCode: `${failureType}_${order}`,
  };
}

function ruleset(
  rules: EligibilityEvaluationRule[],
): EligibilityEvaluationRuleSet {
  return {
    ruleSetId: "20000000-0000-4000-8000-000000000001",
    rules,
    versionId: "20000000-0000-4000-8000-000000000002",
    versionNumber: 4,
  };
}

const data = {
  application: {
    employee_count: 0,
    region: "Khomas",
    requested_amount: 600_000,
  },
  eligibility: {},
  fundingCall: { maximum_amount: 500_000 },
  stages: [],
};

function evaluate(
  rules: EligibilityEvaluationRule[],
  mode: EligibilityEvaluationMode = "SELF_CHECK",
) {
  return evaluateEligibilityRuleSet(ruleset(rules), mode, data);
}

describe("EligibilityEvaluator", () => {
  it("makes a failed Hard Fail rule ineligible", () => {
    const result = evaluate([
      rule(
        "hard-rule",
        "HARD_FAIL",
        "BOTH",
        condition(
          "10000000-0000-4000-8000-000000000002",
          "application.employee_count",
          0,
        ),
        1,
      ),
    ]);

    expect(result.eligible).toBe(false);
    expect(result.hardFailures).toMatchObject([
      { reasonCode: "HARD_FAIL_1", ruleId: "hard-rule" },
    ]);
    expect(result.ruleOutcomes).toEqual([
      expect.objectContaining({ passed: false, ruleId: "hard-rule" }),
    ]);
  });

  it("returns Soft Fail and Warning findings without making the result ineligible", () => {
    const result = evaluate([
      rule(
        "soft-rule",
        "SOFT_FAIL",
        "BOTH",
        condition(
          "10000000-0000-4000-8000-000000000003",
          "application.requested_amount",
          700_000,
        ),
        1,
      ),
      rule(
        "warning-rule",
        "WARNING",
        "SELF_CHECK",
        condition(
          "10000000-0000-4000-8000-000000000004",
          "application.region",
          "Erongo",
        ),
        2,
      ),
    ]);

    expect(result).toMatchObject({
      eligible: true,
      manualScreeningRequired: true,
      reasonCodes: ["SOFT_FAIL_1", "WARNING_2"],
      ruleSetId: "20000000-0000-4000-8000-000000000001",
      ruleSetVersionId: "20000000-0000-4000-8000-000000000002",
      ruleSetVersionNumber: 4,
    });
    expect(result.softFailures).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.ruleOutcomes).toHaveLength(2);
  });

  it("evaluates multiple rules in order and only for the requested mode", () => {
    const selfCheck = rule(
      "self-check",
      "WARNING",
      "SELF_CHECK",
      condition(
        "10000000-0000-4000-8000-000000000005",
        "application.region",
        "Erongo",
      ),
      1,
    );
    const screening = rule(
      "screening",
      "SOFT_FAIL",
      "SCREENING",
      condition(
        "10000000-0000-4000-8000-000000000006",
        "application.region",
        "Erongo",
      ),
      2,
    );
    const passing = rule(
      "passing",
      "HARD_FAIL",
      "BOTH",
      condition(
        "10000000-0000-4000-8000-000000000007",
        "application.region",
        "Khomas",
      ),
      3,
    );

    expect(evaluate([selfCheck, screening, passing]).reasonCodes).toEqual([
      "WARNING_1",
    ]);
    expect(
      evaluate([selfCheck, screening, passing], "SCREENING").reasonCodes,
    ).toEqual(["SOFT_FAIL_2"]);
  });

  it("evaluates a referenced Generic Condition Group", () => {
    const group: ConditionNode = {
      children: [
        condition(
          "10000000-0000-4000-8000-000000000008",
          "application.region",
          "Khomas",
        ),
        condition(
          "10000000-0000-4000-8000-000000000009",
          "application.employee_count",
          0,
        ),
      ],
      combinator: "AND",
      id: "10000000-0000-4000-8000-000000000010",
      kind: "GROUP",
    };

    const result = evaluate([
      rule("group-rule", "WARNING", "BOTH", group, 1),
    ]);

    expect(result.warnings).toMatchObject([
      { reasonCode: "WARNING_1", ruleId: "group-rule" },
    ]);
  });
});
