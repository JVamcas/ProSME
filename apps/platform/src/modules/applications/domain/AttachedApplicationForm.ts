import {
  businessMemberRoles,
  type BusinessMember,
} from "@/modules/businesses/BusinessSchemas";
import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";

export type ApplicationBusinessSource = {
  applicantPosition?: string;
  members?: BusinessMember[];
  businessType: string;
  employeeCount: number | null;
  establishedYear: number | null;
  legalName: string;
  physicalAddress: string;
  region: string;
  registrationNumber: string;
  sector: string;
  secondarySector?: string | null;
  tradingName: string;
};

const businessFields = [
  {
    key: "BUSINESS_APPLICANT_POSITION",
    label: "Position of applicant",
    type: "TEXT",
  },
  { key: "BUSINESS_LEGAL_NAME", label: "Legal business name", type: "TEXT" },
  { key: "BUSINESS_TRADING_NAME", label: "Trading name", type: "TEXT" },
  {
    key: "BUSINESS_REGISTRATION_NUMBER",
    label: "Registration number",
    type: "TEXT",
  },
  { key: "BUSINESS_TYPE", label: "Business type", type: "TEXT" },
  { key: "BUSINESS_SECTOR", label: "Primary sector", type: "TEXT" },
  { key: "BUSINESS_SECONDARY_SECTOR", label: "Secondary sector", type: "TEXT" },
  { key: "BUSINESS_REGION", label: "Region", type: "TEXT" },
  {
    key: "BUSINESS_PHYSICAL_ADDRESS",
    label: "Physical address",
    type: "TEXTAREA",
  },
  {
    key: "BUSINESS_ESTABLISHED_YEAR",
    label: "Year established",
    type: "NUMBER",
  },
  {
    key: "BUSINESS_EMPLOYEE_COUNT",
    label: "Number of employees",
    type: "NUMBER",
  },
] as const;

export const attachedBusinessSourceDefinitionId =
  "a18bd078-d26c-4f65-89fb-60958b293eb6";

export const attachedBusinessFieldKeys = new Set<string>([
  ...businessFields.map((field) => field.key),
  "BUSINESS_MEMBERS",
]);

export function attachedBusinessFieldDefinitions(
  fundingCallId: string,
): FormField[] {
  const fields: FormField[] = businessFields.map((field, index) => ({
    columnSpan: field.key === "BUSINESS_PHYSICAL_ADDRESS" ? 2 : 1,
    key: field.key,
    label: field.label,
    order: index + 1,
    required: field.key !== "BUSINESS_SECONDARY_SECTOR",
    sectionId: fundingCallId,
    type: field.type,
  }));
  return [
    ...fields,
    {
      columnSpan: 2,
      key: "BUSINESS_MEMBERS",
      label: "Principal / founding members",
      order: fields.length + 1,
      required: true,
      sectionId: fundingCallId,
      type: "REPEATABLE_GROUP",
      repeatable: {
        addLabel: "Add member",
        itemLabel: "Member",
        minimumItems: 1,
        maximumItems: 100,
        fields: [
          {
            key: "fullName",
            label: "Full name",
            type: "TEXT",
            required: true,
            columnSpan: 1,
            order: 1,
            maxLength: 160,
          },
          {
            key: "idNumber",
            label: "ID number",
            type: "TEXT",
            required: true,
            columnSpan: 1,
            order: 2,
            maxLength: 80,
          },
          {
            key: "role",
            label: "Role",
            type: "SINGLE_SELECT",
            required: true,
            columnSpan: 1,
            order: 3,
            options: businessMemberRoles.map((role, index) => ({
              key: role,
              label: role,
              order: index + 1,
            })),
          },
        ],
      },
    },
  ];
}

export function attachedBusinessFieldValues(
  business: ApplicationBusinessSource,
): Record<string, unknown> {
  return {
    BUSINESS_APPLICANT_POSITION: business.applicantPosition ?? "",
    BUSINESS_MEMBERS: business.members ?? [],
    BUSINESS_LEGAL_NAME: business.legalName,
    BUSINESS_TRADING_NAME: business.tradingName,
    BUSINESS_REGISTRATION_NUMBER: business.registrationNumber,
    BUSINESS_TYPE: business.businessType,
    BUSINESS_SECTOR: business.sector,
    BUSINESS_SECONDARY_SECTOR: business.secondarySector ?? "",
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

export function needsAttachedBusinessValues(
  stored: Readonly<Record<string, unknown>>,
) {
  return (
    [...attachedBusinessFieldKeys].some((key) => !Object.hasOwn(stored, key)) ||
    !stored.BUSINESS_APPLICANT_POSITION ||
    (Array.isArray(stored.BUSINESS_MEMBERS) &&
      stored.BUSINESS_MEMBERS.length === 0)
  );
}

export function fillMissingAttachedBusinessValues(
  stored: Readonly<Record<string, unknown>>,
  business: ApplicationBusinessSource,
) {
  const values = { ...stored };
  for (const [key, value] of Object.entries(
    attachedBusinessFieldValues(business),
  )) {
    const incompleteNewField =
      (key === "BUSINESS_APPLICANT_POSITION" && !values[key]) ||
      (key === "BUSINESS_MEMBERS" &&
        Array.isArray(values[key]) &&
        values[key].length === 0);
    if (!Object.hasOwn(values, key) || incompleteNewField) values[key] = value;
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
  const existingEntityIds = new Set(
    form.sections
      .filter((section) => section.key === "ENTITY_DETAILS")
      .map((section) => section.id),
  );
  const conflictingField = form.fields.find(
    (field) =>
      !existingEntityIds.has(field.sectionId) &&
      attachedBusinessFieldKeys.has(field.key),
  );
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
        description:
          "Details copied from the business selected for this application.",
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
