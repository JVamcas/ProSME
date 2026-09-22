import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { FormField } from "@/modules/forms/FormTypes";
import { workflowRuntimeContextFields } from "@/modules/workflows/domain/WorkflowRuntimeContextFieldCatalogue";

export const fundingCallEligibilityFields: ConditionFieldDefinition[] =
  workflowRuntimeContextFields
    .filter((field) => field.key.startsWith("fundingCall."))
    .map((field) => ({
      ...field,
      label: `[Funding Call] ${field.label.replace(/^Funding Call /, "")}`,
    }));

const formConditionTypes = {
  CURRENCY: "NUMBER",
  DATE: "DATE",
  NUMBER: "NUMBER",
  PERCENTAGE: "NUMBER",
  SINGLE_SELECT: "TEXT",
  TEXT: "TEXT",
  TEXTAREA: "TEXT",
  YES_NO: "BOOLEAN",
} as const;

export function eligibilityFieldsFromForm(
  fields: readonly FormField[],
): ConditionFieldDefinition[] {
  return fields.flatMap((field) => {
    const type = formConditionTypes[
      field.type as keyof typeof formConditionTypes
    ];
    return type
      ? [{
          key: `application.${field.key}`,
          label: `[Application] ${field.label}`,
          type,
        }]
      : [];
  });
}

export function eligibilityQuestionFieldsFromForm(
  fields: readonly FormField[],
) {
  return eligibilityFieldsFromForm(fields).map((field) => ({
    ...field,
    label: field.label.replace(/^\[Application\] /, ""),
  }));
}

export function eligibilityContextFields(fields: readonly FormField[]) {
  return [
    ...eligibilityFieldsFromForm(fields),
    ...fundingCallEligibilityFields,
  ];
}

export function eligibilityFieldsForBoundForms(
  formFieldSets: readonly (readonly FormField[])[],
) {
  const [first, ...remaining] = formFieldSets.map(eligibilityFieldsFromForm);
  if (!first) return [];
  const common = first.filter((field) => remaining.every((fields) =>
    fields.some((candidate) =>
      candidate.key === field.key && candidate.type === field.type
    )
  ));
  return [...common, ...fundingCallEligibilityFields];
}
