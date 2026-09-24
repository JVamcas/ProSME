import validator from "@rjsf/validator-ajv8";

import type {
  FormField,
  FormRuntimeSchema,
  FormSection,
} from "@/modules/forms/FormTypes";
import { buildFormValueSchema } from "./FormDefinitionParser";

export type FormSectionCompleteness = {
  sectionId: string;
  sectionKey: string;
  sectionTitle: string;
  requiredFieldCount: number;
  completedRequiredFieldCount: number;
  isComplete: boolean;
};

export type FormCompleteness = {
  requiredFieldCount: number;
  completedRequiredFieldCount: number;
  percentComplete: number;
  isComplete: boolean;
  sections: FormSectionCompleteness[];
};

function hasResponseValue(value: unknown) {
  return (
    value !== undefined
    && value !== null
    && value !== ""
    && (!Array.isArray(value) || value.length > 0)
  );
}

function requiredFieldIsComplete(
  field: FormField,
  values: Readonly<Record<string, unknown>>,
) {
  const value = values[field.key];
  if (!hasResponseValue(value)) return false;

  try {
    const result = validator.rawValidation(
      buildFormValueSchema([field]),
      { [field.key]: value },
    );
    return !result.errors?.length;
  } catch {
    return false;
  }
}

function calculateSectionCompleteness(
  section: FormSection & { id: string },
  fields: readonly FormField[],
  values: Readonly<Record<string, unknown>>,
): FormSectionCompleteness {
  const requiredFields = fields.filter((field) => (
    field.sectionId === section.id && field.required
  ));
  const completedRequiredFieldCount = requiredFields.filter((field) => (
    requiredFieldIsComplete(field, values)
  )).length;

  return {
    sectionId: section.id,
    sectionKey: section.key,
    sectionTitle: section.title,
    requiredFieldCount: requiredFields.length,
    completedRequiredFieldCount,
    isComplete: completedRequiredFieldCount === requiredFields.length,
  };
}

export function calculateFormCompleteness(
  definition: FormRuntimeSchema,
  values: Readonly<Record<string, unknown>>,
): FormCompleteness {
  const sections = [...definition.sections]
    .sort((left, right) => left.order - right.order)
    .map((section) => {
      if (!section.id) {
        throw new Error(`Saved section ${section.key} has no identifier.`);
      }
      return calculateSectionCompleteness(
        { ...section, id: section.id },
        definition.fields,
        values,
      );
    });
  const requiredFieldCount = sections.reduce(
    (total, section) => total + section.requiredFieldCount,
    0,
  );
  const completedRequiredFieldCount = sections.reduce(
    (total, section) => total + section.completedRequiredFieldCount,
    0,
  );
  const percentComplete = requiredFieldCount === 0
    ? 100
    : Math.round(completedRequiredFieldCount / requiredFieldCount * 100);

  return {
    requiredFieldCount,
    completedRequiredFieldCount,
    percentComplete,
    isComplete: completedRequiredFieldCount === requiredFieldCount,
    sections,
  };
}
