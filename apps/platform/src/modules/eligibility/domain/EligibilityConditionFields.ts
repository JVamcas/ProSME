import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { FormField } from "@/modules/forms/FormTypes";

export const fundingCallEligibilityFields = [
  {
    key: "fundingCall.minimum_grant_amount",
    label: "Funding Call minimum grant amount",
    type: "NUMBER",
  },
  {
    key: "fundingCall.maximum_grant_amount",
    label: "Funding Call maximum grant amount",
    type: "NUMBER",
  },
  {
    key: "fundingCall.total_budget_envelope",
    label: "Funding Call total budget envelope",
    type: "NUMBER",
  },
  {
    key: "fundingCall.opens_at",
    label: "Funding Call opening date",
    type: "DATE",
  },
  {
    key: "fundingCall.closes_at",
    label: "Funding Call closing date",
    type: "DATE",
  },
  {
    key: "fundingCall.funding_instrument",
    label: "Funding instrument",
    type: "TEXT",
  },
  {
    key: "fundingCall.thematic_area",
    label: "Thematic area",
    type: "TEXT",
  },
] as const satisfies readonly ConditionFieldDefinition[];

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
      ? [{ key: `application.${field.key}`, label: field.label, type }]
      : [];
  });
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
