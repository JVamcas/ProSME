import type { ErrorSchema } from "@rjsf/utils";
import type { FormRuntimeSchema } from "../../FormTypes";
import { validateFormValues } from "../../FormValidation";
import type { DynamicFormValues } from "./FormRenderer";

export function valuesForFields(
  fields: readonly { key: string }[],
  values: DynamicFormValues,
) {
  return Object.fromEntries(
    fields.map((field) => [field.key, values[field.key]]),
  );
}

function hasFormValue(value: unknown) {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0)
  );
}

function invalidFieldMessage(
  field: FormRuntimeSchema["fields"][number],
  value: unknown,
) {
  if (typeof value === "number") {
    if (field.minimum != null && value < field.minimum) {
      return `Enter a value of at least ${field.minimum}.`;
    }
    if (field.maximum != null && value > field.maximum) {
      return `Enter a value no greater than ${field.maximum}.`;
    }
  }
  return "Complete or correct this field before continuing.";
}

export function formRendererValidationErrors(
  allFields: FormRuntimeSchema["fields"],
  currentFields: FormRuntimeSchema["fields"],
  formData: DynamicFormValues,
  validationAttempted: boolean,
) {
  const invalidStepFields = validationAttempted
    ? currentFields.filter(
        (field) =>
          !validateFormValues(
            [field],
            valuesForFields([field], formData),
            true,
          ),
      )
    : [];
  const invalidPopulatedFields = allFields.filter(
    (field) =>
      hasFormValue(formData[field.key]) &&
      !validateFormValues([field], valuesForFields([field], formData), false),
  );
  const invalidFields = new Map(
    [...invalidStepFields, ...invalidPopulatedFields].map((field) => [
      field.key,
      field,
    ]),
  );
  return Object.fromEntries(
    [...invalidFields.values()].map((field) => [
      field.key,
      { __errors: [invalidFieldMessage(field, formData[field.key])] },
    ]),
  ) as ErrorSchema<DynamicFormValues>;
}
