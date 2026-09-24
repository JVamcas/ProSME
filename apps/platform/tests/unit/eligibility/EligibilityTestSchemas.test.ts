import { describe, expect, it } from "vitest";

import { eligibilityTestSchema } from "@/modules/eligibility/api/EligibilityTestSchemas";

const validInput = {
  fundingCallId: "91000000-0000-4000-8000-000000000002",
  mode: "SELF_CHECK",
  values: {
    eligibility: { employee_count: 2 },
  },
  versionId: "91000000-0000-4000-8000-000000000001",
};

describe("eligibility test schema", () => {
  it("accepts complete sample data for a non-authoritative test", () => {
    expect(eligibilityTestSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects unsupported execution modes", () => {
    expect(eligibilityTestSchema.safeParse({
      ...validInput,
      mode: "BOTH",
    }).success).toBe(false);
  });
});
