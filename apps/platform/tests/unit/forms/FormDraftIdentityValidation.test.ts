import { describe, expect, it } from "vitest";
import { formEditorSchema } from "@/modules/forms/api/FormSchemas";

const section = {
  id: "a0000000-0000-4000-8000-000000000001",
  key: "ONE",
  title: "One",
  description: "",
  order: 1,
  columnSpan: 3,
  showContainer: true,
};
const field = {
  id: "a0000000-0000-4000-8000-000000000002",
  key: "FIELD",
  label: "Field",
  sectionId: section.id,
  columnSpan: 1,
  type: "TEXT",
  order: 1,
  required: false,
};
const input = {
  expectedRowVersion: 1,
  submitLabel: "Save",
  fields: [field],
  sections: [section],
};

describe("incremental draft record identity validation", () => {
  it.each(["fields", "sections"] as const)(
    "rejects duplicate %s IDs with otherwise different keys and orders",
    (path) => {
      const existing = input[path][0];
      const result = formEditorSchema.safeParse({
        ...input,
        [path]: [existing, { ...existing, key: "DIFFERENT", order: 2 }],
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: [path],
            message: "Record IDs must be unique within a form version.",
          }),
        );
    },
  );
  it("accepts distinct persisted IDs and multiple new fields awaiting generated IDs", () => {
    expect(formEditorSchema.safeParse(input).success).toBe(true);
    expect(
      formEditorSchema.safeParse({
        ...input,
        fields: [
          { ...field, id: undefined },
          { ...field, id: undefined, key: "NEW", order: 2 },
        ],
      }).success,
    ).toBe(true);
  });
});
