import type { WorkflowStageInput } from "../definitions/WorkflowTypes";
import type { StandardWorkflowDependencies } from "./StandardWorkflowTypes";
import {
  approve,
  checklist,
  comment,
  deferDate,
  documentRequirement,
  reject,
  returnAction,
  stage,
  task,
} from "./StandardWorkflowBuilders";

const option = (code: string, label: string) => ({ code, label });

function moderation(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("SHORTLIST_COMMITTEE", "Shortlist for committee", 1),
    deferDate("PLACE_RESERVE_LIST", "Place on reserve list", 2),
    reject("UNSUCCESSFUL", "Unsuccessful", 3, ["BELOW_CUTOFF", "BUDGET_CONSTRAINT"]),
    returnAction("RETURN_REVIEW", "Return for re-review", 4),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist("PARALLEL_REVIEWS_COMPLETE", "Technical and Financial reviews are complete", 1),
      checklist("OUTLIERS_RESOLVED", "Scoring outliers are resolved", 2),
      checklist("BUDGET_ENVELOPE_CHECKED", "Provisional allocations fit the budget envelope", 3),
    ],
    coiGated: true,
    commentFields: [comment("MODERATION_COMMENTS", "Moderation comments", 1)],
    description: "Consolidate reviews, rank applications and prepare the shortlist.",
    displayOrder: 5,
    documentRequirements: [
      documentRequirement("Moderation report", "STAFF"),
      documentRequirement("Ranked list", "STAFF"),
      documentRequirement("Attendance register", "STAFF"),
      documentRequirement("Panel declarations", "STAFF"),
    ],
    enabled: true,
    initial: false,
    name: "Moderation and Consolidation",
    optional: false,
    publicStatusMapping: {
      description: "Assessment outcomes are being consolidated.",
      label: "Assessment consolidation",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    scoring: null,
    slaHours: 120,
    stableKey: "MODERATION",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      config: {
        options: actions.map((item) => option(item.stableKey, item.label)),
        rationaleRequired: true,
      },
      description: "Consolidate scores and record the moderation outcome.",
      displayOrder: 1,
      formCode: "MODERATION",
      name: "Moderation decision",
      roleCode: "panel_moderator",
      stableKey: "MODERATION_DECISION",
      type: "RECOMMENDATION",
    })],
  });
}

function committeeReview(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("RECOMMEND_APPROVAL", "Recommend for approval", 1),
    deferDate("DEFER_PENDING_INFORMATION", "Defer pending information", 2),
    reject("DECLINE", "Decline", 3, ["STRATEGIC_MISALIGNMENT", "BUDGET_UNAVAILABLE"]),
    deferDate("PLACE_RESERVE_LIST", "Place on reserve list", 4),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist("QUORUM_CONFIRMED", "Committee quorum is confirmed", 1),
      checklist("COI_DECLARATIONS_COMPLETE", "Member COI declarations are complete", 2),
      checklist("BUDGET_AVAILABLE", "Budget availability is confirmed", 3),
    ],
    coiGated: true,
    commentFields: [
      comment("DISSENTING_VIEWS", "Dissenting views", 1),
      comment("COMMITTEE_COMMENTS", "Committee comments", 2),
    ],
    description: "Record committee deliberation and award recommendation.",
    displayOrder: 6,
    documentRequirements: [
      documentRequirement("Committee pack", "STAFF"),
      documentRequirement("Committee minutes", "STAFF"),
      documentRequirement("Resolution register", "STAFF"),
      documentRequirement("Attendance and COI records", "STAFF"),
    ],
    enabled: true,
    initial: false,
    name: "Committee or Adjudication Review",
    optional: false,
    publicStatusMapping: {
      description: "Your application is undergoing decision review.",
      label: "Decision review",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    scoring: null,
    slaHours: 120,
    stableKey: "COMMITTEE_REVIEW",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      coiRequired: true,
      config: {
        authorityCapability: "workflow.task.assigned.decide",
        outcomes: actions.map((item) => option(item.stableKey, item.label)),
        rationaleRequired: true,
      },
      description: "Record quorum, resolution and committee recommendation.",
      displayOrder: 1,
      formCode: "COMMITTEE_REVIEW",
      name: "Committee decision",
      quorum: true,
      requiredCompletionCount: 3,
      reviewerCount: 5,
      roleCode: "approval_panel_member",
      stableKey: "COMMITTEE_DECISION",
      type: "DECISION",
    })],
  });
}

