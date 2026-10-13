import "server-only";
import { calculateFormScores } from "../engine/FormScoring";

import { RequestValidationError } from "@/lib/resource-errors";
import type { FormRuntimeSchema } from "../FormTypes";
import { validateFormValues } from "../FormValidation";
import {
  activeFormDefinition,
  sanitizeFormResponseValues,
} from "../engine/FormVisibility";
import {
  formFieldIsEditable,
  formFieldRuleErrors,
  nonEditableFormFieldChanges,
} from "../engine/FormFieldBehaviour";

export function validatedFormResponseValues(
  schema: FormRuntimeSchema,
  captured: Record<string, unknown>,
  complete: boolean,
  previousValues: Record<string, unknown> = {},
) {
  let values = sanitizeFormResponseValues(schema, captured);
  const active = activeFormDefinition(schema, values);
  for (const field of active.fields) {
    if (
      field.type !== "SCORING_AGGREGATE" &&
      !formFieldIsEditable(field, values) &&
      !Object.hasOwn(values, field.key) &&
      Object.hasOwn(previousValues, field.key)
    ) {
      values[field.key] = previousValues[field.key];
    }
  }
  values = calculateFormScores(active.fields, values);
  const changed = nonEditableFormFieldChanges(
    active.fields.filter((field) => field.type !== "SCORING_AGGREGATE"),
    values,
    previousValues,
  );
  if (changed.length) {
    throw new RequestValidationError(
      `${changed[0].label} is not editable under the current form rules.`,
    );
  }
  const errors = formFieldRuleErrors(
    active.fields,
    values,
    complete ? "SUBMIT" : "DRAFT",
  );
  if (Object.keys(errors).length) {
    throw new RequestValidationError(Object.values(errors).join(" "));
  }
  if (!validateFormValues(active.fields, values, complete)) {
    throw new RequestValidationError(
      complete
        ? "Complete all required form fields with valid values."
        : "The draft form values are invalid.",
    );
  }
  return values;
}
