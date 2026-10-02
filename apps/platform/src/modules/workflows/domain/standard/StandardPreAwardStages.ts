import type { WorkflowStageInput } from "../definitions/WorkflowTypes";
import { stableKeyFromLabel } from "../WorkflowStableKey";
import type { StandardWorkflowDependencies } from "./StandardWorkflowTypes";
import { createStandardTechnicalAssessmentStage } from "./StandardTechnicalAssessmentStage";
import {
  approve,
  checklist,
  documentRequirement,
  reject,
  requestInformation,
  stage,
  task,
} from "./StandardWorkflowBuilders";

const internalOption = (code: string, label: string) => ({ code, label });

function screening(dependencies: StandardWorkflowDependencies) {
  const checklistItems = [
    checklist("APPLICATION_COMPLETE", "Application information is complete", 1),
    checklist(
      "DOCUMENTS_PRESENT",
      "Mandatory documents are present",
      2,
      "REQUIRED",
    ),
    checklist(
      "DOCUMENTS_VALID",
      "Documents are valid and unexpired",
      3,
      "REQUIRED",
    ),
    checklist(
      "ENTITY_VERIFIED",
      "Entity and registration evidence is verified",
      4,
      "REQUIRED",
    ),
    checklist(
      "ELIGIBILITY_EVALUATED",
      "Authoritative eligibility evaluation is complete",
      5,
    ),
  ];
  const actions = [
    approve("ELIGIBLE_ADVANCE", "Approve and advance", 1),
    reject("INELIGIBLE_REJECT", "Reject", 2),
  ];
  return stage({
    actions,
    checklistItems,
    coiGated: false,
    coiFormVersionId: null,
    description:
      "Verify completeness, documents and authoritative eligibility.",
    displayOrder: 1,
    documentRequirements: [
      documentRequirement("Verification evidence", "STAFF"),
      documentRequirement("RFI correspondence", "STAFF", false),
    ],
    enabled: true,
    initial: true,
    name: "Administrative and Eligibility Screening",
    optional: false,
    publicStatusMapping: {
      description:
        "Your application is being checked for completeness and eligibility.",
      label: "Application under assessment",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    scoring: null,
    slaHours: 120,
    stableKey: "ADMIN_ELIGIBILITY_SCREENING",
    tasks: [
      task(dependencies, {
        actionKeys: [],
        taskType: "CONTRIBUTING",
        config: {},
        description:
          "Complete the configured screening and evidence checklist.",
        displayOrder: 1,
        name: "Completeness and document screening",
        roleCode: "programme_officer",
        stableKey: "COMPLETENESS_SCREENING",
      }),
      task(dependencies, {
        actionKeys: actions.map((item) => item.stableKey),
        taskType: "STAGE_DECISION",
        config: {
          hardFailureStatus: "INELIGIBLE",
          command: "AUTHORITATIVE_ELIGIBILITY",
          reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
        },
        description:
          "Record the authoritative eligibility outcome and route the application.",
        displayOrder: 2,
        formCode: "ELIGIBILITY_VERIFICATION",
        name: "Authoritative eligibility decision",
        roleCode: "programme_officer",
        stableKey: "AUTHORITATIVE_ELIGIBILITY",
      }),
    ],
  });
}

function financialReview(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("APPROVE_AS_SUBMITTED", "Approve as submitted", 1),
    approve("APPROVE_WITH_ADJUSTMENTS", "Approve with adjustments", 2),
    requestInformation("REQUEST_REVISED_BUDGET", "Request revised budget", 3),
    approve("NOT_SUPPORTED", "Not supported", 4),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist(
        "BUDGET_LINES_REVIEWED",
        "Every budget line has been reviewed",
        1,
      ),
      checklist(
        "CO_FUNDING_CONFIRMED",
        "Co-funding is confirmed",
        2,
        "REQUIRED",
      ),
      checklist(
        "BUDGET_ARITHMETIC_VALID",
        "Adjusted budget arithmetic is valid",
        3,
      ),
    ],
    coiGated: false,
    coiFormVersionId: null,
    description: "Assess the budget, cost eligibility and financial viability.",
    displayOrder: 3,
    documentRequirements: [
      documentRequirement("Annual financial statements", "APPLICANT"),
      documentRequirement("Management accounts", "APPLICANT"),
      documentRequirement("Budget narrative", "APPLICANT"),
      documentRequirement("Capital item quotations", "APPLICANT", false),
      documentRequirement("Banking confirmation", "APPLICANT"),
      documentRequirement("Financial review memorandum", "ASSIGNED_REVIEWER"),
    ],
    enabled: true,
    initial: false,
    name: "Financial and Budget Review",
    optional: false,
    publicStatusMapping: {
      description:
        "Your application's financial information is being assessed.",
      label: "Financial assessment",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    scoring: null,
    slaHours: 240,
    stableKey: "FINANCIAL_REVIEW",
    tasks: [
      task(dependencies, {
        actionKeys: actions.map((item) => item.stableKey),
        taskType: "STAGE_DECISION",
        config: {
          fields: [
            {
              code: "ADJUSTED_BUDGET",
              label: "Adjusted budget",
              required: true,
              type: "currency",
            },
            {
              code: "FINANCIAL_HEALTH_RATING",
              label: "Financial health rating",
              required: true,
              type: "single-select",
              options: [
                internalOption("LOW_RISK", "Low risk"),
                internalOption("MODERATE_RISK", "Moderate risk"),
                internalOption("HIGH_RISK", "High risk"),
              ],
            },
          ],
          recommendations: actions
            .slice(0, 2)
            .concat(actions.slice(3))
            .map((item) => internalOption(item.stableKey, item.label)),
        },
        description:
          "Review the budget and record the financial recommendation.",
        displayOrder: 1,
        formCode: "FINANCE_REVIEW",
        name: "Financial review",
        roleCode: "financial_reviewer",
        stableKey: "FINANCIAL_REVIEW",
      }),
    ],
  });
}

