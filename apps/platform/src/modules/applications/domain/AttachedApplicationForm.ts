import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";

export type ApplicationBusinessSource = {
  businessType: string;
  employeeCount: number | null;
  establishedYear: number | null;
  legalName: string;
  physicalAddress: string;
  region: string;
  registrationNumber: string;
  sector: string;
  tradingName: string;
};

const businessFields = [
  { key: "BUSINESS_LEGAL_NAME", label: "Legal business name", type: "TEXT" },
  { key: "BUSINESS_TRADING_NAME", label: "Trading name", type: "TEXT" },
  { key: "BUSINESS_REGISTRATION_NUMBER", label: "Registration number", type: "TEXT" },
  { key: "BUSINESS_TYPE", label: "Business type", type: "TEXT" },
  { key: "BUSINESS_SECTOR", label: "Sector", type: "TEXT" },
  { key: "BUSINESS_REGION", label: "Region", type: "TEXT" },
  { key: "BUSINESS_PHYSICAL_ADDRESS", label: "Physical address", type: "TEXTAREA" },
  { key: "BUSINESS_ESTABLISHED_YEAR", label: "Year established", type: "NUMBER" },
  { key: "BUSINESS_EMPLOYEE_COUNT", label: "Number of employees", type: "NUMBER" },
] as const;

export const attachedBusinessSourceDefinitionId =
  "a18bd078-d26c-4f65-89fb-60958b293eb6";

export const attachedBusinessFieldKeys = new Set<string>(
  businessFields.map((field) => field.key),
);

export function attachedBusinessFieldDefinitions(fundingCallId: string): FormField[] {
  return businessFields.map((field, index) => ({
    columnSpan: field.key === "BUSINESS_PHYSICAL_ADDRESS" ? 2 : 1,
    key: field.key,
    label: field.label,
    order: index + 1,
    required: field.key !== "BUSINESS_TRADING_NAME"
      && field.key !== "BUSINESS_REGISTRATION_NUMBER"
      && field.key !== "BUSINESS_ESTABLISHED_YEAR"
      && field.key !== "BUSINESS_EMPLOYEE_COUNT",
    sectionId: fundingCallId,
    type: field.type,
  }));
}

export function attachedBusinessFieldValues(
  business: ApplicationBusinessSource,
): Record<string, string | number> {
  return {
    BUSINESS_LEGAL_NAME: business.legalName,
    BUSINESS_TRADING_NAME: business.tradingName,
    BUSINESS_REGISTRATION_NUMBER: business.registrationNumber,
    BUSINESS_TYPE: business.businessType,
    BUSINESS_SECTOR: business.sector,
    BUSINESS_REGION: business.region,
    BUSINESS_PHYSICAL_ADDRESS: business.physicalAddress,
    ...(business.establishedYear === null
      ? {}
      : { BUSINESS_ESTABLISHED_YEAR: business.establishedYear }),
    ...(business.employeeCount === null
      ? {}
      : { BUSINESS_EMPLOYEE_COUNT: business.employeeCount }),
  };
}

export function fillMissingAttachedBusinessValues(
  stored: Readonly<Record<string, unknown>>,
  business: ApplicationBusinessSource,
) {
  const values = { ...stored };
  for (const [key, value] of Object.entries(attachedBusinessFieldValues(business))) {
    if (!Object.hasOwn(values, key)) values[key] = value;
  }
  return values;
}

export function preserveAttachedBusinessValues(
  supplied: Readonly<Record<string, unknown>>,
  stored: Readonly<Record<string, unknown>>,
) {
  const result = { ...supplied };
  for (const key of attachedBusinessFieldKeys) {
    if (Object.hasOwn(stored, key)) result[key] = stored[key];
    else delete result[key];
  }
  return result;
}

export function attachBusinessFieldsToForm(
  form: FormRuntimeSchema,
  fundingCallId: string,
): FormRuntimeSchema {
  const existingEntityIds = new Set(form.sections
    .filter((section) => section.key === "ENTITY_DETAILS")
    .map((section) => section.id));
  const conflictingField = form.fields.find((field) => (
    !existingEntityIds.has(field.sectionId)
    && attachedBusinessFieldKeys.has(field.key)
  ));
  if (conflictingField) {
    throw new Error(
      `Application form field ${conflictingField.key} is reserved for Entity Details.`,
    );
  }
  const remainingFields = form.fields.filter(
    (field) => !existingEntityIds.has(field.sectionId),
  );
  const remainingSections = form.sections.filter(
    (section) => section.key !== "ENTITY_DETAILS",
  );
  return {
    ...form,
    fields: [
      ...attachedBusinessFieldDefinitions(fundingCallId),
      ...remainingFields,
    ],
    sections: [
      {
        columnSpan: 2,
        description: "Details copied from the business selected for this application.",
        id: fundingCallId,
        key: "ENTITY_DETAILS",
        order: 1,
        showContainer: true,
        title: "Entity Details",
      },
      ...remainingSections.map((section, index) => ({
        ...section,
        order: index + 2,
      })),
    ],
  };
}
