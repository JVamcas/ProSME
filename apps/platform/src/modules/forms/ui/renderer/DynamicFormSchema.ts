import { z } from "zod";

import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";

export type DynamicFormValues = Record<string, unknown>;

function normalizeNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function stringFieldSchema(field: FormField, required: boolean) {
  let schema = z.string();
  if (field.type === "SELECT") {
    const keys = new Set((field.options ?? []).map((option) => option.key));
    schema = schema.refine(
      (value) => value === "" || keys.has(value),
      "Select a valid option.",
    );
  }
  if (field.type === "DATE") {
    schema = schema.refine(
      (value) => value === "" || validDate(value),
      "Enter a valid date.",
    );
  }
  return required ? schema.min(1, "This field is required.") : schema.optional();
}

function fieldSchema(field: FormField, required: boolean) {
  if (field.type === "YES_NO") {
    return required ? z.boolean() : z.boolean().optional();
  }
  if (field.type === "NUMBER") {
    const schema = required
      ? z.number().finite()
      : z.number().finite().optional();
    return z.preprocess(normalizeNumber, schema);
  }
  return stringFieldSchema(field, required);
}

export function buildDynamicFormSchema(
  fields: FormRuntimeSchema["fields"],
  complete: boolean,
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((field) => {
    shape[field.key] = fieldSchema(field, complete && field.required);
  });
  return z.object(shape);
}