function dueDiligence(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("PROCEED", "Proceed", 1),
    approve("PROCEED_WITH_CONDITIONS", "Proceed with conditions", 2),
    reject("DECLINE_RISK", "Decline on risk grounds", 3),
    requestInformation(
      "FURTHER_VERIFICATION",
      "Request For Information",
      4,
    ),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist(
        "ENTITY_VERIFIED",
        "Entity and governance details are verified",
        1,
        "REQUIRED",
      ),
      checklist(
        "COMPLIANCE_CLEARED",
        "Compliance and debarment screening is complete",
        2,
        "REQUIRED",
      ),
      checklist(
        "PRIOR_PERFORMANCE_REVIEWED",
        "Prior grant performance has been reviewed",
        3,
      ),
    ],
    coiGated: false,
    coiFormVersionId: null,
    description:
      "Verify the entity and assess delivery, governance and fraud risk.",
    displayOrder: 4,
    documentRequirements: [
      documentRequirement(
        "Due diligence or site visit report",
        "ASSIGNED_REVIEWER",
      ),
      documentRequirement("Tax status confirmation", "APPLICANT"),
      documentRequirement("Compliance screening results", "ASSIGNED_REVIEWER"),
      documentRequirement("Prior grant performance report", "STAFF", false),
    ],
    enabled: true,
    initial: false,
    name: "Due Diligence and Risk Assessment",
    optional: true,
    publicStatusMapping: {
      description: "Your application is undergoing due diligence.",
      label: "Due diligence",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    scoring: {
      aggregation: "AVERAGE",
      taskStableKey: "DUE_DILIGENCE_REVIEW",
      criteria: [
        "Financial risk",
        "Delivery risk",
        "Governance risk",
        "Fraud risk",
      ].map((criterion) => ({
        criterion,
        stableKey: stableKeyFromLabel(criterion, "SCORE"),
        description: "Risk score from 1 (low) to 4 (critical).",
        mandatoryComment: true,
        scaleMaximum: 4,
        scaleMinimum: 1,
        weight: 25,
      })),
    },
    slaHours: 240,
    stableKey: "DUE_DILIGENCE_RISK",
    tasks: [
      task(dependencies, {
        actionKeys: actions.map((item) => item.stableKey),
        taskType: "STAGE_DECISION",
        config: {
          categories: [
            internalOption("ENTITY", "Entity and governance"),
            internalOption("COMPLIANCE", "Compliance and debarment"),
            internalOption("CAPACITY", "Delivery capacity"),
          ],
          outcomes: [
            internalOption("VERIFIED", "Verified"),
            internalOption("CONCERN", "Concern identified"),
            internalOption("FAILED", "Failed verification"),
          ],
        },
        description: "Record due diligence findings, risks and mitigations.",
        displayOrder: 1,
        formCode: "DUE_DILIGENCE_RISK",
        name: "Due diligence review",
        roleCode: "due_diligence_officer",
        stableKey: "DUE_DILIGENCE_REVIEW",
      }),
    ],
  });
}

export function createStandardAssessmentStages(
  dependencies: StandardWorkflowDependencies,
): WorkflowStageInput[] {
  return [
    screening(dependencies),
    createStandardTechnicalAssessmentStage(dependencies),
    financialReview(dependencies),
    dueDiligence(dependencies),
  ];
}
