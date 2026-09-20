import type { WorkflowStageInput } from "../definitions/WorkflowTypes";
import type { StandardWorkflowDependencies } from "./StandardWorkflowTypes";
import {
  approve,
  checklist,
  comment,
  documentRequirement,
  hold,
  refer,
  reject,
  returnAction,
  stage,
  task,
  yesNoChecklistConfig,
} from "./StandardWorkflowBuilders";

const option = (code: string, label: string) => ({ code, label });

function contracting(dependencies: StandardWorkflowDependencies) {
  const checklistItems = [
    checklist("AGREEMENT_FINALIZED", "Funding agreement and annexures are finalized", 1, "REQUIRED"),
    checklist("CONDITIONS_PRECEDENT", "Conditions precedent are verified", 2, "REQUIRED"),
    checklist("SIGNATURES_COMPLETE", "Required signatures are complete", 3, "REQUIRED"),
  ];
  const actions = [
    approve("EXECUTE_AGREEMENT", "Execute", 1),
    returnAction("RETURN_NEGOTIATION", "Return for negotiation", 2),
    reject("LAPSE_AWARD", "Lapse award on non-acceptance", 3, ["NON_ACCEPTANCE", "CONDITIONS_NOT_MET"]),
    refer("REALLOCATE_RESERVE", "Reallocate to reserve list", 4),
  ];
  return stage({
    actions,
    checklistItems,
    coiGated: false,
    commentFields: [comment("CONTRACTING_NOTES", "Contracting notes", 1)],
    description: "Finalize the agreement and verify conditions precedent.",
    displayOrder: 9,
    documentRequirements: [
      documentRequirement("Signed funding agreement and annexures", "APPLICANT"),
      documentRequirement("Banking verification", "APPLICANT"),
      documentRequirement("Insurance evidence", "APPLICANT", false),
      documentRequirement("Ethics or regulatory approvals", "APPLICANT", false),
    ],
    enabled: true,
    initial: false,
    name: "Contracting and Conditions Precedent",
    optional: false,
    publicStatusMapping: {
      description: "Contracting and award conditions are being finalized.",
      label: "Contracting",
      status: "ACTION_REQUIRED",
    },
    repeatable: false,
    scoring: null,
    slaHours: 240,
    stableKey: "CONTRACTING",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      config: yesNoChecklistConfig(checklistItems),
      description: "Finalize the agreement and verify every condition precedent.",
      displayOrder: 1,
      name: "Contract and conditions verification",
      roleCode: "contracts_officer",
      stableKey: "CONTRACTING_CHECKLIST",
      type: "CHECKLIST",
    })],
  });
}

function disbursement(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("APPROVE_PAYMENT", "Approve payment", 1),
    approve("PART_PAY", "Part-pay", 2),
    hold("WITHHOLD_REPORTS", "Withhold pending outstanding reports", 3, ["OUTSTANDING_REPORTS"]),
    refer("RECOVER_FUNDS", "Recover funds", 4),
    approve("NEXT_TRANCHE", "Create next tranche", 5),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist("MILESTONE_VALIDATED", "Claim milestone is validated", 1, "REQUIRED"),
      checklist("PRIOR_REPORTS_ACQUITTED", "Prior reports are acquitted", 2, "REQUIRED"),
      checklist("PAYMENT_CONDITIONS_MET", "Payment conditions are met", 3, "REQUIRED"),
      checklist("TAX_STATUS_VALID", "Tax status is valid", 4, "REQUIRED"),
    ],
    coiGated: false,
    commentFields: [comment("PAYMENT_REVIEW_COMMENTS", "Payment review comments", 1)],
    description: "Review and process one disbursement tranche.",
    displayOrder: 10,
    documentRequirements: [
      documentRequirement("Claim form or invoice", "APPLICANT"),
      documentRequirement("Expenditure report", "APPLICANT"),
      documentRequirement("Proof of prior expenditure", "APPLICANT"),
      documentRequirement("Re-verified tax status", "APPLICANT"),
    ],
    enabled: true,
    initial: false,
    name: "Disbursement",
    optional: false,
    publicStatusMapping: {
      description: "A payment claim is being processed.",
      label: "Payment processing",
      status: "UNDER_REVIEW",
    },
    repeatable: true,
    scoring: null,
    slaHours: 120,
    stableKey: "DISBURSEMENT",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      config: {
        fields: [
          { code: "CLAIM_AMOUNT", label: "Claim amount", required: true, type: "currency" },
          { code: "PAYMENT_RECOMMENDATION", label: "Payment recommendation", required: true, type: "textarea" },
        ],
        recommendations: actions.slice(0, 4).map((item) => option(item.stableKey, item.label)),
      },
      description: "Verify the tranche claim and record the payment recommendation.",
      displayOrder: 1,
      formCode: "DISBURSEMENT_REVIEW",
      name: "Disbursement review",
      roleCode: "financial_reviewer",
      stableKey: "DISBURSEMENT_REVIEW",
      type: "FINANCE_REVIEW",
    })],
  });
}

