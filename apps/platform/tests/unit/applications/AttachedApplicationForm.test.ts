import { describe, expect, it } from "vitest";

import {
  attachBusinessFieldsToForm,
  attachedBusinessFieldValues,
  fillMissingAttachedBusinessValues,
  preserveAttachedBusinessValues,
  needsAttachedBusinessValues,
} from "@/modules/applications/domain/AttachedApplicationForm";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import { validateFormValues } from "@/modules/forms/FormValidation";

const fundingCallId = "3a37adcb-cf16-43b5-afc1-b6a3f2ad1c61";
const dynamicSectionId = "5d4cb5bc-8d28-43e8-900c-f4632978f630";
const form: FormRuntimeSchema = {
  displayMode: "STEPS",
  fields: [
    {
      columnSpan: 1,
      key: "PROJECT_TITLE",
      label: "Project title",
      order: 1,
      required: true,
      sectionId: dynamicSectionId,
      type: "TEXT",
    },
  ],
  instructions: null,
  sections: [
    {
      columnSpan: 2,
      description: "",
      id: dynamicSectionId,
      key: "PROJECT",
      order: 1,
      showContainer: true,
      title: "Project",
    },
  ],
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
    expect(attached.fields.map((field) => field.key)).toContain(
      "BUSINESS_LEGAL_NAME",
    );
    expect(attached.fields.map((field) => field.key)).toContain(
      "PROJECT_TITLE",
    );
    for (const key of [
      "BUSINESS_APPLICANT_POSITION",
      "BUSINESS_MEMBERS",
      "BUSINESS_REGISTRATION_NUMBER",
      "BUSINESS_TRADING_NAME",
      "BUSINESS_EMPLOYEE_COUNT",
      "BUSINESS_ESTABLISHED_YEAR",
    ]) {
      expect(attached.fields.find((field) => field.key === key)?.required).toBe(
        true,
      );
    }
    expect(form.sections.map((section) => section.key)).toEqual(["PROJECT"]);
  });

  it("copies selected business values and rejects edits to copied fields", () => {
    const copied = attachedBusinessFieldValues({
      applicantPosition: "Director",
      members: [
        {
          fullName: "Synthetic Member",
          idNumber: "TEST-123",
          role: "Principal",
        },
      ],
      businessType: "Company",
      employeeCount: 12,
      establishedYear: 2020,
      legalName: "Example Limited",
      physicalAddress: "Windhoek",
      region: "Khomas",
      registrationNumber: "REG-1",
      sector: "Agriculture",
      secondarySector: "Circular economy",
      tradingName: "Example",
    });
    expect(copied.BUSINESS_APPLICANT_POSITION).toBe("Director");
    expect(copied.BUSINESS_MEMBERS).toEqual([
      { fullName: "Synthetic Member", idNumber: "TEST-123", role: "Principal" },
    ]);
    expect(copied.BUSINESS_EMPLOYEE_COUNT).toBe(12);
    expect(copied.BUSINESS_SECONDARY_SECTOR).toBe("Circular economy");
    expect(
      fillMissingAttachedBusinessValues(
        {
          PROJECT_TITLE: "Existing project",
        },
        {
          applicantPosition: "Director",
          members: [
            {
              fullName: "Synthetic Member",
              idNumber: "TEST-123",
              role: "Principal",
            },
          ],
          businessType: "Company",
          employeeCount: 12,
          establishedYear: 2020,
          legalName: "Example Limited",
          physicalAddress: "Windhoek",
          region: "Khomas",
          registrationNumber: "REG-1",
          sector: "Agriculture",
          tradingName: "Example",
        },
      ),
    ).toMatchObject({
      BUSINESS_LEGAL_NAME: "Example Limited",
      PROJECT_TITLE: "Existing project",
    });
    expect(
      preserveAttachedBusinessValues(
        {
          BUSINESS_APPLICANT_POSITION: "Tampered position",
          BUSINESS_MEMBERS: [],
          BUSINESS_LEGAL_NAME: "Tampered",
          BUSINESS_SECONDARY_SECTOR: "Tampered secondary",
          PROJECT_TITLE: "Project A",
        },
        copied,
      ),
    ).toMatchObject({
      BUSINESS_APPLICANT_POSITION: "Director",
      BUSINESS_MEMBERS: copied.BUSINESS_MEMBERS,
      BUSINESS_LEGAL_NAME: "Example Limited",
      BUSINESS_SECONDARY_SECTOR: "Circular economy",
      PROJECT_TITLE: "Project A",
    });
  });

  it("requires all four business details when validating an application", () => {
    const attached = attachBusinessFieldsToForm(form, fundingCallId);
    const values: Record<string, unknown> = {
      ...attachedBusinessFieldValues({
        applicantPosition: "Director",
        members: [
          {
            fullName: "Synthetic Member",
            idNumber: "TEST-123",
            role: "Principal",
          },
        ],
        businessType: "Company",
        employeeCount: 0,
        establishedYear: 2020,
        legalName: "Example Limited",
        physicalAddress: "Windhoek",
        region: "Khomas",
        registrationNumber: "REG-1",
        sector: "Agriculture",
        tradingName: "Example",
      }),
      PROJECT_TITLE: "Project A",
    };
    expect(validateFormValues(attached.fields, values, true)).toBe(true);
    expect(
      attached.fields.find((field) => field.key === "BUSINESS_SECONDARY_SECTOR")
        ?.required,
    ).toBe(false);
    expect(
      validateFormValues(
        attached.fields,
        { ...values, BUSINESS_SECONDARY_SECTOR: "Blue economy" },
        true,
      ),
    ).toBe(true);
    for (const key of [
      "BUSINESS_APPLICANT_POSITION",
      "BUSINESS_MEMBERS",
      "BUSINESS_REGISTRATION_NUMBER",
      "BUSINESS_TRADING_NAME",
      "BUSINESS_EMPLOYEE_COUNT",
      "BUSINESS_ESTABLISHED_YEAR",
    ]) {
      const incomplete = { ...values };
      delete incomplete[key];
      expect(validateFormValues(attached.fields, incomplete, true)).toBe(false);
    }
  });
});

it("fills newly required fields in legacy drafts without replacing existing entity answers", () => {
  const stored = {
    BUSINESS_LEGAL_NAME: "Original name",
    BUSINESS_APPLICANT_POSITION: "",
    BUSINESS_MEMBERS: [],
  };
  expect(needsAttachedBusinessValues(stored)).toBe(true);
  const business = {
    applicantPosition: "Director",
    members: [
      {
        fullName: "Synthetic Member",
        idNumber: "TEST-123",
        role: "Both" as const,
      },
    ],
    businessType: "Company",
    employeeCount: 1,
    establishedYear: 2020,
    legalName: "Changed name",
    physicalAddress: "Test address",
    region: "Khomas",
    registrationNumber: "TEST-REG",
    sector: "Blue economy",
    tradingName: "Test",
  };
  const filled = fillMissingAttachedBusinessValues(stored, business);
  expect(filled.BUSINESS_LEGAL_NAME).toBe("Original name");
  expect(filled.BUSINESS_APPLICANT_POSITION).toBe("Director");
  expect(filled.BUSINESS_MEMBERS).toEqual(business.members);
  expect(needsAttachedBusinessValues(filled)).toBe(false);
  expect(
    fillMissingAttachedBusinessValues(filled, {
      ...business,
      applicantPosition: "Changed",
      members: [],
    }),
  ).toEqual(filled);
});
