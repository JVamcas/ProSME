import { formFieldRuleErrors } from "../../engine/FormFieldBehaviour";
import type { ErrorSchema } from "@rjsf/utils";
import type { IChangeEvent } from "@rjsf/core";
import type { FormRuntimeSchema } from "../../FormTypes";
import { validateFormValues } from "../../FormValidation";
import type { DynamicFormValues } from "./FormRenderer";

export function formRendererSubmitHandler(
  fields: FormRuntimeSchema["fields"],
  onSubmit: (values: DynamicFormValues) => void,
  onInvalid: () => void,
) {
  return (event: IChangeEvent<DynamicFormValues>) => {
    const values = event.formData ?? {};
    if (!validateFormValues(fields, values, true)) {
      onInvalid();
      return;
    }
    onSubmit(values);
  };
}

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
  if (field.type === "CHECKBOX" && field.required && value !== true) {
    return "Select this checkbox before continuing.";
  }
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
            formData,
          ),
      )
    : [];
  const invalidPopulatedFields = allFields.filter(
    (field) =>
      hasFormValue(formData[field.key]) &&
      !validateFormValues(
        [field],
        valuesForFields([field], formData),
        false,
        formData,
      ),
  );
  const invalidFields = new Map(
    [...invalidStepFields, ...invalidPopulatedFields].map((field) => [
      field.key,
      field,
    ]),
  );
  const errors = Object.fromEntries(
    [...invalidFields.values()].map((field) => [
      field.key,
      { __errors: [invalidFieldMessage(field, formData[field.key])] },
    ]),
  ) as ErrorSchema<DynamicFormValues>;
  const rules = formFieldRuleErrors(
    validationAttempted ? currentFields : allFields,
    formData,
    validationAttempted ? "SUBMIT" : "DRAFT",
  );
  for (const [key, message] of Object.entries(rules)) {
    errors[key] = { __errors: [message] };
  }
  return errors;
}
