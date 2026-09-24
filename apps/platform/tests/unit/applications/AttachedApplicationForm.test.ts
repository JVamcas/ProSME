import { describe, expect, it } from "vitest";

import {
  attachBusinessFieldsToForm,
  attachedBusinessFieldValues,
  fillMissingAttachedBusinessValues,
  preserveAttachedBusinessValues,
} from "@/modules/applications/domain/AttachedApplicationForm";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

const fundingCallId = "3a37adcb-cf16-43b5-afc1-b6a3f2ad1c61";
const dynamicSectionId = "5d4cb5bc-8d28-43e8-900c-f4632978f630";
const form: FormRuntimeSchema = {
  displayMode: "STEPS",
  fields: [{
    columnSpan: 1,
    key: "PROJECT_TITLE",
    label: "Project title",
    order: 1,
    required: true,
    sectionId: dynamicSectionId,
    type: "TEXT",
  }],
  instructions: null,
  sections: [{
    columnSpan: 2,
    description: "",
    id: dynamicSectionId,
    key: "PROJECT",
    order: 1,
    showContainer: true,
    title: "Project",
  }],
  submitLabel: "Submit",
  versionId: "8f40f1de-1922-4cd7-8293-4e792401579b",
  versionNumber: 1,
};

describe("funding-call application form attachment", () => {
  it("prepends stable business fields without changing the reusable form", () => {
    const attached = attachBusinessFieldsToForm(form, fundingCallId);
    expect(attached.sections.map((section) => section.key)).toEqual([
      "ENTITY_DETAILS",
      "PROJECT",
    ]);
    expect(attached.fields.map((field) => field.key)).toContain("BUSINESS_LEGAL_NAME");
    expect(attached.fields.map((field) => field.key)).toContain("PROJECT_TITLE");
    expect(form.sections.map((section) => section.key)).toEqual(["PROJECT"]);
  });

  it("copies selected business values and rejects edits to copied fields", () => {
    const copied = attachedBusinessFieldValues({
      businessType: "Company",
      employeeCount: 12,
      establishedYear: 2020,
      legalName: "Example Limited",
      physicalAddress: "Windhoek",
      region: "Khomas",
      registrationNumber: "REG-1",
      sector: "Agriculture",
      tradingName: "Example",
    });
    expect(copied.BUSINESS_EMPLOYEE_COUNT).toBe(12);
    expect(fillMissingAttachedBusinessValues({
      PROJECT_TITLE: "Existing project",
    }, {
      businessType: "Company",
      employeeCount: 12,
      establishedYear: 2020,
      legalName: "Example Limited",
      physicalAddress: "Windhoek",
      region: "Khomas",
      registrationNumber: "REG-1",
      sector: "Agriculture",
      tradingName: "Example",
    })).toMatchObject({
      BUSINESS_LEGAL_NAME: "Example Limited",
      PROJECT_TITLE: "Existing project",
    });
    expect(preserveAttachedBusinessValues({
      BUSINESS_LEGAL_NAME: "Tampered",
      PROJECT_TITLE: "Project A",
    }, copied)).toMatchObject({
      BUSINESS_LEGAL_NAME: "Example Limited",
      PROJECT_TITLE: "Project A",
    });
  });
});
