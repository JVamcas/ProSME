import {
  buildFundingApplicationDefinition,
  type FundingApplicationSectionSeed,
} from "./FundingApplicationFormBuilder";
import type { StandardFormSeed } from "./StandardFormDefinition";

const confirmationOption = [{ key: "CONFIRMED", label: "I confirm" }];

const consentOption = [{ key: "CONSENT_GRANTED", label: "I consent" }];

const sections: FundingApplicationSectionSeed[] = [
  {
    description: "Provide registration and statutory compliance information.",
    key: "REGISTRATION_AND_TAX",
    title: "Registration and tax information",
    fields: [
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
        type: "RICH_TEXT",
        columnSpan: 2,
      },
      {
        key: "PROJECT_OBJECTIVES",
        label: "Project objectives",
        required: true,
        type: "RICH_TEXT",
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
        key: "BUDGET_LINES",
        label: "Budget lines",
        required: true,
        type: "REPEATABLE_GROUP",
        columnSpan: 2,
        repeatable: {
          addLabel: "Add budget line",
          itemLabel: "Budget line",
          maximumItems: 100,
          minimumItems: 1,
          fields: [
            {
              columnSpan: 1,
              key: "CATEGORY",
              label: "Category",
              order: 1,
              required: true,
              type: "TEXT",
            },
            {
              columnSpan: 1,
              key: "AMOUNT",
              label: "Amount",
              minimum: 0,
              order: 2,
              required: true,
              type: "CURRENCY",
            },
            {
              columnSpan: 1,
              key: "DESCRIPTION",
              label: "Description",
              order: 3,
              required: true,
              type: "TEXT",
            },
          ],
        },
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
        key: "TEAM_MEMBERS",
        label: "Team members",
        required: true,
        type: "REPEATABLE_GROUP",
        columnSpan: 2,
        repeatable: {
          addLabel: "Add team member",
          itemLabel: "Team member",
          maximumItems: 30,
          minimumItems: 1,
          fields: [
            {
              columnSpan: 1,
              key: "NAME",
              label: "Name",
              order: 1,
              required: true,
              type: "TEXT",
            },
            {
              columnSpan: 1,
              key: "ROLE",
              label: "Role",
              order: 2,
              required: true,
              type: "TEXT",
            },
            {
              columnSpan: 1,
              key: "EXPERIENCE",
              label: "Relevant experience",
              order: 3,
              required: true,
              type: "RICH_TEXT",
            },
          ],
        },
      },
      {
        key: "TEAM_CV_DOCUMENT",
        label: "Team CV document",
        type: "DOCUMENT",
      },
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
        type: "RICH_TEXT",
        columnSpan: 2,
      },
      {
        key: "PROJECT_INDICATORS",
        label: "Project indicators",
        required: true,
        type: "REPEATABLE_GROUP",
        columnSpan: 2,
        repeatable: {
          addLabel: "Add indicator",
          itemLabel: "Indicator",
          maximumItems: 50,
          minimumItems: 1,
          fields: [
            {
              columnSpan: 1,
              key: "NAME",
              label: "Indicator name",
              order: 1,
              required: true,
              type: "TEXT",
            },
            {
              columnSpan: 1,
              key: "UNIT",
              label: "Unit of measure",
              order: 2,
              required: true,
              type: "TEXT",
            },
            {
              columnSpan: 1,
              key: "BASELINE",
              label: "Baseline",
              order: 3,
              required: true,
              type: "TEXT",
            },
            {
              columnSpan: 1,
              key: "TARGET",
              label: "Target",
              order: 4,
              required: true,
              type: "TEXT",
            },
            {
              columnSpan: 1,
              key: "EVIDENCE_SOURCE",
              label: "Evidence source",
              order: 5,
              required: true,
              type: "TEXT",
            },
          ],
        },
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
    purpose: "FUNDING_APPLICATION",
    description: "Reusable applicant-facing SME Fund application form.",
    displayMode: "STEPS",
    fields: definition.fields,
    instructions:
      "",
    name: "Funding Application Form",
    publishOnSeed: true,
    sections: definition.sections,
    submissionMode: "EXPLICIT",
    submitLabel: "Submit application",
  };
}
