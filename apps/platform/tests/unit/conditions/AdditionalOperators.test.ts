import { describe, expect, it } from "vitest";

import type { JsonValue } from "@/modules/conditions/domain/Operand";
import {
  additionalOperators,
  evaluateAdditionalOperator,
  InvalidAdditionalOperatorOperandsError,
} from "@/modules/conditions/engine/AdditionalOperators";

describe("additional condition operators", () => {
  it("evaluates IN and NOT_IN using strict JSON equality", () => {
    const candidates = ["SME", 10, { region: "Erongo" }];

    expect(
      evaluateAdditionalOperator(additionalOperators.IN, 10, candidates),
    ).toBe(true);
    expect(
      evaluateAdditionalOperator(additionalOperators.IN, "10", candidates),
    ).toBe(false);
    expect(
      evaluateAdditionalOperator(
        additionalOperators.NOT_IN,
        { region: "Khomas" },
        candidates,
      ),
    ).toBe(true);
  });

  it("evaluates inclusive BETWEEN bounds", () => {
    expect(
      evaluateAdditionalOperator(additionalOperators.BETWEEN, 10, [10, 20]),
    ).toBe(true);
    expect(
      evaluateAdditionalOperator(additionalOperators.BETWEEN, 20, [10, 20]),
    ).toBe(true);
    expect(
      evaluateAdditionalOperator(additionalOperators.BETWEEN, 21, [10, 20]),
    ).toBe(false);
  });

  it("evaluates BEFORE and AFTER with valid ISO dates", () => {
    expect(
      evaluateAdditionalOperator(
        additionalOperators.BEFORE,
        "2026-01-31",
        "2026-02-01",
      ),
    ).toBe(true);
    expect(
      evaluateAdditionalOperator(
        additionalOperators.AFTER,
        "2026-02-01T10:00:00+02:00",
        "2026-02-01T07:00:00Z",
      ),
    ).toBe(true);
  });

  it.each<[JsonValue, boolean]>([
    [null, true],
    ["", true],
    [[], true],
    [{}, true],
    [" ", false],
    [[null], false],
    [{ value: null }, false],
    [0, false],
  ])("evaluates empty value %#", (value, expected) => {
    expect(
      evaluateAdditionalOperator(additionalOperators.IS_EMPTY, value),
    ).toBe(expected);
    expect(
      evaluateAdditionalOperator(additionalOperators.IS_NOT_EMPTY, value),
    ).toBe(!expected);
  });

  it("evaluates WITHIN_LAST_N_MONTHS with calendar-month boundaries", () => {
    const currentDate = new Date("2026-03-31T12:00:00.000Z");

    expect(
      evaluateAdditionalOperator(
        additionalOperators.WITHIN_LAST_N_MONTHS,
        "2026-02-28T12:00:00.000Z",
        1,
        currentDate,
      ),
    ).toBe(true);
    expect(
      evaluateAdditionalOperator(
        additionalOperators.WITHIN_LAST_N_MONTHS,
        "2026-02-28T11:59:59.999Z",
        1,
        currentDate,
      ),
    ).toBe(false);
    expect(
      evaluateAdditionalOperator(
        additionalOperators.WITHIN_LAST_N_MONTHS,
        "2026-04-01",
        1,
        currentDate,
      ),
    ).toBe(false);
  });

  it("rejects invalid operand shapes and dates", () => {
    expect(() =>
      evaluateAdditionalOperator(additionalOperators.IN, "SME", "SME"),
    ).toThrow(InvalidAdditionalOperatorOperandsError);
    expect(() =>
      evaluateAdditionalOperator(additionalOperators.BETWEEN, 10, [0]),
    ).toThrow(InvalidAdditionalOperatorOperandsError);
    expect(() =>
      evaluateAdditionalOperator(
        additionalOperators.BEFORE,
        "2026-02-30",
        "2026-03-01",
      ),
    ).toThrow(InvalidAdditionalOperatorOperandsError);
    expect(() =>
      evaluateAdditionalOperator(
        additionalOperators.WITHIN_LAST_N_MONTHS,
        "2026-02-01",
        0,
      ),
    ).toThrow(InvalidAdditionalOperatorOperandsError);
  });
});