function monitoring(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("ACCEPT_REPORT", "Accept report", 1),
    returnAction("RETURN_REVISION", "Return for revision", 2),
    approve("APPROVE_VARIATION", "Approve variation", 3),
    approve("APPROVE_EXTENSION", "Approve no-cost extension", 4),
    hold("SUSPEND", "Suspend", 5, ["PERFORMANCE_CONCERN", "COMPLIANCE_BREACH"]),
    reject("TERMINATE_RECOVER", "Terminate and recover", 6, ["MATERIAL_BREACH", "FAILED_REMEDIATION"]),
    approve("NEXT_REPORTING_PERIOD", "Create next reporting period", 7),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist("REPORT_COMPLETE", "Narrative and financial report is complete", 1, "REQUIRED"),
      checklist("INDICATORS_VERIFIED", "Indicator results are verified", 2, "REQUIRED"),
      checklist("EVIDENCE_VERIFIED", "Portfolio of evidence is verified", 3, "REQUIRED"),
      checklist("CORRECTIVE_ACTIONS_RECORDED", "Required corrective actions are recorded", 4),
    ],
    coiGated: false,
    commentFields: [
      comment("MONITORING_FINDINGS", "Monitoring findings", 1, true),
      comment("CORRECTIVE_ACTION", "Corrective action", 2),
    ],
    description: "Review implementation performance for one reporting period.",
    displayOrder: 11,
    documentRequirements: [
      documentRequirement("Progress report", "APPLICANT"),
      documentRequirement("Financial report", "APPLICANT"),
      documentRequirement("Site visit report", "STAFF", false),
      documentRequirement("Portfolio of evidence", "APPLICANT"),
      documentRequirement("Variation request", "APPLICANT", false),
    ],
    enabled: true,
    initial: false,
    name: "Implementation Monitoring",
    optional: false,
    publicStatusMapping: {
      description: "Your implementation report is being reviewed.",
      label: "Reporting review",
      status: "UNDER_REVIEW",
    },
    repeatable: true,
    scoring: null,
    slaHours: 240,
    stableKey: "IMPLEMENTATION_MONITORING",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      config: {
        categories: [
          option("PERFORMANCE", "Performance"),
          option("DATA_QUALITY", "Data quality"),
          option("COMPLIANCE", "Compliance"),
        ],
        outcomes: [
          option("ON_TRACK", "On track"),
          option("AT_RISK", "At risk"),
          option("OFF_TRACK", "Off track"),
        ],
      },
      description: "Assess performance, data quality and compliance.",
      displayOrder: 1,
      formCode: "MONITORING_REVIEW",
      name: "Monitoring review",
      roleCode: "grant_me_officer",
      stableKey: "MONITORING_REVIEW",
      type: "DOCUMENT_REVIEW",
    })],
  });
}

function closeOut(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("CLOSE", "Close", 1),
    approve("CLOSE_QUALIFIED", "Close with qualification", 2),
    refer("REFER_RECOVERY_INVESTIGATION", "Refer for recovery or investigation", 3),
    reject("RESTRICT_FUTURE_FUNDING", "Restrict future funding", 4, [
      "MATERIAL_NON_PERFORMANCE",
      "UNRESOLVED_RECOVERY",
    ]),
  ];
  const criteria = [
    "Relevance",
    "Effectiveness",
    "Efficiency",
    "Impact",
    "Sustainability",
  ].map((label) => ({
    code: label.toUpperCase(),
    commentRequired: true,
    label,
    maximumScore: 5,
    weight: 20,
  }));
  return stage({
    actions,
    checklistItems: [
      checklist("FINAL_REPORTS_COMPLETE", "Final technical and financial reports are complete", 1, "REQUIRED"),
      checklist("ACQUITTAL_COMPLETE", "Final acquittal and audit are complete", 2, "REQUIRED"),
      checklist("ASSET_IP_RESOLVED", "Asset and intellectual-property disposition is resolved", 3),
      checklist("UNSPENT_FUNDS_RESOLVED", "Unspent funds are recovered or resolved", 4),
    ],
    coiGated: false,
    commentFields: [
      comment("MANAGEMENT_RESPONSE", "Management response", 1),
      comment("LESSONS_LEARNED", "Lessons learned", 2, true),
    ],
    description: "Evaluate results, complete acquittal and close the award.",
    displayOrder: 12,
    documentRequirements: [
      documentRequirement("Evaluation report", "STAFF"),
      documentRequirement("Final narrative report", "APPLICANT"),
      documentRequirement("Audited statement of expenditure", "APPLICANT"),
      documentRequirement("Completion certificate", "STAFF"),
      documentRequirement("Closure memorandum", "STAFF"),
    ],
    enabled: true,
    initial: false,
    name: "Evaluation and Close-out",
    optional: false,
    publicStatusMapping: {
      description: "The funded project has completed close-out.",
      label: "Closed",
      status: "CLOSED",
    },
    repeatable: false,
    scoring: {
      aggregation: "WEIGHTED_AVERAGE",
      criteria: criteria.map((criterion) => ({
        criterion: criterion.label,
        description: "Results-framework close-out assessment.",
        mandatoryComment: true,
        scaleMaximum: 5,
        scaleMinimum: 1,
        threshold: 3,
        weight: criterion.weight,
      })),
    },
    slaHours: 240,
    stableKey: "EVALUATION_CLOSE_OUT",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      config: { criteria },
      description: "Assess results and record the close-out recommendation.",
      displayOrder: 1,
      formCode: "EVALUATION_CLOSE_OUT_REVIEW",
      name: "Evaluation and close-out review",
      roleCode: "grant_me_officer",
      stableKey: "EVALUATION_CLOSE_OUT_REVIEW",
      type: "ASSESSMENT_FORM",
    })],
  });
}

export function createStandardPostAwardStages(
  dependencies: StandardWorkflowDependencies,
): WorkflowStageInput[] {
  return [
    contracting(dependencies),
    disbursement(dependencies),
    monitoring(dependencies),
    closeOut(dependencies),
  ];
}

