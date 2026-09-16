import { describe, expect, it } from "vitest";

import { formFieldSchema } from "@/modules/forms/FormSchemas";
import {
  validateFormFields,
  validateFormValues,
} from "@/modules/forms/FormValidation";
import type { FormField } from "@/modules/forms/FormTypes";
import { buildDynamicFormSchema } from "@/components/admin/forms/DynamicFormSchema";

const textField: FormField = {
  code: "NOTES",
  label: "Notes",
  inputType: "TEXTAREA",
  dataType: "TEXT",
  rowIndex: 1,
  columnIndex: 1,
  columnSpan: 2,
  required: true,
  options: [],
};

describe("dynamic form field validation", () => {
  it("accepts supported combinations and rejects unsupported ones", () => {
    expect(formFieldSchema.safeParse(textField).success).toBe(true);
    expect(
      formFieldSchema.safeParse({ ...textField, dataType: "INTEGER" }).success,
    ).toBe(false);
  });

  it("rejects collisions and invalid spans", () => {
    expect(
      validateFormFields([
        textField,
        { ...textField, code: "OTHER", columnIndex: 2, columnSpan: 1 },
      ]),
    ).toBe(false);
    expect(
      formFieldSchema.safeParse({ ...textField, columnIndex: 2, columnSpan: 2 }).success,
    ).toBe(false);
  });

  it("allows incomplete drafts but enforces required values on completion", () => {
    expect(validateFormValues([textField], {}, false)).toBe(true);
    expect(validateFormValues([textField], {}, true)).toBe(false);
    expect(validateFormValues([textField], { NOTES: "Ready" }, true)).toBe(true);
    expect(validateFormValues([textField], { UNKNOWN: "nope" }, false)).toBe(false);
  });

  it("enforces bounded validation and real dates", () => {
    const bounded = {
      ...textField,
      validation: { maxLength: 4, minLength: 2 },
    };
    expect(validateFormValues([bounded], { NOTES: "ok" }, true)).toBe(true);
    expect(validateFormValues([bounded], { NOTES: "x" }, true)).toBe(false);
    expect(
      formFieldSchema.safeParse({
        ...bounded,
        validation: { maxLength: 1, minLength: 2 },
      }).success,
    ).toBe(false);
  });

});

describe("dynamic form completion schema", () => {
  it("coerces numeric values and rejects invalid dates on completion", () => {
    const schema = buildDynamicFormSchema([
      {
        ...textField,
        code: "AMOUNT",
        dataType: "DECIMAL",
        inputType: "NUMBER",
        required: true,
      },
      {
        ...textField,
        code: "START_DATE",
        columnSpan: 1,
        dataType: "DATE",
        inputType: "DATE",
        required: true,
      },
    ], true);
    expect(schema.safeParse({ AMOUNT: "12.50", START_DATE: "2026-09-15" }).success).toBe(true);
    expect(schema.safeParse({ AMOUNT: "12.50", START_DATE: "2026-02-31" }).success).toBe(false);
  });
});
