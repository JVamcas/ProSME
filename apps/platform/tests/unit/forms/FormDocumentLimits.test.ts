import { describe, expect, it } from "vitest";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { applicationDocumentRequirements } from "@/modules/applications/domain/ApplicationDocumentPolicy";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

const sectionId = "20000000-0000-4000-8000-000000000001";
const field = {
  columnSpan: 1,
  sectionId,
  key: "PITCH_DECK",
  label: "Pitch Deck",
  type: "DOCUMENT",
  required: true,
  order: 1,
};

describe("document field limits", () => {
  it.each([5, 12])(
    "preserves a %i page limit in the runtime requirement",
    (maxPages) => {
      const parsed = formFieldSchema.parse({
        ...field,
        maxPages,
        maximumFileSizeMb: 3,
      });
      const form: FormRuntimeSchema = {
        versionId: sectionId,
        versionNumber: 1,
        instructions: null,
        submitLabel: "Submit",
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
        fields: [parsed],
      };
      expect(applicationDocumentRequirements(form, {})).toMatchObject([
        {
          maxPages,
          maximumBytes: 3 * 1024 * 1024,
          acceptedExtensions: [".pdf"],
        },
      ]);
    },
  );

  it.each([0, -1, 1.5])("rejects an invalid page limit %s", (maxPages) => {
    expect(formFieldSchema.safeParse({ ...field, maxPages }).success).toBe(
      false,
    );
  });

  it.each([0, 11, 1.5])(
    "rejects an invalid size limit %s",
    (maximumFileSizeMb) => {
      expect(
        formFieldSchema.safeParse({ ...field, maximumFileSizeMb }).success,
      ).toBe(false);
    },
  );

  it("rejects document limits on other field types", () => {
    expect(
      formFieldSchema.safeParse({ ...field, type: "TEXT", maxPages: 5 })
        .success,
    ).toBe(false);
  });

  it("allows blank limits for backwards compatibility", () => {
    expect(
      formFieldSchema.parse({ ...field, maxPages: "", maximumFileSizeMb: "" }),
    ).toMatchObject({ maxPages: undefined, maximumFileSizeMb: undefined });
  });
});
