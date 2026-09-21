import { describe, expect, it } from "vitest";

import { fundingCallCreateSchema } from "@/modules/funding-calls/api/FundingCallSchemas";

const validInput = {
  closesAt: "2027-03-31T15:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  formVersionId: "20000000-0000-4000-8000-000000000001",
  fundingInstrument: "Grant",
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: "2027-02-01T06:00:00.000Z",
  publicContactEmail: "funding@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: "+264 61 000 0000",
  reference: "SME-2027-01",
  slug: "sme-growth-fund-2027",
  thematicArea: "Business growth",
  title: "SME Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
};

describe("fundingCallCreateSchema", () => {
  it("accepts a valid funding call and normalizes blank optional fields", () => {
    const result = fundingCallCreateSchema.parse({
      ...validInput,
      fundingInstrument: "",
    });

    expect(result.fundingInstrument).toBeNull();
  });

  it("requires the closing date to follow the opening date", () => {
    const result = fundingCallCreateSchema.safeParse({
      ...validInput,
      closesAt: validInput.opensAt,
    });

    expect(result.success).toBe(false);
  });

  it("requires the budget envelope to cover the maximum grant", () => {
    const result = fundingCallCreateSchema.safeParse({
      ...validInput,
      totalBudgetEnvelope: "100000.00",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a rich-text description without readable content", () => {
    const result = fundingCallCreateSchema.safeParse({
      ...validInput,
      description: "<p></p>",
    });

    expect(result.success).toBe(false);
  });
});
