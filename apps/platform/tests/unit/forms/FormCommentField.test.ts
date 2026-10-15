import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { parseFormDefinition } from "@/modules/forms/engine/FormDefinitionParser";
import { validatedFormResponseValues } from "@/modules/forms/application/FormResponseValidation";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";
import { runtimeDefinition } from "../../support/form-runtime";

function commentForm() {
  const form = runtimeDefinition();
  form.fields = [
    {
      sectionId: form.sections[0].id!,
      key: "REVIEW_COMMENT",
      label: "Review comment",
      type: "COMMENT",
      columnSpan: 1,
      order: 1,
      required: true,
      minLength: 3,
      maxLength: 50,
    },
  ];
  return form;
}

describe("explicit Comment field", () => {
  it("supports builder validation, publication and the existing textarea renderer", () => {
    const form = commentForm();
    expect(formFieldSchema.safeParse(form.fields[0]).success).toBe(true);
    expect(
      formPublicationErrors(form.fields, form.sections, form.submitLabel),
    ).toEqual([]);
    const parsed = parseFormDefinition(form);
    expect(parsed.uiSchema.REVIEW_COMMENT).toMatchObject({
      "ui:widget": "textarea",
    });
    expect(parsed.schema.properties?.REVIEW_COMMENT).toMatchObject({
      type: "string",
      minLength: 3,
      maxLength: 50,
    });
  });

  it("validates required comments and length limits on the server", () => {
    const form = commentForm();
    expect(() => validatedFormResponseValues(form, {}, true)).toThrow();
    expect(() =>
      validatedFormResponseValues(form, { REVIEW_COMMENT: "Hi" }, true),
    ).toThrow();
    expect(() =>
      validatedFormResponseValues(
        form,
        { REVIEW_COMMENT: "x".repeat(51) },
        true,
      ),
    ).toThrow();
    expect(
      validatedFormResponseValues(
        form,
        { REVIEW_COMMENT: "First line\nSecond line" },
        true,
      ),
    ).toEqual({ REVIEW_COMMENT: "First line\nSecond line" });
  });
});
