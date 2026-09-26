import { describe, expect, it } from "vitest";

import { applicationWithdrawalSchema } from "@/modules/applications/api/ApplicationWithdrawalSchemas";

describe("application withdrawal input", () => {
  it("requires a free-text reason and trims it", () => {
    expect(applicationWithdrawalSchema.parse({
      confirmed: true,
      reason: "  Business is closing.  ",
    }).reason).toBe("Business is closing.");

    expect(applicationWithdrawalSchema.safeParse({
      confirmed: true,
      reason: "   ",
    }).success).toBe(false);
  });

  it("does not accept the former reason code or comment fields", () => {
    expect(applicationWithdrawalSchema.safeParse({
      confirmed: true,
      reason: "Business is closing.",
      reasonCode: "OTHER",
    }).success).toBe(false);
  });
});