function approval(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("APPROVE", "Approve", 1),
    approve("APPROVE_WITH_CONDITIONS", "Approve with conditions", 2),
    approve("PARTIAL_APPROVAL", "Partially approve at reduced amount", 3),
    reject(
      "DECLINE",
      "Decline",
      4,
      ["AUTHORITY_DECLINED", "BUDGET_UNAVAILABLE"],
      "TRANSITION",
    ),
    returnAction("REFER_COMMITTEE", "Refer back to committee", 5),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist("DELEGATION_VALID", "Approver authority covers the decision amount", 1, "REQUIRED"),
      checklist("BUDGET_CONFIRMED", "Budget availability is confirmed", 2),
    ],
    coiGated: false,
    commentFields: [comment("APPROVAL_COMMENTS", "Approval comments", 1)],
    description: "Record the delegated approval and award decision.",
    displayOrder: 7,
    documentRequirements: [
      documentRequirement("Approval memorandum", "STAFF"),
      documentRequirement("Signed resolution", "STAFF"),
      documentRequirement("Delegation of authority evidence", "STAFF"),
    ],
    enabled: true,
    initial: false,
    name: "Approval and Award Decision",
    optional: false,
    publicStatusMapping: {
      description: "A decision is being finalized before release.",
      label: "Decision pending release",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    scoring: null,
    slaHours: 120,
    stableKey: "APPROVAL_AWARD_DECISION",
    tasks: [task(dependencies, {
      actionKeys: actions.map((item) => item.stableKey),
      config: {
        authorityCapability: "workflow.task.assigned.decide",
        outcomes: actions.map((item) => option(item.stableKey, item.label)),
        rationaleRequired: true,
      },
      description: "Validate delegated authority and record the award decision.",
      displayOrder: 1,
      formCode: "APPROVAL",
      name: "Delegated approval",
      roleCode: "delegated_approver",
      stableKey: "DELEGATED_APPROVAL",
      type: "DECISION",
    })],
  });
}

function notificationAppeals(dependencies: StandardWorkflowDependencies) {
  const actions = [
    approve("CONTINUE_CONTRACTING", "Continue to contracting", 1),
    approve("CLOSE_UNSUCCESSFUL", "Close unsuccessful application", 2),
    returnAction("UPHOLD_APPEAL", "Uphold appeal", 3),
    returnAction("PARTIALLY_UPHOLD", "Partially uphold appeal", 4),
  ];
  return stage({
    actions,
    checklistItems: [
      checklist("OUTCOME_ISSUED", "Outcome notification has been issued", 1),
      checklist("FEEDBACK_RELEASED", "Approved feedback has been released", 2),
      checklist("APPEAL_WINDOW_RESOLVED", "Appeal window has closed or the appeal is resolved", 3),
    ],
    coiGated: false,
    commentFields: [
      comment("APPLICANT_FEEDBACK", "Applicant feedback", 1, false, "APPLICANT_VISIBLE"),
      comment("APPEAL_RATIONALE", "Appeal rationale", 2),
    ],
    description: "Issue outcomes, release feedback and resolve appeals.",
    displayOrder: 8,
    documentRequirements: [
      documentRequirement("Award or regret letter", "STAFF"),
      documentRequirement("Feedback report", "STAFF", false),
      documentRequirement("Appeal submission", "APPLICANT", false),
      documentRequirement("Appeal ruling", "STAFF", false),
    ],
    enabled: true,
    initial: false,
    name: "Notification, Feedback and Appeals",
    optional: false,
    publicStatusMapping: {
      description: "Your application outcome is available.",
      label: "Outcome issued",
      status: "OUTCOME_AVAILABLE",
    },
    repeatable: false,
    scoring: null,
    slaHours: 240,
    stableKey: "NOTIFICATION_APPEALS",
    tasks: [
      task(dependencies, {
        actionKeys: [],
        config: {
          audience: "APPLICANT",
          channel: "EMAIL",
          template: "APPLICATION_OUTCOME",
          trigger: "DECISION_RECORDED",
        },
        description: "Issue the outcome and approved feedback to the applicant.",
        displayOrder: 1,
        name: "Issue outcome",
        roleCode: "programme_officer",
        stableKey: "ISSUE_OUTCOME",
        type: "COMMUNICATION",
      }),
      task(dependencies, {
        actionKeys: actions.map((item) => item.stableKey),
        config: {
          authorityCapability: "workflow.task.assigned.decide",
          outcomes: actions.map((item) => option(item.stableKey, item.label)),
          rationaleRequired: true,
        },
        description: "Resolve the appeal window and any submitted appeal.",
        displayOrder: 2,
        formCode: "APPEAL_REVIEW",
        name: "Resolve notification and appeal",
        roleCode: "programme_officer",
        stableKey: "APPEAL_DECISION",
        type: "DECISION",
      }),
    ],
  });
}

export function createStandardDecisionStages(
  dependencies: StandardWorkflowDependencies,
): WorkflowStageInput[] {
  return [
    moderation(dependencies),
    committeeReview(dependencies),
    approval(dependencies),
    notificationAppeals(dependencies),
  ];
}
