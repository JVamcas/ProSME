import type { WorkflowGraphInput } from "./WorkflowTypes";
import { referenceWorkflowTransitions } from "./ReferenceWorkflowTransitions";

const reviewOutcomes = [
  { code: "ACCEPT", label: "Accept" },
  { code: "RETURN", label: "Return for clarification" },
];

export const referenceWorkflow: WorkflowGraphInput = {
  stages: [
    {
      code: "PRE_SCREENING",
      name: "Submission and automated pre-screening",
      sequence: 1,
      initial: true,
      applicantStatus: "SUBMITTED",
      applicantLabel: "Application received",
      applicantDescription:
        "Your application has been received and is being prepared for review.",
      tasks: [
        {
          code: "AUTOMATED_PRE_SCREEN",
          name: "Automated pre-screening",
          type: "AUTOMATED_RULE_CHECK",
          sequence: 1,
          required: true,
          config: {
            rulesetCode: "TOR_DRAFT_PRE_SCREEN",
            ruleVersion: 1,
            inputs: ["eligibilityResult", "requestedAmount"],
            categories: [
              { code: "PRIORITY_REVIEW", label: "Priority review" },
              { code: "STANDARD_REVIEW", label: "Standard review" },
            ],
          },
        },
      ],
    },
    {
      code: "COMPLETENESS",
      name: "Completeness screening",
      sequence: 2,
      initial: false,
      applicantStatus: "UNDER_REVIEW",
      applicantLabel: "Completeness review",
      applicantDescription:
        "We are checking that the required application information is present.",
      tasks: [
        {
          code: "COMPLETENESS_CHECK",
          name: "Completeness checklist",
          type: "CHECKLIST",
          sequence: 1,
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
      code: "TECHNICAL_ASSESSMENT",
      name: "Technical assessment",
      sequence: 3,
      initial: false,
      applicantStatus: "UNDER_REVIEW",
      applicantLabel: "Detailed review",
      applicantDescription:
        "Your application is undergoing a detailed programme review.",
      tasks: [
        {
          code: "TECHNICAL_SCORE",
          name: "Technical assessment form",
          type: "ASSESSMENT_FORM",
          sequence: 1,
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
      code: "FINANCE_REVIEW",
      name: "Finance review",
      sequence: 4,
      initial: false,
      applicantStatus: "UNDER_REVIEW",
      applicantLabel: "Financial review",
      applicantDescription:
        "The financial information in your application is being reviewed.",
      tasks: [
        {
          code: "FINANCE_CHECK",
          name: "Finance review",
          type: "FINANCE_REVIEW",
          sequence: 1,
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
      code: "COMMITTEE_DECISION",
      name: "Committee decision",
      sequence: 5,
      initial: false,
      applicantStatus: "UNDER_REVIEW",
      applicantLabel: "Final review",
      applicantDescription: "Your application is in the final review step.",
      tasks: [
        {
          code: "PANEL_DECISION",
          name: "Record outcome",
          type: "DECISION",
          sequence: 1,
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
      code: "OUTCOME_COMMUNICATION",
      name: "Outcome communication",
      sequence: 6,
      initial: false,
      applicantStatus: "OUTCOME_AVAILABLE",
      applicantLabel: "Outcome available",
      applicantDescription:
        "An outcome is available in your application workspace.",
      tasks: [
        {
          code: "SEND_OUTCOME",
          name: "Send outcome communication",
          type: "COMMUNICATION",
          sequence: 1,
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
