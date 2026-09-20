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
