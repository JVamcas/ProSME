import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { referenceWorkflowTransitions } from "./ReferenceWorkflowTransitions";

const reviewOutcomes = [
  { code: "ACCEPT", label: "Accept" },
  { code: "RETURN", label: "Return for clarification" },
];

export const referenceWorkflow: WorkflowGraphInput = {
  stages: [
    {
      stableKey: "PRE_SCREENING",
      name: "Submission and pre-screening",
      description: "Receive and pre-screen the submitted application.",
      enabled: true,
      optional: false,
      displayOrder: 1,
      repeatable: false,
      coiGated: false,
      initial: true,
      publicStatusMapping: {
        status: "SUBMITTED",
        label: "Application received",
        description:
          "Your application has been received and is being prepared for review.",
      },
      actions: [],
      tasks: [
        {
          stableKey: "PRE_SCREEN_CHECKLIST",
          name: "Pre-screening checklist",
          description: "Verify the initial eligibility and compliance checks.",
          assignmentMode: "ROLE",
          reviewerCount: 1,
          requiredCompletionCount: 1,
          quorum: false,
          coiRequired: false,
          type: "CHECKLIST",
          displayOrder: 1,
          required: true,
          config: {
            items: [
              {
                code: "NAMIBIAN_OWNERSHIP",
                label: "At least 51% Namibian-owned",
                required: true,
              },
              {
                code: "STATUTORY_COMPLIANCE",
                label: "Compliant with relevant statutory institutions",
                required: true,
              },
              {
                code: "NIPDB_MSME_REGISTRATION",
                label: "Registered on the NIPDB MSME database",
                required: true,
              },
              {
                code: "OPERATING_HISTORY",
                label: "Operating for at least one year",
                required: true,
              },
            ],
          },
        },
      ],
    },
    {
      stableKey: "COMPLETENESS",
      name: "Completeness screening",
      description: "Check that the application information is complete.",
      enabled: true,
      optional: false,
      displayOrder: 2,
      repeatable: false,
      coiGated: false,
      initial: false,
      publicStatusMapping: {
        status: "UNDER_REVIEW",
        label: "Completeness review",
        description:
          "We are checking that the required application information is present.",
      },
      actions: [],
      tasks: [
        {
          stableKey: "COMPLETENESS_CHECK",
          name: "Completeness checklist",
          description: "Confirm that the submitted application is complete.",
          assignmentMode: "ROLE",
          reviewerCount: 1,
          requiredCompletionCount: 1,
          quorum: false,
          coiRequired: false,
          type: "CHECKLIST",
          displayOrder: 1,
          required: true,
          config: {
            items: [
              {
                code: "FORM",
                label: "Application form is complete",
                required: true,
              },
              {
                code: "EVIDENCE",
                label: "Required evidence is present",
                required: true,
              },
            ],
          },
        },
      ],
    },
    {
      stableKey: "TECHNICAL_ASSESSMENT",
      name: "Technical assessment",
      description: "Assess the application's technical merits.",
      enabled: true,
      optional: false,
      displayOrder: 3,
      repeatable: false,
      coiGated: true,
      initial: false,
      publicStatusMapping: {
        status: "UNDER_REVIEW",
        label: "Detailed review",
        description:
          "Your application is undergoing a detailed programme review.",
      },
      actions: [],
      tasks: [
        {
          stableKey: "TECHNICAL_SCORE",
          name: "Technical assessment form",
          description: "Score the application against the technical criteria.",
          assignmentMode: "ROLE",
          reviewerCount: 1,
          requiredCompletionCount: 1,
          quorum: false,
          coiRequired: true,
          type: "ASSESSMENT_FORM",
          displayOrder: 1,
          required: true,
          config: {
            criteria: [
              {
                code: "VIABILITY",
                label: "Business viability",
                maximumScore: 10,
                weight: 1,
                commentRequired: true,
              },
              {
                code: "IMPACT",
                label: "Expected impact",
                maximumScore: 10,
                weight: 1,
                commentRequired: true,
              },
            ],
          },
        },
      ],
    },
    {
      stableKey: "FINANCE_REVIEW",
      name: "Finance review",
      description: "Review the application's financial information.",
      enabled: true,
      optional: false,
      displayOrder: 4,
      repeatable: false,
      coiGated: true,
      initial: false,
      publicStatusMapping: {
        status: "UNDER_REVIEW",
        label: "Financial review",
        description:
          "The financial information in your application is being reviewed.",
      },
      actions: [],
      tasks: [
        {
          stableKey: "FINANCE_CHECK",
          name: "Finance review",
          description: "Review the financial information and recommendation.",
          assignmentMode: "ROLE",
          reviewerCount: 1,
          requiredCompletionCount: 1,
          quorum: false,
          coiRequired: true,
          type: "FINANCE_REVIEW",
          displayOrder: 1,
          required: true,
          config: {
            fields: [
              {
                code: "AFFORDABILITY",
                label: "Affordability notes",
                type: "textarea",
                required: true,
              },
            ],
            recommendations: reviewOutcomes,
          },
        },
      ],
    },
    {
      stableKey: "COMMITTEE_DECISION",
      name: "Committee decision",
      description: "Record the committee's funding decision.",
      enabled: true,
      optional: false,
      displayOrder: 5,
      repeatable: false,
      coiGated: true,
      initial: false,
      publicStatusMapping: {
        status: "UNDER_REVIEW",
        label: "Final review",
        description: "Your application is in the final review step.",
      },
      actions: [],
      tasks: [
        {
          stableKey: "PANEL_DECISION",
          name: "Record outcome",
          description: "Record the committee's funding decision.",
          assignmentMode: "ROLE",
          reviewerCount: 1,
          requiredCompletionCount: 1,
          quorum: false,
          coiRequired: true,
          type: "DECISION",
          displayOrder: 1,
          required: true,
          config: {
            outcomes: [
              { code: "APPROVE", label: "Approve" },
              { code: "DECLINE", label: "Decline" },
            ],
            authorityCapability: "application.decide",
            rationaleRequired: true,
          },
        },
      ],
    },
    {
      stableKey: "OUTCOME_COMMUNICATION",
      name: "Outcome communication",
      description: "Communicate the recorded outcome to the applicant.",
      enabled: true,
      optional: false,
      displayOrder: 6,
      repeatable: false,
      coiGated: false,
      initial: false,
      publicStatusMapping: {
        status: "OUTCOME_AVAILABLE",
        label: "Outcome available",
        description:
          "An outcome is available in your application workspace.",
      },
      actions: [],
      tasks: [
        {
          stableKey: "SEND_OUTCOME",
          name: "Send outcome communication",
          description: "Send the recorded outcome to the applicant.",
          assignmentMode: "ROLE",
          reviewerCount: 1,
          requiredCompletionCount: 1,
          quorum: false,
          coiRequired: false,
          type: "COMMUNICATION",
          displayOrder: 1,
          required: true,
          config: {
            template: "TOR_DRAFT_OUTCOME",
            channel: "EMAIL",
            audience: "APPLICANT",
            trigger: "DECISION_RECORDED",
          },
        },
      ],
    },
  ],
  transitions: referenceWorkflowTransitions,
};
