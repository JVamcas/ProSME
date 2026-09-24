import { describe, expect, it } from "vitest";

import type { Condition } from "@/modules/conditions/domain/Condition";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { evaluateConditionGroup } from "@/modules/conditions/engine/ConditionGroupEngine";

function condition(
  id: string,
  fieldKey: string,
  expectedValue: string,
): Condition {
  return {
    id,
    kind: "CONDITION",
    leftOperand: { kind: "FIELD", key: fieldKey },
    operator: basicOperators.EQUALS,
    rightOperand: { kind: "CONSTANT", value: expectedValue },
  };
}

function group(
  id: string,
  combinator: ConditionGroup["combinator"],
  children: ConditionGroup["children"],
): ConditionGroup {
  return {
    id,
    kind: "GROUP",
    combinator,
    children,
  };
}

describe("condition group evaluator", () => {
  it("passes an AND group only when every child passes", () => {
    const definition = group("and-group", "AND", [
      condition("region", "business.region", "Erongo"),
      condition("status", "business.status", "ACTIVE"),
    ]);

    expect(
      evaluateConditionGroup(definition, {
        "business.region": "Erongo",
        "business.status": "ACTIVE",
      }).passed,
    ).toBe(true);
    expect(
      evaluateConditionGroup(definition, {
        "business.region": "Erongo",
        "business.status": "INACTIVE",
      }).passed,
    ).toBe(false);
  });

  it("passes an OR group when any child passes", () => {
    const definition = group("or-group", "OR", [
      condition("erongo", "business.region", "Erongo"),
      condition("kunene", "business.region", "Kunene"),
    ]);

    expect(
      evaluateConditionGroup(definition, {
        "business.region": "Kunene",
      }).passed,
    ).toBe(true);
    expect(
      evaluateConditionGroup(definition, {
        "business.region": "Khomas",
      }).passed,
    ).toBe(false);
  });

  it("evaluates nested AND and OR groups recursively", () => {
    const definition = group("root", "AND", [
      condition("status", "business.status", "ACTIVE"),
      group("regions", "OR", [
        condition("erongo", "business.region", "Erongo"),
        condition("kunene", "business.region", "Kunene"),
      ]),
    ]);

    const result = evaluateConditionGroup(definition, {
      "business.region": "Kunene",
      "business.status": "ACTIVE",
    });

    expect(result.passed).toBe(true);
    expect(result.children[1]).toMatchObject({
      id: "regions",
      kind: "GROUP",
      combinator: "OR",
      passed: true,
      children: [
        { id: "erongo", kind: "CONDITION", passed: false },
        { id: "kunene", kind: "CONDITION", passed: true },
      ],
    });
  });

  it("retains every child result and controlled error", () => {
    const definition = group("root", "OR", [
      condition("passing", "business.region", "Erongo"),
      condition("missing", "business.registration_status", "REGISTERED"),
    ]);

    const result = evaluateConditionGroup(definition, {
      "business.region": "Erongo",
    });

    expect(result.passed).toBe(true);
    expect(result.children).toHaveLength(2);
    expect(result.children[1]).toMatchObject({
      id: "missing",
      kind: "CONDITION",
      passed: false,
      error: {
        code: "FIELD_NOT_FOUND",
        fieldKey: "business.registration_status",
      },
    });
  });

  it("uses the logical identities for empty groups", () => {
    expect(evaluateConditionGroup(group("and", "AND", []), {}).passed).toBe(
      true,
    );
    expect(evaluateConditionGroup(group("or", "OR", []), {}).passed).toBe(
      false,
    );
  });
});
