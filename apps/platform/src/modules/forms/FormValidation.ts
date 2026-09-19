import type { FormField } from "./FormTypes";

export function validateFieldOptions(field: FormField) {
  const options = field.options ?? [];
  if (field.type !== "SELECT") return options.length === 0;
  if (options.length === 0) return false;
  const keys = options.map((option) => option.key);
  return (
    new Set(keys).size === keys.length
    && options.every((option, index) => option.order === index + 1)
  );
}

export function validateFieldOrder(fields: readonly FormField[]) {
  const sectionIds = new Set(fields.map((field) => field.sectionId));
  return [...sectionIds].every((sectionId) => {
    const orders = fields
      .filter((field) => field.sectionId === sectionId)
      .map((field) => field.order)
      .sort((a, b) => a - b);
    return orders.every((order, index) => order === index + 1);
  });
}

export function validateFormFields(fields: readonly FormField[]) {
  const keys = fields.map((field) => field.key);
  return (
    fields.length > 0 &&
    new Set(keys).size === keys.length &&
    fields.every(validateFieldOptions) &&
    validateFieldOrder(fields)
  );
}

function primitiveValid(field: FormField, value: unknown) {
  if (value === null || value === undefined || value === "") return true;
  if (field.type === "YES_NO") return typeof value === "boolean";
  if (field.type === "DATE") return validDate(value);
  if (field.type === "NUMBER") {
    return typeof value === "number" && Number.isFinite(value);
  }
  return typeof value === "string";
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function validateFormValues(
  fields: readonly FormField[],
  values: Record<string, unknown>,
  complete: boolean,
) {
  const knownKeys = new Set(fields.map((field) => field.key));
  if (Object.keys(values).some((key) => !knownKeys.has(key))) return false;
  return fields.every((field) => {
    const value = values[field.key];
    if (
      complete &&
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      return false;
    }
    if (!primitiveValid(field, value)) return false;
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      field.type === "SELECT"
    ) {
      return (field.options ?? []).some((option) => option.key === value);
    }
    return true;
  });
}

export function formPublicationErrors(
  fields: readonly FormField[],
  submitLabel: string,
) {
  const errors: string[] = [];
  if (!submitLabel.trim()) errors.push("A submit label is required.");
  if (!validateFormFields(fields)) {
    errors.push("Fields contain invalid keys, options, or ordering.");
  }
  return errors;
}
