import { describe, expect, it } from "vitest";

import {
  formDefinitionDialogSchema,
  formEditorSchema,
} from "@/modules/forms/api/FormSchemas";
import { createStandardForms } from "@/modules/forms/domain/StandardFormCatalogue";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";

const expectedCodes = [
  "APPEAL_REVIEW",
  "APPEAL_SUBMISSION",
  "APPROVAL",
  "COMMITTEE_REVIEW",
  "DISBURSEMENT_REVIEW",
  "DUE_DILIGENCE_RISK",
  "ELIGIBILITY_VERIFICATION",
  "EVALUATION_CLOSE_OUT_REVIEW",
  "FUNDING_APPLICATION",
  "MODERATION",
  "MONITORING_REVIEW",
  "TECHNICAL_REVIEW",
  "TRANCHE_CLAIM",
];

describe("standard form catalogue", () => {
  it("contains the agreed ready forms", () => {
    const codes = createStandardForms()
      .map((form) => form.code)
      .sort();

    expect(codes).toEqual(expectedCodes);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("classifies the funding application separately from review tasks", () => {
    const forms = createStandardForms();
    expect(forms.find((form) => form.code === "FUNDING_APPLICATION")?.purpose)
      .toBe("FUNDING_APPLICATION");
    expect(forms.find((form) => form.code === "TECHNICAL_REVIEW")?.purpose)
      .toBe("APPLICATION_REVIEW");
    expect(forms.find((form) => form.code === "APPEAL_SUBMISSION")?.purpose)
      .toBe("OTHER");
  });

  it("passes the same schema and publication validation as admin forms", () => {
    for (const form of createStandardForms()) {
      expect(formDefinitionDialogSchema.safeParse(form).success).toBe(true);
      expect(
        formEditorSchema.safeParse({
          expectedRowVersion: 1,
          fields: form.fields,
          sections: form.sections,
          submitLabel: form.submitLabel,
        }).success,
      ).toBe(true);
      expect(
        formPublicationErrors(form.fields, form.sections, form.submitLabel),
      ).toEqual([]);
    }
  });

  it("keeps deferred repeatable forms out of the seed", () => {
    const codes = new Set(createStandardForms().map((form) => form.code));

    expect(codes.has("FINANCIAL_REVIEW")).toBe(false);
    expect(codes.has("CONTRACTING")).toBe(false);
    expect(codes.has("PROGRESS_REPORT")).toBe(false);
    expect(codes.has("FINAL_REPORT")).toBe(false);
  });

  it("seeds conditional details as required only while visible", () => {
    const forms = createStandardForms();
    const conditionalKeys = [
      "ADDITIONAL_VERIFICATION_DETAILS",
      "ADJUSTMENT_JUSTIFICATION",
      "EXPENDITURE_VARIANCE",
      "VARIANCE_EXPLANATION",
      "CORRECTIVE_ACTION_DETAILS",
    ];
    const conditionalFields = forms
      .flatMap((form) => form.fields)
      .filter((field) => conditionalKeys.includes(field.key));

    expect(conditionalFields.map((field) => field.key).sort()).toEqual(
      [...conditionalKeys].sort(),
    );
    expect(
      conditionalFields.every(
        (field) => field.required && field.visibilityCondition,
      ),
    ).toBe(true);
  });

  it("defines a published reusable funding application with stable keys", () => {
    const first = createStandardForms().find(
      (form) => form.code === "FUNDING_APPLICATION",
    );
    const second = createStandardForms().find(
      (form) => form.code === "FUNDING_APPLICATION",
    );
    expect(first?.publishOnSeed).toBe(true);
    expect(first?.submitLabel).toBe("Submit application");
    expect(first?.sections.map((section) => section.key)).toEqual([
      "REGISTRATION_AND_TAX",
      "PROJECT",
      "BUDGET_AND_COFUNDING",
      "TEAM",
      "RESULTS_AND_INDICATORS",
      "DECLARATIONS_AND_CONSENT",
    ]);
    expect(first?.fields.map((field) => field.key)).toEqual(
      second?.fields.map((field) => field.key),
    );
    expect(first?.fields.map((field) => field.key)).toEqual(
      expect.arrayContaining([
        "PROJECT_TITLE",
        "PROJECT_ABSTRACT",
        "PROJECT_OBJECTIVES",
        "PROJECT_DURATION_MONTHS",
        "REQUESTED_GRANT_AMOUNT",
        "BUDGET_BREAKDOWN",
        "APPLICANT_COFUNDING_AMOUNT",
        "TEAM_CV_DOCUMENT",
        "PRIMARY_INDICATOR",
        "PRIMARY_INDICATOR_BASELINE",
        "PRIMARY_INDICATOR_TARGET",
        "DECLARATION_ACCURACY_CONFIRMATION",
        "DATA_PROCESSING_CONSENT",
      ]),
    );
  });

  it("keeps eligibility reviewer questions out of the workflow template", () => {
    const form = createStandardForms().find(
      (item) => item.code === "ELIGIBILITY_VERIFICATION",
    );

    expect(form?.publishOnSeed).toBe(true);
    expect(form?.fields).toEqual([
      expect.objectContaining({
        key: "RULESET_CONFIGURATION",
        required: false,
        type: "TEXT",
      }),
    ]);
  });
});
