import { describe, expect, it } from "vitest";

import {
  formDefinitionDialogSchema,
  formEditorSchema,
} from "@/modules/forms/api/FormSchemas";
import { createStandardFormDrafts } from "@/modules/forms/domain/StandardFormCatalogue";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";

const expectedCodes = [
  "APPEAL_REVIEW",
  "APPEAL_SUBMISSION",
  "APPROVAL",
  "COMMITTEE_REVIEW",
  "DISBURSEMENT_REVIEW",
  "DUE_DILIGENCE_RISK",
  "EVALUATION_CLOSE_OUT_REVIEW",
  "MODERATION",
  "MONITORING_REVIEW",
  "TECHNICAL_REVIEW",
  "TRANCHE_CLAIM",
];

describe("standard form catalogue", () => {
  it("contains exactly the eleven agreed ready forms", () => {
    const codes = createStandardFormDrafts()
      .map((form) => form.code)
      .sort();

    expect(codes).toEqual(expectedCodes);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("passes the same schema and publication validation as admin forms", () => {
    for (const form of createStandardFormDrafts()) {
      expect(formDefinitionDialogSchema.safeParse(form).success).toBe(true);
      expect(formEditorSchema.safeParse({
        expectedRowVersion: 1,
        fields: form.fields,
        sections: form.sections,
        submitLabel: form.submitLabel,
      }).success).toBe(true);
      expect(formPublicationErrors(
        form.fields,
        form.sections,
        form.submitLabel,
      )).toEqual([]);
    }
  });

  it("keeps deferred repeatable forms out of the seed", () => {
    const codes = new Set(createStandardFormDrafts().map((form) => form.code));

    expect(codes.has("FUNDING_APPLICATION")).toBe(false);
    expect(codes.has("FINANCIAL_REVIEW")).toBe(false);
    expect(codes.has("CONTRACTING")).toBe(false);
    expect(codes.has("PROGRESS_REPORT")).toBe(false);
    expect(codes.has("FINAL_REPORT")).toBe(false);
  });

  it("seeds conditional details as required only while visible", () => {
    const forms = createStandardFormDrafts();
    const conditionalKeys = [
      "ADDITIONAL_VERIFICATION_DETAILS",
      "ADJUSTMENT_JUSTIFICATION",
      "EXPENDITURE_VARIANCE",
      "VARIANCE_EXPLANATION",
      "CORRECTIVE_ACTION_DETAILS",
    ];
    const conditionalFields = forms.flatMap((form) => form.fields)
      .filter((field) => conditionalKeys.includes(field.key));

    expect(conditionalFields.map((field) => field.key).sort()).toEqual(
      [...conditionalKeys].sort(),
    );
    expect(conditionalFields.every((field) => (
      field.required && field.visibilityCondition
    ))).toBe(true);
  });
});
