import { describe, expect, it } from "vitest";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { applicationDocumentRequirements } from "@/modules/applications/domain/ApplicationDocumentPolicy";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

const sectionId = "20000000-0000-4000-8000-000000000001";
const field = {
  sectionId,
  key: "DOCUMENT",
  label: "Document",
  columnSpan: 1,
  type: "DOCUMENT",
  required: true,
  order: 1,
};

function requirements(acceptedExtensions?: string[]) {
  const parsed = formFieldSchema.parse({ ...field, acceptedExtensions });
  const form: FormRuntimeSchema = {
    versionId: sectionId,
    versionNumber: 1,
    instructions: null,
    submitLabel: "Submit",
    fields: [parsed],
    sections: [
      {
        id: sectionId,
        key: "DOCUMENTS",
        title: "Documents",
        description: "",
        columnSpan: 1,
        showContainer: true,
        order: 1,
      },
    ],
  };
  return applicationDocumentRequirements(form, {});
}

describe("allowed document formats", () => {
  it("projects the selected formats into upload requirements", () => {
    expect(
      requirements([".docx", ".xls", ".xlsx", ".txt", ".csv"])[0]
        .acceptedExtensions,
    ).toEqual([".docx", ".xls", ".xlsx", ".txt", ".csv"]);
  });

  it("preserves the legacy default for unconfigured fields", () => {
    expect(requirements()[0].acceptedExtensions).toEqual([
      ".docx",
      ".jpeg",
      ".jpg",
      ".pdf",
      ".png",
    ]);
  });

  it.each(
    [[], [".exe"], [".pdf", ".pdf"]].map((acceptedExtensions) => ({
      acceptedExtensions,
    })),
  )("rejects invalid selections %j", ({ acceptedExtensions }) => {
    expect(
      formFieldSchema.safeParse({ ...field, acceptedExtensions }).success,
    ).toBe(false);
  });

  it("requires only PDF when a page limit is configured", () => {
    expect(
      formFieldSchema.safeParse({
        ...field,
        maxPages: 5,
        acceptedExtensions: [".pdf"],
      }).success,
    ).toBe(true);
    expect(
      formFieldSchema.safeParse({
        ...field,
        maxPages: 5,
        acceptedExtensions: [".pdf", ".docx"],
      }).success,
    ).toBe(false);
  });

  it("rejects file type configuration for non-document fields", () => {
    expect(
      formFieldSchema.safeParse({
        ...field,
        type: "TEXT",
        acceptedExtensions: [".txt"],
      }).success,
    ).toBe(false);
  });
});
