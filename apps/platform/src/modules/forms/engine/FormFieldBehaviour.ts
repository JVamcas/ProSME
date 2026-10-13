import { jsonValuesEqual } from "@/modules/conditions/engine/BasicOperators";
import type { FormField } from "../FormTypes";
import {
  defaultFormValidationRuleSettings,
  type FormRuleValidationMode,
} from "../domain/FormFieldRules";
import { evaluateFormRule, formConditionValue } from "./FormRuleEvaluation";

export function formFieldIsEditable(
  field: FormField,
  values: Readonly<Record<string, unknown>>,
) {
  return evaluateFormRule(field.rules?.editableCondition, values) === "TRUE";
}

export function formFieldIsRequired(
  field: FormField,
  values: Readonly<Record<string, unknown>>,
) {
  return (
    field.required ||
    Boolean(
      field.rules?.requiredCondition &&
      evaluateFormRule(field.rules.requiredCondition, values) === "TRUE",
    )
  );
}

export function formFieldRuleErrors(
  fields: readonly FormField[],
  values: Readonly<Record<string, unknown>>,
  mode: FormRuleValidationMode,
): Record<string, string> {
  return Object.fromEntries(
    fields.flatMap((field) => {
      if (!field.rules?.validationCondition) return [];
      const settings =
        field.rules.validationSettings ?? defaultFormValidationRuleSettings;
      if (!settings.modes.includes(mode)) return [];
      const result = evaluateFormRule(field.rules.validationCondition, values);
      if (
        result === "TRUE" ||
        (result === "UNAVAILABLE" &&
          mode === "DRAFT" &&
          settings.missing === "DEFER_ON_DRAFT")
      )
        return [];
      const message =
        result === "UNAVAILABLE"
          ? `${settings.message} Required rule inputs are missing.`
          : settings.message;
      return [[field.key, message]];
    }),
  );
}

export function nonEditableFormFieldChanges(
  fields: readonly FormField[],
  values: Readonly<Record<string, unknown>>,
  previousValues: Readonly<Record<string, unknown>>,
) {
  return fields.filter(
    (field) =>
      !formFieldIsEditable(field, values) &&
      !jsonValuesEqual(
        formConditionValue(values[field.key]),
        formConditionValue(previousValues[field.key]),
      ),
  );
}
