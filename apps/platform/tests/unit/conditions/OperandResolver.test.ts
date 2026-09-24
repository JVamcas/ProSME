import { describe, expect, it } from "vitest";

import type { Operand } from "@/modules/conditions/domain/Operand";
import {
  ComputedOperandEvaluationError,
  FieldOperandNotFoundError,
  resolveOperand,
} from "@/modules/conditions/engine/OperandResolver";

describe("operand resolver", () => {
  it("resolves a field by its exact stable key", () => {
    const operand: Operand = {
      kind: "FIELD",
      key: "application.requested_amount",
    };
    const fields = {
      "application.requested_amount": 350_000,
      requested_amount: 1,
    };

    expect(resolveOperand(operand, fields)).toBe(350_000);
  });

  it("does not interpret stable keys as object traversal paths", () => {
    const operand: Operand = {
      kind: "FIELD",
      key: "application.requested_amount",
    };
    const fields = {
      application: { requested_amount: 350_000 },
    };

    expect(() => resolveOperand(operand, fields)).toThrow(
      FieldOperandNotFoundError,
    );
  });

  it("returns the configured constant value", () => {
    const configuredValue = {
      currency: "NAD",
      limits: [100_000, 500_000],
    };
    const operand: Operand = {
      kind: "CONSTANT",
      value: configuredValue,
    };

    expect(resolveOperand(operand, {})).toBe(configuredValue);
  });

  it("distinguishes a configured null from a missing field", () => {
    expect(
      resolveOperand(
        { kind: "FIELD", key: "application.optional_value" },
        { "application.optional_value": null },
      ),
    ).toBeNull();
    expect(() =>
      resolveOperand(
        { kind: "FIELD", key: "application.missing_value" },
        {},
      ),
    ).toThrow(FieldOperandNotFoundError);
  });

  it("resolves requested amount divided by annual turnover", () => {
    const operand: Operand = {
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
    };

    expect(
      resolveOperand(operand, {
        "application.requested_amount": 250_000,
        "business.annual_turnover": 1_000_000,
      }),
    ).toBe(0.25);
  });

  it.each([
    ["ADD", 10, 4, 14],
    ["SUBTRACT", 10, 4, 6],
    ["MULTIPLY", 10, 4, 40],
    ["DIVIDE", 10, 4, 2.5],
  ] as const)("evaluates computed %s", (operation, left, right, expected) => {
    const operand: Operand = {
      kind: "COMPUTED",
      operation,
      leftOperand: { kind: "CONSTANT", value: left },
      rightOperand: { kind: "CONSTANT", value: right },
    };

    expect(resolveOperand(operand, {})).toBe(expected);
  });

  it("requires finite numeric inputs for every computed operation", () => {
    const operand: Operand = {
      kind: "COMPUTED",
      operation: "DIVIDE",
      leftOperand: { kind: "CONSTANT", value: "250000" },
      rightOperand: { kind: "CONSTANT", value: 1_000_000 },
    };

    expect(() => resolveOperand(operand, {})).toThrowError(
      expect.objectContaining({
        code: "COMPUTED_OPERAND_REQUIRES_FINITE_NUMBERS",
      }),
    );
  });

  it("rejects division by zero", () => {
    const operand: Operand = {
      kind: "COMPUTED",
      operation: "DIVIDE",
      leftOperand: { kind: "CONSTANT", value: 250_000 },
      rightOperand: { kind: "CONSTANT", value: 0 },
    };

    expect(() => resolveOperand(operand, {})).toThrowError(
      expect.objectContaining({
        code: "COMPUTED_OPERAND_DIVISION_BY_ZERO",
      }),
    );
    expect(() => resolveOperand(operand, {})).toThrow(
      ComputedOperandEvaluationError,
    );
  });

  it("rejects non-finite computed results", () => {
    const operand: Operand = {
      kind: "COMPUTED",
      operation: "MULTIPLY",
      leftOperand: { kind: "CONSTANT", value: Number.MAX_VALUE },
      rightOperand: { kind: "CONSTANT", value: 2 },
    };

    expect(() => resolveOperand(operand, {})).toThrowError(
      expect.objectContaining({
        code: "COMPUTED_OPERAND_RESULT_NOT_FINITE",
      }),
    );
  });
});
