import { describe, expect, it } from "vitest";

import { eligibilityTestSchema } from "@/modules/eligibility/api/EligibilityTestSchemas";

const validInput = {
  mode: "SELF_CHECK",
  values: {
    application: {
      annual_turnover: 100_000,
      business: {
        bank_account_active: true,
        employee_count: 2,
        operating_months: 12,
        ownership_percentage: 80,
        registered: true,
        statutory_good_standing: true,
      },
      requested_amount: 50_000,
    },
    fundingCall: { maximum_grant_amount: 200_000 },
  },
  versionId: "91000000-0000-4000-8000-000000000001",
};

describe("eligibility test schema", () => {
  it("accepts complete sample data for a non-authoritative test", () => {
    expect(eligibilityTestSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects invalid sample values and unsupported execution modes", () => {
    expect(eligibilityTestSchema.safeParse({
      ...validInput,
      mode: "BOTH",
      values: {
        ...validInput.values,
        application: {
          ...validInput.values.application,
          business: {
            ...validInput.values.application.business,
            ownership_percentage: 101,
          },
        },
      },
    }).success).toBe(false);
  });
});
