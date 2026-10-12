import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { buildFormValueSchema, parseFormDefinition } from "@/modules/forms/engine/FormDefinitionParser";
import { formVisibilityConditionFields } from "@/modules/forms/engine/FormVisibility";
import { calculateFormCompleteness } from "@/modules/forms/engine/FormCompleteness";
import { validateFormValues } from "@/modules/forms/FormValidation";
import { runtimeDefinition } from "../../support/form-runtime";

function definition(required = true) {
  const result = runtimeDefinition();
  result.fields = [{
    ...result.fields[1],
    key: "ACKNOWLEDGEMENT",
    label: "I agree to the configured statement.",
    helpText: "Additional configured explanation.",
    type: "CHECKBOX",
    minLength: undefined,
    maxLength: undefined,
    required,
    order: 1,
  }];
  return result;
}

describe("configurable checkbox fields", () => {
  it("exposes checkbox answers as booleans to configurable conditions", () => {
    expect(formVisibilityConditionFields(definition().fields)).toEqual([
      expect.objectContaining({ key: "ACKNOWLEDGEMENT", type: "BOOLEAN" }),
    ]);
  });
  it("accepts a checkbox in the field schema with a long configured label", () => {
    const field = definition().fields[0];
    expect(formFieldSchema.safeParse({ ...field, label: "Agreement ".repeat(40) }).success).toBe(true);
    expect(formFieldSchema.safeParse({ ...field, type: "TEXT", label: "Agreement ".repeat(40) }).success).toBe(false);
    expect(formFieldSchema.safeParse({ ...field, label: "a".repeat(1001) }).success).toBe(false);
  });

  it.each([undefined, false, "true", 1])("requires explicit true for a required checkbox: %s", (value) => {
    const form = definition();
    expect(validateFormValues(form.fields, { ACKNOWLEDGEMENT: value }, true)).toBe(false);
    expect(calculateFormCompleteness(form, { ACKNOWLEDGEMENT: value }).isComplete).toBe(false);
  });

  it("accepts checked acknowledgements and allows unchecked drafts", () => {
    const form = definition();
    expect(validateFormValues(form.fields, { ACKNOWLEDGEMENT: true }, true)).toBe(true);
    expect(calculateFormCompleteness(form, { ACKNOWLEDGEMENT: true }).isComplete).toBe(true);
    expect(validateFormValues(form.fields, { ACKNOWLEDGEMENT: false }, false)).toBe(true);
  });

  it("allows an optional checkbox to be unchecked or absent", () => {
    const form = definition(false);
    expect(validateFormValues(form.fields, { ACKNOWLEDGEMENT: false }, true)).toBe(true);
    expect(validateFormValues(form.fields, {}, true)).toBe(true);
    expect(validateFormValues(form.fields, { ACKNOWLEDGEMENT: "false" }, true)).toBe(false);
  });

  it("keeps Yes/No fields able to answer No when required", () => {
    const form = definition();
    form.fields[0].type = "YES_NO";
    expect(validateFormValues(form.fields, { ACKNOWLEDGEMENT: false }, true)).toBe(true);
  });

  it.each([{}, { ACKNOWLEDGEMENT: false }])("renders an unchecked checkbox without automatically accepting: %j", (formData) => {
    const form = definition();
    const parsed = parseFormDefinition(form);
    expect(parsed.uiSchema.ACKNOWLEDGEMENT).toEqual({ "ui:widget": "checkbox" });
    const markup = renderToStaticMarkup(
      <FormRenderer definition={form} formData={formData} onChange={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain(form.fields[0].label);
    expect(markup).toContain(form.fields[0].helpText);
    expect(markup).not.toContain('checked=""');
    expect(markup).toContain("0 of 1 required fields complete");
  });

  it("renders a saved checked value and prevents changes in read-only mode", () => {
    const form = definition();
    const markup = renderToStaticMarkup(
      <FormRenderer definition={form} formData={{ ACKNOWLEDGEMENT: true }} onChange={vi.fn()} onSubmit={vi.fn()} readOnly />,
    );
    expect(markup).toContain('checked=""');
    expect(markup).toContain('disabled=""');
  });

  it("applies checkbox validation to repeatable item fields", () => {
    const form = definition();
    const field = form.fields[0];
    const group = {
      ...field, type: "REPEATABLE_GROUP" as const, key: "ROWS",
      repeatable: {
        addLabel: "Add row", itemLabel: "Row", minimumItems: 1, maximumItems: 2,
        fields: [{ ...field, type: "CHECKBOX" as const }],
      },
    };
    expect(buildFormValueSchema([group]).properties?.ROWS).toHaveProperty("type", "array");
    expect(validateFormValues([group], { ROWS: [{ ACKNOWLEDGEMENT: false }] }, true)).toBe(false);
    expect(validateFormValues([group], { ROWS: [{ ACKNOWLEDGEMENT: true }] }, true)).toBe(true);
  });
});
