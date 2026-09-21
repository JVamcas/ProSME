import { describe, expect, it } from "vitest";

import {
  eligibilityFieldsForBoundForms,
  eligibilityFieldsFromForm,
  fundingCallEligibilityFields,
} from "@/modules/eligibility/domain/EligibilityConditionFields";
import type { FormField } from "@/modules/forms/FormTypes";

function field(key: string, type: FormField["type"]): FormField {
  return {
    columnSpan: 1,
    key,
    label: key,
    order: 1,
    required: false,
    sectionId: "section",
    type,
  };
}

describe("eligibility condition fields", () => {
  it("derives application fields from the bound form's stable keys", () => {
    expect(eligibilityFieldsFromForm([
      field("REQUESTED_AMOUNT", "CURRENCY"),
      field("REGISTRATION_DATE", "DATE"),
      field("IS_REGISTERED", "YES_NO"),
      field("SUPPORTING_DOCUMENT", "DOCUMENT"),
    ])).toEqual([
      {
        key: "application.REQUESTED_AMOUNT",
        label: "REQUESTED_AMOUNT",
        type: "NUMBER",
      },
      {
        key: "application.REGISTRATION_DATE",
        label: "REGISTRATION_DATE",
        type: "DATE",
      },
      {
        key: "application.IS_REGISTERED",
        label: "IS_REGISTERED",
        type: "BOOLEAN",
      },
    ]);
  });

  it("exposes no fields until a ruleset is bound to a funding call", () => {
    expect(eligibilityFieldsForBoundForms([])).toEqual([]);
  });

  it("exposes funding-call fields without inventing application fields", () => {
    expect(eligibilityFieldsForBoundForms([[]])).toEqual(
      fundingCallEligibilityFields,
    );
  });

  it("keeps only application fields common to every bound form", () => {
    const fields = eligibilityFieldsForBoundForms([
      [field("COMMON", "NUMBER"), field("FIRST_ONLY", "TEXT")],
      [field("COMMON", "NUMBER"), field("SECOND_ONLY", "TEXT")],
    ]);

    expect(fields.map((item) => item.key)).toEqual([
      "application.COMMON",
      ...fundingCallEligibilityFields.map((item) => item.key),
    ]);
  });
});
