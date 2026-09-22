import { describe, expect, it } from "vitest";

import { eligibilityInputCreateSchema } from "@/modules/eligibility/api/EligibilityInputSchemas";
import type { EligibilityInputCreateInput } from "@/modules/eligibility/api/EligibilityInputSchemas";

const sourceId = "50000000-0000-4000-8000-000000000001";
const sourceVersionId = "50000000-0000-4000-8000-000000000002";

function validInput(): EligibilityInputCreateInput {
  return {
    availableIn: ["SELF_CHECK", "SCREENING"],
    expectedRowVersion: 1,
    groupKey: "business",
    groupLabel: "Business",
    label: "Employee count",
    order: 1,
    screening: {
      sourceDefinitionId: sourceId,
      sourceKey: "employee_count",
      sourceKind: "APPLICATION_FORM_FIELD",
      sourceVersionId,
      valuePath: "value",
    },
    selfCheck: {
      answerType: "NUMBER",
      explanation: "Use the current employee count.",
      helpText: "Enter a whole number.",
      options: [],
      prompt: "How many people does the business employ?",
      required: true,
    },
    stableKey: "employee_count",
    type: "NUMBER",
  };
}

describe("eligibility input schemas", () => {
  it("accepts independent Self Check and Screening configuration", () => {
    expect(eligibilityInputCreateSchema.safeParse(validInput()).success)
      .toBe(true);
  });

  it("requires configuration for every advertised execution mode", () => {
    const input = validInput();
    input.selfCheck = null;

    const result = eligibilityInputCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "Self Check availability and question configuration must match.",
    );
  });

  it("rejects duplicate modes and unversioned version-owned sources", () => {
    const input = validInput();
    input.availableIn = ["SCREENING", "SCREENING"];
    input.selfCheck = null;
    input.screening!.sourceVersionId = null;

    const result = eligibilityInputCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Execution modes must be unique.",
        "This Screening source requires an exact source version.",
      ]),
    );
  });

  it("keeps optional groups paired and validates select options", () => {
    const input = validInput();
    input.groupLabel = null;
    input.selfCheck!.answerType = "SINGLE_SELECT";
    input.selfCheck!.options = [{ label: "One", value: "one" }];

    const result = eligibilityInputCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Input group key and label must be supplied together.",
        "Select questions require at least two options.",
      ]),
    );
  });

  it("requires the public response type to match the condition input type", () => {
    const input = validInput();
    input.selfCheck!.answerType = "YES_NO_NA";

    const result = eligibilityInputCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "The Self Check answer type must match the input data type.",
    );
  });

  it("accepts percentage questions for numeric inputs", () => {
    const input = validInput();
    input.selfCheck!.answerType = "PERCENTAGE";

    expect(eligibilityInputCreateSchema.safeParse(input).success).toBe(true);
  });
});
