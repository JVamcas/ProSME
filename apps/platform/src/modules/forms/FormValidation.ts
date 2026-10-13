import {
  formFieldIsRequired,
  formFieldRuleErrors,
} from "./engine/FormFieldBehaviour";
import validator from "@rjsf/validator-ajv8";

import { buildFormValueSchema } from "./engine/FormDefinitionParser";
import type { FormField } from "./FormTypes";

export {
  formPublicationErrors,
  validateFieldConstraints,
  validateFieldOptions,
  validateFieldOrder,
  validateFormFields,
} from "./FormDefinitionValidation";

export function validateFormValues(
  fields: readonly FormField[],
  values: Record<string, unknown>,
  complete: boolean,
  ruleValues: Readonly<Record<string, unknown>> = values,
) {
  const presentValues = Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0),
    ),
  );
  try {
    const result = validator.rawValidation(
      buildFormValueSchema(
        fields.map((field) => ({
          ...field,
          required: formFieldIsRequired(field, ruleValues),
        })),
        complete,
      ),
      presentValues,
    );
    return (
      !result.errors?.length &&
      Object.keys(
        formFieldRuleErrors(fields, ruleValues, complete ? "SUBMIT" : "DRAFT"),
      ).length === 0
    );
  } catch {
    return false;
  }
}
