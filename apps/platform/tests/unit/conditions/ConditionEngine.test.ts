import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { Condition } from "@/modules/conditions/domain/Condition";
import { operator } from "@/modules/conditions/domain/Operator";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { evaluateCondition } from "@/modules/conditions/engine/ConditionEngine";

function condition(overrides: Partial<Condition> = {}): Condition {
  return {
    id: randomUUID(),
    kind: "CONDITION",
    leftOperand: {
      kind: "FIELD",
      key: "application.requested_amount",
    },
    operator: basicOperators.LESS_THAN_OR_EQUAL,
    rightOperand: {
      kind: "CONSTANT",
      value: 500_000,
    },
    ...overrides,
  };
}

describe("condition evaluator", () => {
  it("returns a passing result with resolved operands and operator", () => {
    const result = evaluateCondition(condition(), {
      "application.requested_amount": 350_000,
    });

    expect(result).toEqual({
      passed: true,
      resolvedOperands: {
        left: 350_000,
        right: 500_000,
      },
      operator: basicOperators.LESS_THAN_OR_EQUAL,
      error: null,
    });
  });

  it("returns an ordinary failed comparison without an error", () => {
    const result = evaluateCondition(condition(), {
      "application.requested_amount": 600_000,
    });

    expect(result.passed).toBe(false);
    expect(result.resolvedOperands).toEqual({
      left: 600_000,
      right: 500_000,
    });
    expect(result.error).toBeNull();
  });

  it("returns a controlled missing-field error", () => {
    const result = evaluateCondition(condition(), {});

    expect(result).toMatchObject({
      passed: false,
      resolvedOperands: {},
      operator: basicOperators.LESS_THAN_OR_EQUAL,
      error: {
        code: "FIELD_NOT_FOUND",
        fieldKey: "application.requested_amount",
      },
    });
  });

  it("retains operands resolved before a later resolution error", () => {
    const result = evaluateCondition(
      condition({
        rightOperand: {
          kind: "FIELD",
          key: "fundingCall.maximum_grant_amount",
        },
      }),
      { "application.requested_amount": 350_000 },
    );

    expect(result).toMatchObject({
      passed: false,
      resolvedOperands: { left: 350_000 },
      error: {
        code: "FIELD_NOT_FOUND",
        fieldKey: "fundingCall.maximum_grant_amount",
      },
    });
  });

  it("returns a controlled error when the right operand is absent", () => {
    const result = evaluateCondition(
      condition({ rightOperand: undefined }),
      { "application.requested_amount": 350_000 },
    );

    expect(result).toMatchObject({
      passed: false,
      resolvedOperands: { left: 350_000 },
      error: { code: "RIGHT_OPERAND_REQUIRED" },
    });
  });

  it("returns a controlled unsupported-operator error", () => {
    const unsupported = operator("MATCHES_PATTERN");
    const result = evaluateCondition(
      condition({ operator: unsupported }),
      { "application.requested_amount": 350_000 },
    );

    expect(result).toMatchObject({
      passed: false,
      resolvedOperands: {},
      operator: unsupported,
      error: { code: "UNSUPPORTED_OPERATOR" },
    });
  });

  it("returns a controlled error for incompatible ordering operands", () => {
    const result = evaluateCondition(
      condition({
        operator: basicOperators.GREATER_THAN,
        rightOperand: { kind: "CONSTANT", value: "100" },
      }),
      { "application.requested_amount": 350_000 },
    );

    expect(result).toMatchObject({
      passed: false,
      resolvedOperands: { left: 350_000, right: "100" },
      operator: basicOperators.GREATER_THAN,
      error: { code: "INCOMPARABLE_OPERANDS" },
    });
  });

  it("evaluates additional binary and unary operators", () => {
    const inResult = evaluateCondition(
      condition({
        operator: operator("IN"),
        rightOperand: {
          kind: "CONSTANT",
          value: ["Erongo", "Kunene"],
        },
      }),
      { "application.requested_amount": "Kunene" },
    );
    const emptyResult = evaluateCondition(
      condition({
        operator: operator("IS_EMPTY"),
        rightOperand: undefined,
      }),
      { "application.requested_amount": [] },
    );

    expect(inResult).toMatchObject({ passed: true, error: null });
    expect(emptyResult).toMatchObject({
      passed: true,
      resolvedOperands: { left: [] },
      error: null,
    });
  });

  it("returns controlled errors for invalid additional operands", () => {
    const result = evaluateCondition(
      condition({
        operator: operator("BETWEEN"),
        rightOperand: { kind: "CONSTANT", value: [100] },
      }),
      { "application.requested_amount": 100 },
    );

    expect(result).toMatchObject({
      passed: false,
      resolvedOperands: { left: 100, right: [100] },
      error: { code: "INVALID_OPERATOR_OPERANDS" },
    });
  });

  it("evaluates a condition using a computed ratio", () => {
    const result = evaluateCondition(
      condition({
        leftOperand: {
          kind: "COMPUTED",
          operation: "DIVIDE",
          leftOperand: {
            kind: "FIELD",
            key: "application.requested_amount",
          },
          rightOperand: {
            kind: "FIELD",
            key: "business.annual_turnover",
          },
        },
        rightOperand: { kind: "CONSTANT", value: 0.25 },
      }),
      {
        "application.requested_amount": 200_000,
        "business.annual_turnover": 1_000_000,
      },
    );

    expect(result).toEqual({
      passed: true,
      resolvedOperands: { left: 0.2, right: 0.25 },
      operator: basicOperators.LESS_THAN_OR_EQUAL,
      error: null,
    });
  });

  it("returns a controlled computed-operand error", () => {
    const result = evaluateCondition(
      condition({
        leftOperand: {
          kind: "COMPUTED",
          operation: "DIVIDE",
          leftOperand: {
            kind: "FIELD",
            key: "application.requested_amount",
          },
          rightOperand: {
            kind: "FIELD",
            key: "business.annual_turnover",
          },
        },
        rightOperand: { kind: "CONSTANT", value: 0.25 },
      }),
      {
        "application.requested_amount": 200_000,
        "business.annual_turnover": 0,
      },
    );

    expect(result).toMatchObject({
      passed: false,
      resolvedOperands: {},
      error: { code: "COMPUTED_OPERAND_DIVISION_BY_ZERO" },
    });
  });
});
