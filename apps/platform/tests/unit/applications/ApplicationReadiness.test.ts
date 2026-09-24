import { describe, expect, it } from "vitest";

import {
  evaluateApplicationReadiness,
} from "@/modules/applications/domain/ApplicationReadiness";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import { operator } from "@/modules/conditions/domain/Operator";

const formVersionId = "10000000-0000-4000-8000-000000000001";
const detailsSectionId = "20000000-0000-4000-8000-000000000001";
const documentsSectionId = "20000000-0000-4000-8000-000000000002";
const declarationsSectionId = "20000000-0000-4000-8000-000000000003";
const declarationOptions = [
  { key: "DECLARATION_ACCURACY_CONFIRMATION", value: "CONFIRMED" },
  { key: "DECLARATION_AUTHORITY_CONFIRMATION", value: "CONFIRMED" },
  { key: "DATA_PROCESSING_CONSENT", value: "CONSENT_GRANTED" },
  { key: "VERIFICATION_CONSENT", value: "CONSENT_GRANTED" },
] as const;

const form: FormRuntimeSchema = {
  fields: [
    {
      columnSpan: 1,
      key: "BUSINESS_NAME",
      label: "Business name",
      order: 1,
      required: true,
      sectionId: detailsSectionId,
      type: "TEXT",
    },
    {
      columnSpan: 1,
      key: "HAS_REFERENCE",
      label: "Has reference",
      order: 2,
      required: true,
      sectionId: detailsSectionId,
      type: "YES_NO",
    },
    {
      columnSpan: 1,
      key: "REFERENCE",
      label: "Reference",
      order: 3,
      required: true,
      sectionId: detailsSectionId,
      type: "TEXT",
      visibilityCondition: {
        children: [{
          id: "30000000-0000-4000-8000-000000000001",
          kind: "CONDITION",
          leftOperand: { key: "HAS_REFERENCE", kind: "FIELD" },
          operator: operator("EQUALS"),
          rightOperand: { kind: "CONSTANT", value: true },
        }],
        combinator: "AND",
        id: "30000000-0000-4000-8000-000000000002",
        kind: "GROUP",
      },
    },
    ...declarationOptions.map(({ key, value }, index) => ({
      columnSpan: 1 as const,
      key,
      label: key,
      options: [{ key: value, label: value, order: 1 }],
      order: index + 1,
      required: true,
      sectionId: declarationsSectionId,
      type: "SINGLE_SELECT" as const,
    })),
    {
      columnSpan: 1,
      key: "DECLARANT_NAME",
      label: "Declarant name",
      order: 5,
      required: true,
      sectionId: declarationsSectionId,
      type: "TEXT",
    },
    {
      columnSpan: 1,
      key: "DECLARATION_DATE",
      label: "Declaration date",
      order: 6,
      required: true,
      sectionId: declarationsSectionId,
      type: "DATE",
    },
    {
      columnSpan: 1,
      key: "REGISTRATION_DOCUMENT",
      label: "Registration document",
      order: 1,
      required: true,
      sectionId: documentsSectionId,
      type: "DOCUMENT",
    },
  ],
  instructions: null,
  sections: [
    {
      columnSpan: 1,
      description: "",
      id: detailsSectionId,
      key: "DETAILS",
      order: 1,
      showContainer: true,
      title: "Business details",
    },
    {
      columnSpan: 1,
      description: "",
      id: declarationsSectionId,
      key: "DECLARATIONS_AND_CONSENT",
      order: 3,
      showContainer: true,
      title: "Declarations and consent",
    },
    {
      columnSpan: 1,
      description: "",
      id: documentsSectionId,
      key: "DOCUMENTS",
      order: 2,
      showContainer: true,
      title: "Documents",
    },
  ],
  submitLabel: "Submit",
  versionId: formVersionId,
  versionNumber: 2,
};

function input(): Parameters<typeof evaluateApplicationReadiness>[0] {
  return {
    application: {
      businessId: "40000000-0000-4000-8000-000000000001",
      formVersionId,
      rowVersion: 4,
      status: "draft",
    },
    callOpen: true,
    configurationAvailable: true,
    documents: [{
      contentType: "application/pdf",
      fileName: "registration.pdf",
      requirementKey: "REGISTRATION_DOCUMENT",
      sizeBytes: 100,
      storageStatus: "finalized" as const,
      uploadedAt: "2026-09-23T08:00:00.000Z",
      versionId: "50000000-0000-4000-8000-000000000001",
      versionNumber: 1,
    }],
    evaluatedAt: new Date("2026-09-23T09:00:00.000Z"),
    form,
    response: {
      formVersionId,
      rowVersion: 3,
      values: {
        BUSINESS_NAME: "Example",
        HAS_REFERENCE: false,
        DECLARATION_ACCURACY_CONFIRMATION: "CONFIRMED",
        DECLARATION_AUTHORITY_CONFIRMATION: "CONFIRMED",
        DATA_PROCESSING_CONSENT: "CONSENT_GRANTED",
        VERIFICATION_CONSENT: "CONSENT_GRANTED",
        DECLARANT_NAME: "Applicant",
        DECLARATION_DATE: "2026-09-23",
      },
    },
  };
}

describe("application completeness and submission readiness", () => {
  it("uses the bound form and ignores hidden required fields", () => {
    const readiness = evaluateApplicationReadiness(input());
    expect(readiness.ready).toBe(true);
    expect(readiness.formVersionId).toBe(formVersionId);
    expect(readiness.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "DETAILS", percent: 100, ready: true }),
      expect.objectContaining({ key: "DOCUMENTS", percent: 100, ready: true }),
    ]));
  });

  it.each(["pending", "failed", "abandoned"] as const)(
    "blocks a mandatory document with %s storage",
    (storageStatus) => {
      const candidate = input();
      candidate.documents[0] = {
        ...candidate.documents[0],
        storageStatus,
      };
      const readiness = evaluateApplicationReadiness(candidate);
      expect(readiness.ready).toBe(false);
      expect(readiness.blockers).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "DOCUMENT_PENDING",
          requirementKey: "REGISTRATION_DOCUMENT",
        }),
      ]));
    },
  );

  it("returns safe blocker codes and messages without condition expressions", () => {
    const candidate = input();
    candidate.response.values = {
      ...candidate.response.values,
      BUSINESS_NAME: "",
      HAS_REFERENCE: true,
    };
    candidate.documents = [];
    candidate.callOpen = false;
    candidate.configurationAvailable = false;
    const readiness = evaluateApplicationReadiness(candidate);
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.map((blocker) => blocker.code)).toEqual(
      expect.arrayContaining([
        "SECTION_INCOMPLETE",
        "DOCUMENT_MISSING",
        "SUBMISSION_WINDOW_CLOSED",
        "CONFIGURATION_UNAVAILABLE",
      ]),
    );
    expect(JSON.stringify(readiness)).not.toContain("leftOperand");
    expect(JSON.stringify(readiness)).not.toContain("rightOperand");
  });

  it("requires current declarations and a selected business", () => {
    const candidate = input();
    candidate.application.businessId = null;
    delete candidate.response.values.DECLARATION_ACCURACY_CONFIRMATION;
    const readiness = evaluateApplicationReadiness(candidate);
    expect(readiness.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "BUSINESS_REQUIRED" }),
      expect.objectContaining({ code: "DECLARATIONS_REQUIRED" }),
    ]));
  });
});
