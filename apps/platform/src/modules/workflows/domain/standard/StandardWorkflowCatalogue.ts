import type { WorkflowTransitionInput } from "../definitions/WorkflowTypes";
import { createStandardDecisionStages } from "./StandardDecisionStages";
import { createStandardPostAwardStages } from "./StandardPostAwardStages";
import { createStandardAssessmentStages } from "./StandardPreAwardStages";
import {
  standardWorkflowCode,
  type StandardWorkflowDependencies,
  type StandardWorkflowDraft,
} from "./StandardWorkflowTypes";

function target(
  sourceStageKey: string,
  actionKey: string,
  targetStageKey: string,
  priority = 1,
): WorkflowTransitionInput {
  return {
    actionKey,
    condition: null,
    priority,
    sourceStageKey,
    targetStageKey,
  };
}

function terminal(
  sourceStageKey: string,
  actionKey: string,
  terminalOutcome: string,
  priority = 1,
): WorkflowTransitionInput {
  return {
    actionKey,
    condition: null,
    priority,
    sourceStageKey,
    terminalOutcome,
  };
}

function standardTransitions(): WorkflowTransitionInput[] {
  return [
    target("ADMIN_ELIGIBILITY_SCREENING", "ELIGIBLE_ADVANCE", "TECHNICAL_ASSESSMENT", 1),
    target("ADMIN_ELIGIBILITY_SCREENING", "ELIGIBLE_ADVANCE", "FINANCIAL_REVIEW", 2),
    target("ADMIN_ELIGIBILITY_SCREENING", "MANUAL_ELIGIBILITY_ADVANCE", "TECHNICAL_ASSESSMENT", 1),
    target("ADMIN_ELIGIBILITY_SCREENING", "MANUAL_ELIGIBILITY_ADVANCE", "FINANCIAL_REVIEW", 2),
    terminal("ADMIN_ELIGIBILITY_SCREENING", "INELIGIBLE_REJECT", "INELIGIBLE"),

    target("TECHNICAL_ASSESSMENT", "RECOMMEND", "DUE_DILIGENCE_RISK"),
    target("TECHNICAL_ASSESSMENT", "RECOMMEND_WITH_CONDITIONS", "DUE_DILIGENCE_RISK"),
    target("TECHNICAL_ASSESSMENT", "DO_NOT_RECOMMEND", "DUE_DILIGENCE_RISK"),

    target("FINANCIAL_REVIEW", "APPROVE_AS_SUBMITTED", "DUE_DILIGENCE_RISK"),
    target("FINANCIAL_REVIEW", "APPROVE_WITH_ADJUSTMENTS", "DUE_DILIGENCE_RISK"),
    target("FINANCIAL_REVIEW", "NOT_SUPPORTED", "DUE_DILIGENCE_RISK"),

    target("DUE_DILIGENCE_RISK", "PROCEED", "MODERATION"),
    target("DUE_DILIGENCE_RISK", "PROCEED_WITH_CONDITIONS", "MODERATION"),
    terminal("DUE_DILIGENCE_RISK", "DECLINE_RISK", "DECLINED_RISK"),

    target("MODERATION", "SHORTLIST_COMMITTEE", "COMMITTEE_REVIEW"),
    terminal("MODERATION", "PLACE_RESERVE_LIST", "RESERVE_LIST"),
    terminal("MODERATION", "UNSUCCESSFUL", "UNSUCCESSFUL"),
    target("MODERATION", "RETURN_REVIEW", "TECHNICAL_ASSESSMENT"),

    target("COMMITTEE_REVIEW", "RECOMMEND_APPROVAL", "APPROVAL_AWARD_DECISION"),
    terminal("COMMITTEE_REVIEW", "DEFER_PENDING_INFORMATION", "DEFERRED"),
    terminal("COMMITTEE_REVIEW", "DECLINE", "DECLINED_COMMITTEE"),
    terminal("COMMITTEE_REVIEW", "PLACE_RESERVE_LIST", "RESERVE_LIST"),

    target("APPROVAL_AWARD_DECISION", "APPROVE", "NOTIFICATION_APPEALS"),
    target("APPROVAL_AWARD_DECISION", "APPROVE_WITH_CONDITIONS", "NOTIFICATION_APPEALS"),
    target("APPROVAL_AWARD_DECISION", "PARTIAL_APPROVAL", "NOTIFICATION_APPEALS"),
    target("APPROVAL_AWARD_DECISION", "DECLINE", "NOTIFICATION_APPEALS"),
    target("APPROVAL_AWARD_DECISION", "REFER_COMMITTEE", "COMMITTEE_REVIEW"),

    target("NOTIFICATION_APPEALS", "CONTINUE_CONTRACTING", "CONTRACTING"),
    terminal("NOTIFICATION_APPEALS", "CLOSE_UNSUCCESSFUL", "CLOSED_UNSUCCESSFUL"),
    target("NOTIFICATION_APPEALS", "UPHOLD_APPEAL", "APPROVAL_AWARD_DECISION"),
    target("NOTIFICATION_APPEALS", "PARTIALLY_UPHOLD", "APPROVAL_AWARD_DECISION"),

    target("CONTRACTING", "EXECUTE_AGREEMENT", "DISBURSEMENT"),
    terminal("CONTRACTING", "LAPSE_AWARD", "AWARD_LAPSED"),
    terminal("CONTRACTING", "REALLOCATE_RESERVE", "RESERVE_REALLOCATION"),

    target("DISBURSEMENT", "APPROVE_PAYMENT", "IMPLEMENTATION_MONITORING"),
    target("DISBURSEMENT", "PART_PAY", "IMPLEMENTATION_MONITORING"),
    terminal("DISBURSEMENT", "RECOVER_FUNDS", "RECOVERY"),
    target("DISBURSEMENT", "NEXT_TRANCHE", "DISBURSEMENT"),

    target("IMPLEMENTATION_MONITORING", "ACCEPT_REPORT", "EVALUATION_CLOSE_OUT"),
    target("IMPLEMENTATION_MONITORING", "APPROVE_VARIATION", "IMPLEMENTATION_MONITORING"),
    target("IMPLEMENTATION_MONITORING", "APPROVE_EXTENSION", "IMPLEMENTATION_MONITORING"),
    terminal("IMPLEMENTATION_MONITORING", "TERMINATE_RECOVER", "TERMINATED_RECOVERY"),
    target("IMPLEMENTATION_MONITORING", "NEXT_REPORTING_PERIOD", "IMPLEMENTATION_MONITORING"),

    terminal("EVALUATION_CLOSE_OUT", "CLOSE", "CLOSED"),
    terminal("EVALUATION_CLOSE_OUT", "CLOSE_QUALIFIED", "CLOSED_QUALIFIED"),
    terminal(
      "EVALUATION_CLOSE_OUT",
      "REFER_RECOVERY_INVESTIGATION",
      "REFERRED_RECOVERY_INVESTIGATION",
    ),
    terminal("EVALUATION_CLOSE_OUT", "RESTRICT_FUTURE_FUNDING", "RESTRICTED"),
  ];
}

export function createStandardWorkflowDraft(
  dependencies: StandardWorkflowDependencies,
): StandardWorkflowDraft {
  return {
    code: standardWorkflowCode,
    description:
      "Standard client application workflow from administrative screening through evaluation and close-out.",
    graph: {
      stages: [
        ...createStandardAssessmentStages(dependencies),
        ...createStandardDecisionStages(dependencies),
        ...createStandardPostAwardStages(dependencies),
      ],
      transitions: standardTransitions(),
    },
    name: "SME Fund Standard Application Workflow",
  };
}
