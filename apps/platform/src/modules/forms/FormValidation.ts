import type {
  FormDataType,
  FormField,
  FormInputType,
} from "./FormTypes";

const combinations: Record<FormInputType, readonly FormDataType[]> = {
  TEXT: ["TEXT"],
  TEXTAREA: ["TEXT"],
  NUMBER: ["INTEGER", "DECIMAL"],
  MONEY: ["MONEY"],
  DATE: ["DATE"],
  SELECT: ["TEXT"],
  RADIO: ["TEXT"],
  CHECKBOX: ["BOOLEAN"],
};

export function validateFieldCombination(field: FormField) {
  return combinations[field.inputType].includes(field.dataType);
}

export function validateFieldOptions(field: FormField) {
  const options = field.options ?? [];
  if (!["SELECT", "RADIO"].includes(field.inputType)) return options.length === 0;
  if (options.length === 0) return false;
  const codes = options.map((option) => option.code);
  return new Set(codes).size === codes.length;
}

export function validateLayout(fields: readonly FormField[]) {
  const positions = new Set<string>();
  for (const field of fields) {
    if (field.columnSpan === 2 && field.columnIndex !== 1) return false;
    const key = `${field.rowIndex}:${field.columnIndex}`;
    if (positions.has(key)) return false;
    positions.add(key);
    if (
      field.columnSpan === 2 &&
      positions.has(`${field.rowIndex}:2`)
    ) {
      return false;
    }
    if (field.columnSpan === 2) {
      positions.add(`${field.rowIndex}:2`);
    }
  }
  return true;
}

export function validateFormFields(fields: readonly FormField[]) {
  const codes = fields.map((field) => field.code);
  return (
    fields.length > 0 &&
    new Set(codes).size === codes.length &&
    fields.every(
      (field) =>
        validateFieldCombination(field)
        && validateFieldOptions(field)
        && validFieldValidation(field),
    ) &&
    validateLayout(fields)
  );
}

function primitiveValid(field: FormField, value: unknown) {
  if (value === null || value === undefined || value === "") return true;
  if (field.dataType === "BOOLEAN") return typeof value === "boolean";
  if (field.dataType === "DATE") return validDate(value);
  if (["INTEGER", "DECIMAL", "MONEY"].includes(field.dataType)) {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (field.dataType !== "INTEGER" || Number.isInteger(value))
    );
  }
  if (typeof value !== "string") return false;
  const validation = field.validation;
  if (validation?.minLength !== undefined && value.length < validation.minLength) {
    return false;
  }
  if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
    return false;
  }
  return true;
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function validFieldValidation(field: FormField) {
  const validation = field.validation;
  if (!validation) return true;
  const validRange = validation.min === undefined
    || validation.max === undefined
    || validation.min <= validation.max;
  const validLength = validation.minLength === undefined
    || validation.maxLength === undefined
    || validation.minLength <= validation.maxLength;
  return validRange && validLength;
}

function rangeValid(field: FormField, value: unknown) {
  if (typeof value !== "number") return true;
  const validation = field.validation;
  return !(
    (validation?.min !== undefined && value < validation.min)
    || (validation?.max !== undefined && value > validation.max)
  );
}

export function validateFormValues(
  fields: readonly FormField[],
  values: Record<string, unknown>,
  complete: boolean,
) {
  const knownCodes = new Set(fields.map((field) => field.code));
  if (Object.keys(values).some((code) => !knownCodes.has(code))) return false;
  return fields.every((field) => {
    const value = values[field.code];
    if (
      complete &&
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      return false;
    }
    if (!primitiveValid(field, value) || !rangeValid(field, value)) return false;
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      ["SELECT", "RADIO"].includes(field.inputType)
    ) {
      return (field.options ?? []).some((option) => option.code === value);
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
    errors.push("Fields contain invalid combinations, options, codes, or layout.");
  }
  return errors;
}
