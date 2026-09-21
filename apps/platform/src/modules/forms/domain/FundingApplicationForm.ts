import {
  buildFundingApplicationDefinition,
  type FundingApplicationSectionSeed,
} from "./FundingApplicationFormBuilder";
import type { StandardFormSeed } from "./StandardFormDefinition";

const entityTypeOptions = [
  { key: "CLOSE_CORPORATION", label: "Close corporation" },
  { key: "COMPANY", label: "Company" },
  { key: "COOPERATIVE", label: "Cooperative" },
  { key: "SOLE_PROPRIETOR", label: "Sole proprietor" },
  { key: "OTHER", label: "Other" },
];

const confirmationOption = [{ key: "CONFIRMED", label: "I confirm" }];

const consentOption = [{ key: "CONSENT_GRANTED", label: "I consent" }];

const sections: FundingApplicationSectionSeed[] = [
  {
    description:
      "Provide the legal and contact details for the applicant entity.",
    key: "ENTITY_DETAILS",
    title: "Entity details",
    fields: [
      {
        key: "LEGAL_ENTITY_NAME",
        label: "Legal entity name",
        required: true,
        type: "TEXT",
      },
      { key: "TRADING_NAME", label: "Trading name", type: "TEXT" },
      {
        key: "ENTITY_TYPE",
        label: "Entity type",
        options: entityTypeOptions,
        required: true,
        type: "SINGLE_SELECT",
      },
      {
        key: "NAMIBIAN_OWNERSHIP_PERCENTAGE",
        label: "Namibian ownership",
        maximum: 100,
        minimum: 0,
        required: true,
        type: "PERCENTAGE",
      },
      {
        key: "EMPLOYEE_COUNT",
        label: "Number of employees",
        minimum: 0,
        required: true,
        type: "NUMBER",
      },
      {
        key: "REGISTERED_ADDRESS",
        label: "Registered address",
        required: true,
        type: "TEXTAREA",
        columnSpan: 2,
      },
      {
        key: "CONTACT_PERSON_NAME",
        label: "Contact person",
        required: true,
        type: "TEXT",
      },
      {
        key: "CONTACT_PERSON_EMAIL",
        label: "Contact email",
        required: true,
        type: "TEXT",
      },
      {
        key: "CONTACT_PERSON_PHONE",
        label: "Contact phone",
        required: true,
        type: "TEXT",
      },
    ],
  },
  {
    description: "Provide registration and statutory compliance information.",
    key: "REGISTRATION_AND_TAX",
    title: "Registration and tax information",
    fields: [
      {
        key: "REGISTRATION_NUMBER",
        label: "Registration number",
        required: true,
        type: "TEXT",
      },
      {
        key: "REGISTRATION_DATE",
        label: "Registration date",
        required: true,
        type: "DATE",
      },
      {
        key: "TAX_IDENTIFICATION_NUMBER",
        label: "Tax identification number",
        required: true,
        type: "TEXT",
      },
      {
        key: "TAX_CLEARANCE_EXPIRY_DATE",
        label: "Tax clearance expiry date",
        required: true,
        type: "DATE",
      },
      {
        key: "SOCIAL_SECURITY_NUMBER",
        label: "Social Security registration number",
        type: "TEXT",
      },
      {
        key: "MSME_REGISTRATION_NUMBER",
        label: "MSME registration number",
        type: "TEXT",
      },
      {
        key: "BUSINESS_REGISTRATION_DOCUMENT",
        label: "Business registration document",
        required: true,
        type: "DOCUMENT",
      },
      {
        key: "TAX_CLEARANCE_DOCUMENT",
        label: "Tax clearance document",
        required: true,
        type: "DOCUMENT",
      },
    ],
  },
  {
    description: "Describe the proposed project and its objectives.",
    key: "PROJECT",
    title: "Project",
    fields: [
      {
        key: "PROJECT_TITLE",
        label: "Project title",
        required: true,
        type: "TEXT",
        columnSpan: 2,
      },
      {
        key: "PROJECT_ABSTRACT",
        label: "Project abstract",
        required: true,
        type: "TEXTAREA",
        columnSpan: 2,
      },
      {
        key: "PROJECT_OBJECTIVES",
        label: "Project objectives",
        required: true,
        type: "TEXTAREA",
        columnSpan: 2,
      },
      {
        key: "PROJECT_DURATION_MONTHS",
        label: "Project duration in months",
        minimum: 1,
        required: true,
        type: "NUMBER",
      },
      {
        key: "PROJECT_LOCATION",
        label: "Project location",
        required: true,
        type: "TEXT",
      },
    ],
  },
  {
    description: "Provide the requested funding and complete project budget.",
    key: "BUDGET_AND_COFUNDING",
    title: "Budget and co-funding",
    fields: [
      {
        key: "REQUESTED_GRANT_AMOUNT",
        label: "Requested grant amount",
        minimum: 0,
        required: true,
        type: "CURRENCY",
      },
      {
        key: "TOTAL_PROJECT_COST",
        label: "Total project cost",
        minimum: 0,
        required: true,
        type: "CURRENCY",
      },
      {
        key: "APPLICANT_COFUNDING_AMOUNT",
        label: "Applicant co-funding amount",
        minimum: 0,
        required: true,
        type: "CURRENCY",
      },
      {
        key: "OTHER_COFUNDING_AMOUNT",
        label: "Other co-funding amount",
        minimum: 0,
        type: "CURRENCY",
      },
      {
        key: "COFUNDING_SOURCES",
        label: "Co-funding sources",
        type: "TEXTAREA",
        columnSpan: 2,
      },
      {
        key: "BUDGET_BREAKDOWN",
        label: "Budget breakdown",
        required: true,
        type: "TEXTAREA",
        columnSpan: 2,
      },
      {
        key: "DETAILED_BUDGET_DOCUMENT",
        label: "Detailed budget document",
        required: true,
        type: "DOCUMENT",
      },
    ],
  },
  {
    description:
      "Describe the project team and provide relevant CV information.",
    key: "TEAM",
    title: "Project team",
    fields: [
      {
        key: "PROJECT_LEAD_NAME",
        label: "Project lead name",
        required: true,
        type: "TEXT",
      },
      {
        key: "PROJECT_LEAD_ROLE",
        label: "Project lead role",
        required: true,
        type: "TEXT",
      },
      {
        key: "PROJECT_LEAD_EXPERIENCE",
        label: "Project lead experience",
        required: true,
        type: "TEXTAREA",
        columnSpan: 2,
      },
      {
        key: "TEAM_COMPOSITION",
        label: "Team composition",
        required: true,
        type: "TEXTAREA",
        columnSpan: 2,
      },
      { key: "TEAM_CV_DOCUMENT", label: "Team CV document", type: "DOCUMENT" },
    ],
  },
  {
    description:
      "Define the expected results and how progress will be measured.",
    key: "RESULTS_AND_INDICATORS",
    title: "Results and indicators",
    fields: [
      {
        key: "EXPECTED_OUTCOMES",
        label: "Expected outcomes",
        required: true,
        type: "TEXTAREA",
        columnSpan: 2,
      },
      {
        key: "PRIMARY_INDICATOR",
        label: "Primary indicator",
        required: true,
        type: "TEXT",
        columnSpan: 2,
      },
      {
        key: "PRIMARY_INDICATOR_BASELINE",
        label: "Primary indicator baseline",
        required: true,
        type: "TEXTAREA",
      },
      {
        key: "PRIMARY_INDICATOR_TARGET",
        label: "Primary indicator target",
        required: true,
        type: "TEXTAREA",
      },
      {
        key: "ADDITIONAL_INDICATORS",
        label: "Additional indicators, baselines and targets",
        type: "TEXTAREA",
        columnSpan: 2,
      },
    ],
  },
  {
    description:
      "Confirm the declarations and consent required to submit this application.",
    key: "DECLARATIONS_AND_CONSENT",
    title: "Declarations and consent",
    fields: [
      {
        key: "DECLARATION_ACCURACY_CONFIRMATION",
        label: "I confirm that the information supplied is accurate",
        options: confirmationOption,
        required: true,
        type: "SINGLE_SELECT",
        columnSpan: 2,
      },
      {
        key: "DECLARATION_AUTHORITY_CONFIRMATION",
        label: "I confirm that I am authorised to submit this application",
        options: confirmationOption,
        required: true,
        type: "SINGLE_SELECT",
        columnSpan: 2,
      },
      {
        key: "DATA_PROCESSING_CONSENT",
        label: "I consent to processing of the supplied information",
        options: consentOption,
        required: true,
        type: "SINGLE_SELECT",
        columnSpan: 2,
      },
      {
        key: "VERIFICATION_CONSENT",
        label: "I consent to verification of the supplied information",
        options: consentOption,
        required: true,
        type: "SINGLE_SELECT",
        columnSpan: 2,
      },
      {
        key: "DECLARANT_NAME",
        label: "Declarant name",
        required: true,
        type: "TEXT",
      },
      {
        key: "DECLARATION_DATE",
        label: "Declaration date",
        required: true,
        type: "DATE",
      },
    ],
  },
];

export function fundingApplicationForm(): StandardFormSeed {
  const definition = buildFundingApplicationDefinition(sections);
  return {
    code: "FUNDING_APPLICATION",
    description: "Reusable applicant-facing SME Fund application form.",
    fields: definition.fields,
    instructions:
      "Complete every required section and upload the requested supporting documents before submitting your application.",
    name: "Funding Application Form",
    publishOnSeed: true,
    sections: definition.sections,
    submitLabel: "Submit application",
  };
}
