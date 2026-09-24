import { describe, expect, it } from "vitest";

import {
  standardEligibilityCriteria,
  standardEligibilityRuleSetCode,
} from "@/modules/eligibility/domain/standard/StandardEligibilityCatalogue";

describe("standard Eligibility baseline", () => {
  it("preserves the fourteen approved matrix decisions as configuration", () => {
    expect(standardEligibilityRuleSetCode).toBe("SME_FUND_BASELINE");
    expect(standardEligibilityCriteria).toHaveLength(14);
    expect(new Set(standardEligibilityCriteria.map((item) => item.stableKey)).size)
      .toBe(14);
    expect(new Set(standardEligibilityCriteria.map((item) => item.reasonCode)).size)
      .toBe(14);
    expect(standardEligibilityCriteria[0]).toMatchObject({
      constant: 51,
      failureType: "HARD_FAIL",
      operator: "GREATER_THAN_OR_EQUAL",
      questionType: "PERCENTAGE",
      stableKey: "namibian_ownership_percentage",
    });
  });

  it("uses Yes/No/NA only for applicable registrations", () => {
    expect(standardEligibilityCriteria[2]).toMatchObject({
      constant: "YES",
      inputType: "TEXT",
      questionType: "YES_NO_NA",
      stableKey: "applicable_registrations_verified",
    });
    expect(standardEligibilityCriteria[3]?.questionType).toBe("BOOLEAN");
    expect(standardEligibilityCriteria[4]?.questionType).toBe("BOOLEAN");
  });
});
