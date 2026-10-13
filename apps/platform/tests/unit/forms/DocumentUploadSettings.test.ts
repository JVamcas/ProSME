import { describe, expect, it } from "vitest";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { documentFieldConfiguration } from "@/modules/forms/domain/FormDocumentConfiguration";
import { formDocumentRequirement } from "@/modules/workflows/domain/definitions/FormDocumentRequirement";
import { applicationDocumentRequirements } from "@/modules/applications/domain/ApplicationDocumentPolicy";
import { validateFormValues } from "@/modules/forms/FormValidation";
import { parseFormDefinition } from "@/modules/forms/engine/FormDefinitionParser";
import { runtimeDefinition } from "../../support/form-runtime";
import type { FormField } from "@/modules/forms/FormTypes";

const definition = runtimeDefinition();
const field: FormField = {
  key: "DOCUMENT_FIELD",
  label: "Evidence",
  type: "DOCUMENT",
  order: 1,
  sectionId: definition.sections[0].id!,
  columnSpan: 1,
  required: true,
  uploadedBy: "ANY",
  acceptedExtensions: [".pdf"],
  maximumFileSizeMb: 4,
  maxPages: 3,
};

describe("standard document settings", () => {
  it.each(["APPLICANT", "ANY", "ASSIGNED_REVIEWER"] as const)(
    "accepts %s as the uploader",
    (uploadedBy) => {
      expect(formFieldSchema.safeParse({ ...field, uploadedBy }).success).toBe(
        true,
      );
    },
  );
  it("rejects staff as a new uploader choice and settings on non-document fields", () => {
    expect(
      formFieldSchema.safeParse({ ...field, uploadedBy: "STAFF" }).success,
    ).toBe(false);
    expect(formFieldSchema.safeParse({ ...field, type: "TEXT" }).success).toBe(
      false,
    );
  });
  it("uses standard limits while preserving the key for existing evidence", () => {
    const configured: FormField = {
      ...field,
      workflowDocument: {
        stableKey: "OLD_EVIDENCE",
        acceptedFileTypes: ["DOCX"],
        maximumSizeMb: 20,
        uploader: "STAFF",
        verifier: "STAFF",
        expiryDays: 10,
        requestOnStageActivation: true,
        templateReference: "Old template",
      },
    };
    expect(formDocumentRequirement(configured)).toMatchObject({
      stableKey: "OLD_EVIDENCE",
      acceptedFileTypes: ["PDF"],
      acceptedExtensions: [".pdf"],
      maximumSizeMb: 4,
      maxPages: 3,
      uploader: "ANY",
      expiryDays: null,
      requestOnStageActivation: false,
      templateReference: "",
    });
    expect(
      documentFieldConfiguration({
        ...configured,
        maximumFileSizeMb: undefined,
      }).maximumFileSizeMb,
    ).toBe(10);
  });
  it("renders task documents without a workflow-evidence toggle and accepts resolved evidence IDs", () => {
    const form = { ...definition, fields: [field] };
    const parsed = parseFormDefinition(form, {}, true);
    expect(parsed.uiSchema.DOCUMENT_FIELD["ui:widget"]).toBe(
      "workflowDocument",
    );
    expect(
      parsed.uiSchema.DOCUMENT_FIELD["ui:options"].requirement,
    ).toMatchObject({
      maximumSizeMb: 4,
      maxPages: 3,
      uploader: "ANY",
    });
    expect(
      validateFormValues(
        [field],
        { DOCUMENT_FIELD: "stored-evidence-version" },
        true,
      ),
    ).toBe(true);
  });
  it.each(["APPLICANT", "ANY", "ASSIGNED_REVIEWER"] as const)(
    "enforces %s on the applicant document register",
    (uploadedBy) => {
      const requirements = applicationDocumentRequirements(
        { ...definition, fields: [{ ...field, uploadedBy }] },
        {},
      );
      expect(requirements[0].editable).toBe(uploadedBy !== "ASSIGNED_REVIEWER");
    },
  );
});
