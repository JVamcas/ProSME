import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { referenceWorkflowTransitionsFixture } from "./ReferenceWorkflowTransitionFixture";
import {
  emptyStageConditions,
  referenceTaskDefaults,
  reviewOutcomes,
  routingAction,
} from "./ReferenceWorkflowFixtureHelpers";

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
      ...emptyStageConditions,
      initial: true,
      publicStatusMapping: {
        status: "SUBMITTED",
        label: "Application received",
        description:
          "Your application has been received and is being prepared for review.",
      },
      actions: [routingAction("ADVANCE", "Advance")],
      tasks: [
        {
          stableKey: "PRE_SCREEN_CHECKLIST",
          actionKeys: ["ADVANCE"],
          name: "Pre-screening checklist",
          description: "Verify the initial eligibility and compliance checks.",
          ...referenceTaskDefaults(false),
          type: "CHECKLIST",
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
      ...emptyStageConditions,
      initial: false,
      publicStatusMapping: {
        status: "UNDER_REVIEW",
        label: "Completeness review",
        description:
          "We are checking that the required application information is present.",
      },
      actions: [routingAction("ADVANCE", "Advance")],
      tasks: [
        {
          stableKey: "COMPLETENESS_CHECK",
          actionKeys: ["ADVANCE"],
          name: "Completeness checklist",
          description: "Confirm that the submitted application is complete.",
          ...referenceTaskDefaults(false),
          type: "CHECKLIST",
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
      ...emptyStageConditions,
      initial: false,
      publicStatusMapping: {
        status: "UNDER_REVIEW",
        label: "Detailed review",
        description:
          "Your application is undergoing a detailed programme review.",
      },
      actions: [routingAction("ADVANCE", "Advance")],
      tasks: [
        {
          stableKey: "TECHNICAL_SCORE",
          actionKeys: ["ADVANCE"],
          name: "Technical assessment form",
          description: "Score the application against the technical criteria.",
          ...referenceTaskDefaults(true),
          type: "ASSESSMENT_FORM",
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
      ...emptyStageConditions,
      initial: false,
      publicStatusMapping: {
        status: "UNDER_REVIEW",
        label: "Financial review",
        description:
          "The financial information in your application is being reviewed.",
      },
      actions: [routingAction("ADVANCE", "Advance")],
      tasks: [
        {
          stableKey: "FINANCE_CHECK",
          actionKeys: ["ADVANCE"],
          name: "Finance review",
          description: "Review the financial information and recommendation.",
          ...referenceTaskDefaults(true),
          type: "FINANCE_REVIEW",
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
      ...emptyStageConditions,
      initial: false,
      publicStatusMapping: {
        status: "UNDER_REVIEW",
        label: "Final review",
        description: "Your application is in the final review step.",
      },
      actions: [routingAction("ADVANCE", "Advance")],
      tasks: [
        {
          stableKey: "PANEL_DECISION",
          actionKeys: ["ADVANCE"],
          name: "Record outcome",
          description: "Record the committee's funding decision.",
          ...referenceTaskDefaults(true),
          type: "DECISION",
          config: {
            outcomes: [
              { code: "APPROVE", label: "Approve" },
              { code: "DECLINE", label: "Decline" },
            ],
            authorityCapability: "workflow.task.assigned.decide",
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
      ...emptyStageConditions,
      initial: false,
      publicStatusMapping: {
        status: "OUTCOME_AVAILABLE",
        label: "Outcome available",
        description:
          "An outcome is available in your application workspace.",
      },
      actions: [routingAction("COMPLETE", "Complete workflow")],
      tasks: [
        {
          stableKey: "SEND_OUTCOME",
          actionKeys: ["COMPLETE"],
          name: "Send outcome communication",
          description: "Send the recorded outcome to the applicant.",
          ...referenceTaskDefaults(false),
          type: "COMMUNICATION",
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
  transitions: referenceWorkflowTransitionsFixture,
};
