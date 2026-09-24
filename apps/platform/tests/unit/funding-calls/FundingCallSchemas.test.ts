import { describe, expect, it } from "vitest";

import {
  fundingCallCreateSchema,
  fundingCallGovernanceCommandSchema,
} from "@/modules/funding-calls/api/FundingCallSchemas";

const validInput = {
  closesAt: "2027-03-31T15:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
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
  workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
};

describe("fundingCallCreateSchema", () => {
  it("accepts a draft without version bindings", () => {
    const draftInput: Partial<typeof validInput> = { ...validInput };
    delete draftInput.eligibilityRuleSetVersionId;
    delete draftInput.formVersionId;
    delete draftInput.workflowTemplateVersionId;
    const result = fundingCallCreateSchema.parse({
      ...draftInput,
      fundingInstrument: "",
    });

    expect(result.fundingInstrument).toBeNull();
    expect(result.eligibilitySummary).toBeNull();
    expect(result.eligibilityRuleSetVersionId).toBeNull();
    expect(result.formVersionId).toBeNull();
    expect(result.workflowTemplateVersionId).toBeNull();
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

describe("fundingCallGovernanceCommandSchema", () => {
  it("requires a non-empty reason only when returning for amendment", () => {
    expect(fundingCallGovernanceCommandSchema.safeParse({
      command: "RETURN_FOR_AMENDMENT",
      expectedRowVersion: 2,
      reason: "   ",
    }).success).toBe(false);
    expect(fundingCallGovernanceCommandSchema.safeParse({
      command: "RETURN_FOR_AMENDMENT",
      expectedRowVersion: 2,
      reason: "Add the missing public guidance.",
    }).success).toBe(true);
    expect(fundingCallGovernanceCommandSchema.safeParse({
      command: "APPROVE",
      expectedRowVersion: 2,
    }).success).toBe(true);
  });
});
