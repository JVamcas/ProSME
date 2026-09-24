import { describe, expect, it } from "vitest";

import { conditionGroupReferencesEligibilityInput } from "@/modules/eligibility/domain/EligibilityInputDependencies";

const id = (suffix: number) =>
  `50000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;

describe("eligibility input dependencies", () => {
  it("finds direct and computed field references by stable path", () => {
    const group = {
      children: [{
        id: id(2),
        kind: "CONDITION" as const,
        leftOperand: {
          kind: "COMPUTED" as const,
          leftOperand: {
            key: "eligibility.requested_amount",
            kind: "FIELD" as const,
          },
          operation: "DIVIDE" as const,
          rightOperand: {
            key: "eligibility.annual_turnover",
            kind: "FIELD" as const,
          },
        },
        operator: "LESS_THAN" as never,
        rightOperand: { kind: "CONSTANT" as const, value: 1 },
      }],
      combinator: "AND" as const,
      id: id(1),
      kind: "GROUP" as const,
    };

    expect(conditionGroupReferencesEligibilityInput(
      group,
      "requested_amount",
    )).toBe(true);
    expect(conditionGroupReferencesEligibilityInput(
      group,
      "annual_turnover",
    )).toBe(true);
    expect(conditionGroupReferencesEligibilityInput(group, "employees"))
      .toBe(false);
  });
});
