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

function numberFieldSchema(field: FormField, complete: boolean) {
  let numberSchema = z.number().finite();
  if (field.dataType === "INTEGER") numberSchema = numberSchema.int();
  if (field.validation?.min !== undefined) {
    numberSchema = numberSchema.min(field.validation.min);
  }
  if (field.validation?.max !== undefined) {
    numberSchema = numberSchema.max(field.validation.max);
  }
  const valueSchema = complete ? numberSchema : numberSchema.optional();
  return z.preprocess(normalizeNumber, valueSchema);
}

function stringFieldSchema(field: FormField, complete: boolean): z.ZodTypeAny {
  let stringSchema = z.string();
  if (field.inputType === "SELECT" || field.inputType === "RADIO") {
    const codes = new Set((field.options ?? []).map((option) => option.code));
    stringSchema = stringSchema.refine(
      (value) => value === "" || codes.has(value),
      "Select a valid option.",
    );
  }
  if (field.validation?.minLength !== undefined) {
    stringSchema = stringSchema.min(field.validation.minLength);
  }
  if (field.validation?.maxLength !== undefined) {
    stringSchema = stringSchema.max(field.validation.maxLength);
  }
  if (field.dataType === "DATE") {
    stringSchema = stringSchema.refine(
      (value: string) => value === "" || validDate(value),
      "Enter a valid date.",
    );
  }
  if (complete) return stringSchema.min(1, "This field is required.");
  return stringSchema.optional();
}

function fieldSchema(field: FormField, complete: boolean) {
  if (field.inputType === "CHECKBOX") {
    return complete ? z.boolean() : z.boolean().optional();
  }
  if (field.inputType === "NUMBER" || field.inputType === "MONEY") {
    return numberFieldSchema(field, complete);
  }
  return stringFieldSchema(field, complete);
}

export function buildDynamicFormSchema(
  fields: FormRuntimeSchema["fields"],
  complete: boolean,
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((field) => {
    shape[field.code] = fieldSchema(field, complete && field.required);
  });
  return z.object(shape);
}
