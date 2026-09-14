import { describe, expect, it } from "vitest";

import {
  applicationFinancialSectionSchema,
  applicationProjectSectionSchema,
  updateApplicationSchema,
} from "@/modules/applications/ApplicationSchemas";

describe("application draft validation", () => {
  it("allows incomplete data to be saved without marking a section complete", () => {
    expect(
      updateApplicationSchema.safeParse({
        data: {},
        expectedRowVersion: 1,
        intent: "save",
        section: "business",
      }).success,
    ).toBe(true);
  });

  it("requires every field before continuing from a section", () => {
    const result = updateApplicationSchema.safeParse({
      data: {},
      expectedRowVersion: 1,
      intent: "continue",
      section: "business",
    });
    expect(result.success).toBe(false);
  });

  it("rejects project dates in reverse order", () => {
    expect(
      applicationProjectSectionSchema.safeParse({
        projectEndDate: "2026-10-01",
        projectStartDate: "2026-11-01",
        projectSummary:
          "A sufficiently detailed project summary for validation.",
        projectTitle: "Expansion",
      }).success,
    ).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(
      applicationProjectSectionSchema.safeParse({
        projectEndDate: "2026-12-01",
        projectStartDate: "2026-99-99",
        projectSummary:
          "A sufficiently detailed project summary for validation.",
        projectTitle: "Expansion",
      }).success,
    ).toBe(false);
  });

  it("rejects requests and budget totals above project cost", () => {
    const result = applicationFinancialSectionSchema.safeParse({
      amountRequested: 120,
      applicantContribution: 0,
      budgetBreakdown: [
        { amount: 110, category: "Equipment", description: "Tools" },
      ],
      otherFundingSources: "",
      totalProjectCost: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["amountRequested", "budgetBreakdown"]),
      );
    }
  });
});
