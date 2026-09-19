import { describe, expect, it } from "vitest";

import {
  formEditorSchema,
  formFieldSchema,
  formSectionSchema,
} from "@/modules/forms/api/FormSchemas";
import {
  validateFormFields,
  validateFormValues,
} from "@/modules/forms/FormValidation";
import type { FormField } from "@/modules/forms/FormTypes";

const sectionId = "10000000-0000-4000-8000-000000000001";
const textField: FormField = {
  columnSpan: 1,
  helpText: "Add relevant detail.",
  key: "NOTES",
  label: "Notes",
  options: [],
  order: 1,
  required: true,
  sectionId,
  type: "TEXTAREA",
};

describe("basic form field validation", () => {
  it("accepts exactly the six phase 2.3 field types", () => {
    const types = ["TEXT", "TEXTAREA", "NUMBER", "DATE", "YES_NO"] as const;
    expect(types.every((type) => (
      formFieldSchema.safeParse({ ...textField, type }).success
    ))).toBe(true);
    expect(formFieldSchema.safeParse({
      ...textField,
      options: [{ key: "FIRST", label: "First", order: 1 }],
      type: "SELECT",
    }).success).toBe(true);
    expect(formFieldSchema.safeParse({ ...textField, type: "MONEY" }).success)
      .toBe(false);
  });

  it("requires Select options and rejects options on other field types", () => {
    expect(formFieldSchema.safeParse({
      ...textField,
      options: [],
      type: "SELECT",
    }).success).toBe(false);
    expect(formFieldSchema.safeParse({
      ...textField,
      options: [{ key: "FIRST", label: "First", order: 1 }],
      type: "TEXT",
    }).success).toBe(false);
  });

  it("requires unique keys and contiguous order per section", () => {
    expect(validateFormFields([
      textField,
      { ...textField, key: "OTHER", order: 3 },
    ])).toBe(false);
    expect(validateFormFields([
      textField,
      { ...textField, key: "NOTES", order: 2 },
    ])).toBe(false);
  });

  it("allows incomplete drafts but enforces required values on completion", () => {
    expect(validateFormValues([textField], {}, false)).toBe(true);
    expect(validateFormValues([textField], {}, true)).toBe(false);
    expect(validateFormValues([textField], { NOTES: "Ready" }, true)).toBe(true);
    expect(validateFormValues([textField], { UNKNOWN: "nope" }, false)).toBe(false);
  });
});

describe("basic generic form definition", () => {
  const section = {
    columnSpan: 3,
    description: "Business identity and ownership.",
    id: sectionId,
    key: "BUSINESS_DETAILS",
    order: 1,
    showContainer: true,
    title: "Business details",
  };

  it("accepts the section contract", () => {
    expect(formSectionSchema.safeParse(section).success).toBe(true);
  });

  it("limits section width to the three-column grid", () => {
    expect(formSectionSchema.safeParse({ ...section, columnSpan: 1 }).success)
      .toBe(true);
    expect(formSectionSchema.safeParse({ ...section, columnSpan: 2 }).success)
      .toBe(true);
    expect(formSectionSchema.safeParse({ ...section, columnSpan: 4 }).success)
      .toBe(false);
  });

  it("supports hidden section chrome", () => {
    expect(formSectionSchema.safeParse({
      ...section,
      showContainer: false,
    }).success).toBe(true);
  });

  it("defines fields inside an ordered section", () => {
    const result = formEditorSchema.safeParse({
      expectedRowVersion: 1,
      fields: [textField],
      sections: [section],
      submitLabel: "Submit",
    });
    expect(result.success).toBe(true);
  });

  it("rejects fields assigned outside the form version", () => {
    const result = formEditorSchema.safeParse({
      expectedRowVersion: 1,
      fields: [{ ...textField, sectionId: crypto.randomUUID() }],
      sections: [section],
      submitLabel: "Submit",
    });
    expect(result.success).toBe(false);
  });

  it("bounds field width by its parent section", () => {
    const result = formEditorSchema.safeParse({
      expectedRowVersion: 1,
      fields: [{ ...textField, columnSpan: 2 }],
      sections: [{ ...section, columnSpan: 1 }],
      submitLabel: "Submit",
    });
    expect(result.success).toBe(false);
  });
});
