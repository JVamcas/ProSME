import validator from "@rjsf/validator-ajv8";

import { buildFormValueSchema } from "./engine/FormDefinitionParser";
import { formVisibilityConfigurationErrors } from "./engine/FormVisibility";
import type { FormField, FormSection } from "./FormTypes";

export function validateFieldOptions(field: FormField) {
  const options = field.options ?? [];
  if (!["SINGLE_SELECT", "MULTI_SELECT"].includes(field.type)) {
    return options.length === 0;
  }
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
    fields.every(validateFieldConstraints) &&
    validateFieldOrder(fields)
  );
}

export function validateFieldConstraints(field: FormField) {
  const hasNumberLimits = field.minimum != null || field.maximum != null;
  const hasLengthLimits = field.minLength != null || field.maxLength != null;
  if (
    hasNumberLimits &&
    !["NUMBER", "CURRENCY", "PERCENTAGE"].includes(field.type)
  ) return false;
  if (
    field.type === "PERCENTAGE" &&
    (field.minimum != null && field.minimum < 0 ||
      field.maximum != null && field.maximum > 100)
  ) return false;
  if (hasLengthLimits && !["TEXT", "TEXTAREA"].includes(field.type)) {
    return false;
  }
  if (![field.minimum, field.maximum].every((value) => (
    value == null || Number.isFinite(value)
  ))) return false;
  if (
    field.minimum != null &&
    field.maximum != null &&
    field.minimum > field.maximum
  ) return false;
  if (
    field.minLength != null &&
    field.maxLength != null &&
    field.minLength > field.maxLength
  ) return false;
  return [field.minLength, field.maxLength].every((value) => (
    value == null || Number.isInteger(value) && value >= 0
  ));
}

export function validateFormValues(
  fields: readonly FormField[],
  values: Record<string, unknown>,
  complete: boolean,
) {
  const presentValues = Object.fromEntries(
    Object.entries(values).filter(([, value]) => (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    )),
  );
  try {
    const result = validator.rawValidation(
      buildFormValueSchema(fields, complete),
      presentValues,
    );
    return !result.errors?.length;
  } catch {
    return false;
  }
}

export function formPublicationErrors(
  fields: readonly FormField[],
  sections: readonly FormSection[],
  submitLabel: string,
) {
  const errors: string[] = [];
  if (!submitLabel.trim()) errors.push("A submit label is required.");
  if (!validateFormFields(fields)) {
    errors.push("Fields contain invalid keys, options, ordering, or validation rules.");
  }
  errors.push(...formVisibilityConfigurationErrors(fields, sections));
  return errors;
}
