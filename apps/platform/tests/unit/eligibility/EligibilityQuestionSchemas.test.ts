import { describe, expect, it } from "vitest";

import {
  eligibilityQuestionInputSchema,
} from "@/modules/eligibility/api/EligibilityQuestionSchemas";

describe("eligibility question validation", () => {
  it("accepts the agreed reusable question fields", () => {
    expect(eligibilityQuestionInputSchema.safeParse({
      applicantLabel: "Is the business in good standing with NAMRA?",
      code: "NAMRA_STANDING",
      inputType: "BOOLEAN",
      reviewerLabel: "Is the business in good standing with NAMRA?",
    }).success).toBe(true);
  });

  it("rejects noncanonical codes and unsupported input types", () => {
    expect(eligibilityQuestionInputSchema.safeParse({
      applicantLabel: "Applicant label",
      code: "namra-standing",
      inputType: "SELECT",
      reviewerLabel: "Reviewer label",
    }).success).toBe(false);
  });
});
