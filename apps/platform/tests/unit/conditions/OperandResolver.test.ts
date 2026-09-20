import { describe, expect, it } from "vitest";

import type { Operand } from "@/modules/conditions/domain/Operand";
import {
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
});
