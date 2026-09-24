import type { WorkflowStageInput } from "../definitions/WorkflowTypes";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import type { StandardWorkflowDependencies } from "./StandardWorkflowTypes";
import { eligibilityVerificationTask } from "./StandardEligibilityScreeningTask";
import {
  action,
  approve,
  checklist,
  comment,
  documentRequirement,
  refer,
  reject,
  requestInformation,
  stage,
  task,
  yesNoChecklistConfig,
} from "./StandardWorkflowBuilders";

const internalOption = (code: string, label: string) => ({ code, label });

function eligibilityCondition(
  id: string,
  path: "eligibility.manual_screening_required" | "eligibility.outcome",
  value: boolean | string,
): ConditionGroup {
  return {
    children: [{
      id: `${id.slice(0, -1)}2`,
      kind: "CONDITION",
      leftOperand: { key: path, kind: "FIELD" },
      operator: basicOperators.EQUALS,
      rightOperand: { kind: "CONSTANT", value },
    }],
    combinator: "AND",
    id,
    kind: "GROUP",
  };
}

function screening(dependencies: StandardWorkflowDependencies) {
  const checklistItems = [
    checklist("APPLICATION_COMPLETE", "Application information is complete", 1),
    checklist("DOCUMENTS_PRESENT", "Mandatory documents are present", 2, "REQUIRED"),
    checklist("DOCUMENTS_VALID", "Documents are valid and unexpired", 3, "REQUIRED"),
    checklist("ENTITY_VERIFIED", "Entity and registration evidence is verified", 4, "REQUIRED"),
    checklist("ELIGIBILITY_EVALUATED", "Authoritative eligibility evaluation is complete", 5),
  ];
  const actions = [
    {
      ...approve("ELIGIBLE_ADVANCE", "Eligible and advance", 1),
      condition: eligibilityCondition(
        "81000000-0000-4000-8000-000000000001",
        "eligibility.outcome",
        "ELIGIBLE",
      ),
    },
    {
      ...action(
        "MANUAL_ELIGIBILITY_ADVANCE",
        "Approve after manual eligibility review",
        "APPROVE_ADVANCE",
        2,
        {},
        true,
      ),
      condition: eligibilityCondition(
        "81000000-0000-4000-8000-000000000003",
        "eligibility.manual_screening_required",
        true,
      ),
    },
    {
      ...reject("INELIGIBLE_REJECT", "Ineligible", 3, [
        "ELIGIBILITY_FAILED",
        "MANDATORY_EVIDENCE_MISSING",
      ]),
      condition: eligibilityCondition(
        "81000000-0000-4000-8000-000000000005",
        "eligibility.outcome",
        "INELIGIBLE",
      ),
    },
    requestInformation(
      "REQUEST_ADDITIONAL_INFORMATION",
      "Request additional information",
      4,
    ),
    refer("REFER_INTERNAL_CLARIFICATION", "Refer for internal clarification", 5),
  ];
  return stage({
    actions,
    checklistItems,
    coiGated: false,
    commentFields: [
      comment("SCREENING_NOTES", "Screening notes", 1),
      comment("APPLICANT_GUIDANCE", "Applicant guidance", 2, false, "APPLICANT_VISIBLE"),
    ],
    description: "Verify completeness, documents and authoritative eligibility.",
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
      description: "Your application is being checked for completeness and eligibility.",
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
        config: yesNoChecklistConfig(checklistItems),
        description: "Complete the configured screening and evidence checklist.",
        displayOrder: 1,
        name: "Completeness and document screening",
        roleCode: "programme_officer",
        stableKey: "COMPLETENESS_SCREENING",
      }),
      eligibilityVerificationTask(dependencies),
      task(dependencies, {
        actionKeys: actions.map((item) => item.stableKey),
        config: {
          command: "AUTHORITATIVE_ELIGIBILITY",
          reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
        },
        description: "Record the authoritative eligibility outcome and route the application.",
        displayOrder: 3,
        name: "Authoritative eligibility decision",
        roleCode: "programme_officer",
        stableKey: "AUTHORITATIVE_ELIGIBILITY",
      }),
    ],
  });
}

