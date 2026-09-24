import { describe, expect, it } from "vitest";

import { operator } from "@/modules/conditions/domain/Operator";
import {
  basicOperators,
  evaluateBasicOperator,
  IncomparableOperandsError,
  isBasicOperator,
} from "@/modules/conditions/engine/BasicOperators";

describe("basic condition operators", () => {
  it("evaluates equality and inequality without type coercion", () => {
    expect(evaluateBasicOperator(basicOperators.EQUALS, 10, 10)).toBe(true);
    expect(evaluateBasicOperator(basicOperators.EQUALS, 10, "10")).toBe(false);
    expect(evaluateBasicOperator(basicOperators.NOT_EQUALS, true, false)).toBe(
      true,
    );
  });

  it("compares JSON structures independently of object key order", () => {
    const left = { amount: 100, attributes: ["SME", true] };
    const right = { attributes: ["SME", true], amount: 100 };

    expect(evaluateBasicOperator(basicOperators.EQUALS, left, right)).toBe(true);
    expect(
      evaluateBasicOperator(
        basicOperators.NOT_EQUALS,
        left,
        { ...right, amount: 101 },
      ),
    ).toBe(true);
  });

  it.each([
    [basicOperators.GREATER_THAN, 11, 10, true],
    [basicOperators.GREATER_THAN, 10, 10, false],
    [basicOperators.LESS_THAN, "A", "B", true],
    [basicOperators.LESS_THAN, "B", "A", false],
    [basicOperators.GREATER_THAN_OR_EQUAL, 10, 10, true],
    [basicOperators.GREATER_THAN_OR_EQUAL, 9, 10, false],
    [basicOperators.LESS_THAN_OR_EQUAL, 10, 10, true],
    [basicOperators.LESS_THAN_OR_EQUAL, 11, 10, false],
  ] as const)(
    "evaluates %s",
    (selectedOperator, left, right, expected) => {
      expect(evaluateBasicOperator(selectedOperator, left, right)).toBe(
        expected,
      );
    },
  );

  it("rejects ordering comparisons across incompatible value types", () => {
    expect(() =>
      evaluateBasicOperator(basicOperators.GREATER_THAN, 10, "2"),
    ).toThrow(IncomparableOperandsError);
    expect(() =>
      evaluateBasicOperator(basicOperators.LESS_THAN, null, null),
    ).toThrow(IncomparableOperandsError);
  });

  it("identifies only the registered basic operators", () => {
    expect(isBasicOperator(basicOperators.EQUALS)).toBe(true);
    expect(isBasicOperator(operator("IN"))).toBe(false);
  });
});
