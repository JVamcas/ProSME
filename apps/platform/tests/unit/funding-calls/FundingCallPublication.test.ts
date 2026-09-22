import { describe, expect, it } from "vitest";

import { captureFundingCallPublication } from "@/modules/funding-calls/domain/FundingCallPublication";

describe("funding call publication snapshot", () => {
  it("captures exact public content, bindings, dates, and documents", () => {
    const call = {
      closesAt: new Date("2027-03-31T15:00:00.000Z"),
      createdAt: new Date("2026-09-20T08:00:00.000Z"),
      createdBy: "10000000-0000-4000-8000-000000000001",
      description: "Growth funding for qualifying SMEs.",
      eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
      eligibilitySummary: "Registered Namibian SMEs may qualify.",
      formVersionId: "20000000-0000-4000-8000-000000000001",
      fundingInstrument: "Grant",
      id: "00000000-0000-4000-8000-000000000042",
      maximumGrantAmount: "500000.00",
      minimumGrantAmount: "50000.00",
      opensAt: new Date("2027-02-01T06:00:00.000Z"),
      publicContactEmail: "funding@example.test",
      publicContactName: "SME Fund",
      publicContactPhone: null,
      reference: "SME-2027-01",
      rowVersion: 4,
      slug: "sme-growth-fund-2027",
      status: "APPROVED" as const,
      suspendedFromStatus: null,
      thematicArea: "Business growth",
      title: "SME Growth Fund 2027",
      totalBudgetEnvelope: "10000000.00",
      updatedAt: new Date("2026-09-21T08:00:00.000Z"),
      updatedBy: "10000000-0000-4000-8000-000000000002",
      workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
    };
    const publicDocuments = [
      { label: "Funding guide", url: "/documents/funding-guide.pdf" },
    ];

    expect(captureFundingCallPublication(call, publicDocuments)).toMatchObject({
      closesAt: "2027-03-31T15:00:00.000Z",
      eligibilityRuleSetVersionId: call.eligibilityRuleSetVersionId,
      formVersionId: call.formVersionId,
      opensAt: "2027-02-01T06:00:00.000Z",
      publicDocuments,
      workflowTemplateVersionId: call.workflowTemplateVersionId,
    });
  });
});