function technicalAssessment(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("RECOMMEND", "Recommend", 1),
    approve("RECOMMEND_WITH_CONDITIONS", "Recommend with conditions", 2),
    approve("DO_NOT_RECOMMEND", "Do not recommend", 3),
    requestInformation("REQUEST_CLARIFICATION", "Request clarification", 4),
    action("ESCALATE_SCORING_DISCREPANCY", "Escalate scoring discrepancy", "ESCALATE", 5, {
      targetId: dependencies.roleIds.panel_moderator,
      targetType: "ROLE",
      trigger: "MANUAL",
    }),
  ];
  const criteria = [
    {
      commentRequired: true,
      code: "TECHNICAL_MERIT",
      label: "Technical merit and feasibility",
      maximumScore: 10,
      weight: 40,
    },
    {
      commentRequired: true,
      code: "EXPECTED_IMPACT",
      label: "Expected impact",
      maximumScore: 10,
      weight: 35,
    },
    {
      commentRequired: true,
      code: "DELIVERY_CAPACITY",
      label: "Delivery capacity",
      maximumScore: 10,
      weight: 25,
    },
  ];
  return stage({
    actions,
    checklistItems: [],
    coiGated: true,
    commentFields: [
      comment("STRENGTHS", "Strengths", 1, true),
      comment("WEAKNESSES", "Weaknesses", 2, true),
      comment("RECOMMENDED_CONDITIONS", "Recommended conditions", 3),
    ],
    description: "Perform independent technical or scientific assessment.",
    displayOrder: 2,
    documentRequirements: [
      documentRequirement("COI and confidentiality undertaking", "ASSIGNED_REVIEWER"),
      documentRequirement("Individual review report", "ASSIGNED_REVIEWER"),
    ],
    enabled: true,
    initial: false,
    name: "Technical or Scientific Assessment",
    optional: false,
    publicStatusMapping: {
      description: "Your application is undergoing detailed assessment.",
      label: "Detailed assessment",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    scoring: {
      aggregation: "WEIGHTED_AVERAGE",
      criteria: criteria.map((criterion) => ({
        criterion: criterion.label,
        description: "Standard baseline; confirm for each Funding Call.",
        mandatoryComment: criterion.commentRequired,
        scaleMaximum: criterion.maximumScore,
        scaleMinimum: 0,
        threshold: 5,
        weight: criterion.weight,
      })),
    },
    slaHours: 240,
    stableKey: "TECHNICAL_ASSESSMENT",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      coiRequired: true,
      config: { criteria },
      description: "Score the application and record an independent recommendation.",
      displayOrder: 1,
      formCode: "TECHNICAL_REVIEW",
      name: "Independent technical review",
      requiredCompletionCount: 2,
      reviewerCount: 3,
      roleCode: "sector_specialist",
      stableKey: "TECHNICAL_REVIEW",
    })],
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
      checklist("BUDGET_LINES_REVIEWED", "Every budget line has been reviewed", 1),
      checklist("CO_FUNDING_CONFIRMED", "Co-funding is confirmed", 2, "REQUIRED"),
      checklist("BUDGET_ARITHMETIC_VALID", "Adjusted budget arithmetic is valid", 3),
    ],
    coiGated: false,
    commentFields: [comment("FINANCIAL_REVIEW_COMMENTS", "Financial review comments", 1)],
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
      description: "Your application's financial information is being assessed.",
      label: "Financial assessment",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    scoring: null,
    slaHours: 240,
    stableKey: "FINANCIAL_REVIEW",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      config: {
        fields: [
          { code: "ADJUSTED_BUDGET", label: "Adjusted budget", required: true, type: "currency" },
          { code: "FINANCIAL_HEALTH_RATING", label: "Financial health rating", required: true, type: "single-select", options: [
            internalOption("LOW_RISK", "Low risk"),
            internalOption("MODERATE_RISK", "Moderate risk"),
            internalOption("HIGH_RISK", "High risk"),
          ] },
        ],
        recommendations: actions.slice(0, 2).concat(actions.slice(3)).map((item) => (
          internalOption(item.stableKey, item.label)
        )),
      },
      description: "Review the budget and record the financial recommendation.",
      displayOrder: 1,
      formCode: "FINANCE_REVIEW",
      name: "Financial review",
      roleCode: "financial_reviewer",
      stableKey: "FINANCIAL_REVIEW",
    })],
  });
}

function dueDiligence(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("PROCEED", "Proceed", 1),
    approve("PROCEED_WITH_CONDITIONS", "Proceed with conditions", 2),
    reject("DECLINE_RISK", "Decline on risk grounds", 3, [
      "UNACCEPTABLE_FINANCIAL_RISK",
      "UNACCEPTABLE_GOVERNANCE_RISK",
      "DEBARMENT_MATCH",
    ]),
    requestInformation("FURTHER_VERIFICATION", "Further verification required", 4),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist("ENTITY_VERIFIED", "Entity and governance details are verified", 1, "REQUIRED"),
      checklist("COMPLIANCE_CLEARED", "Compliance and debarment screening is complete", 2, "REQUIRED"),
      checklist("PRIOR_PERFORMANCE_REVIEWED", "Prior grant performance has been reviewed", 3),
    ],
    coiGated: false,
    commentFields: [comment("RISK_MITIGATION", "Risk mitigation measures", 1, true)],
    description: "Verify the entity and assess delivery, governance and fraud risk.",
    displayOrder: 4,
    documentRequirements: [
      documentRequirement("Due diligence or site visit report", "ASSIGNED_REVIEWER"),
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
      criteria: ["Financial risk", "Delivery risk", "Governance risk", "Fraud risk"].map(
        (criterion) => ({
          criterion,
          description: "Risk score from 1 (low) to 4 (critical).",
          mandatoryComment: true,
          scaleMaximum: 4,
          scaleMinimum: 1,
          threshold: 3,
          weight: 25,
        }),
      ),
    },
    slaHours: 240,
    stableKey: "DUE_DILIGENCE_RISK",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
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
    })],
  });
}

export function createStandardAssessmentStages(
  dependencies: StandardWorkflowDependencies,
): WorkflowStageInput[] {
  return [
    screening(dependencies),
    technicalAssessment(dependencies),
    financialReview(dependencies),
    dueDiligence(dependencies),
  ];
}
