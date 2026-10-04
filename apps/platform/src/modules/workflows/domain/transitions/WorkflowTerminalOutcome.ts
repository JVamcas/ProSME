import type { WorkflowPublicStatusMapping } from "../definitions/WorkflowStageDefinition";
import { defaultWorkflowApplicantStatus } from "../definitions/WorkflowApplicantStatusDefaults";

export type TerminalApplicantStatus = Pick<
  WorkflowPublicStatusMapping,
  "label" | "description"
>;

export const workflowTerminalOutcomes = {
  APPROVED: {
    label: "Approved",
    description: "Your application has been approved.",
  },
  AWARD_LAPSED: {
    label: "Award lapsed",
    description: "The award for your application has lapsed.",
  },
  CLOSED: {
    label: "Closed",
    description: "Your application is closed.",
  },
  CLOSED_QUALIFIED: {
    label: "Closed with qualifications",
    description:
      "Your application has been closed with qualifications. Please review the outcome details.",
  },
  CLOSED_UNSUCCESSFUL: {
    label: "Unsuccessful",
    description: "Your application was unsuccessful and is now closed.",
  },
  COMPLETED: {
    label: "Completed",
    description: "Processing of your application has been completed.",
  },
  DECLINED_COMMITTEE: {
    label: "Declined",
    description:
      "Your application has been declined following committee review.",
  },
  DECLINED_RISK: {
    label: "Declined",
    description: "Your application has been declined following risk review.",
  },
  DEFERRED: {
    label: "Deferred",
    description: "A decision on your application has been deferred.",
  },
  INELIGIBLE: defaultWorkflowApplicantStatus("INELIGIBLE"),
  RECOVERY: {
    label: "Recovery",
    description:
      "Your application has been referred for recovery. Please review the outcome details.",
  },
  REFERRED_RECOVERY_INVESTIGATION: {
    label: "Referred for investigation",
    description:
      "Your application has been referred for recovery investigation.",
  },
  REJECTED: defaultWorkflowApplicantStatus("REJECTED"),
  REJECTED_INCOMPLETE: defaultWorkflowApplicantStatus("REJECTED_INCOMPLETE"),
  RESERVE_LIST: {
    label: "Reserve list",
    description: "Your application has been placed on the reserve list.",
  },
  RESERVE_REALLOCATION: {
    label: "Reserve reallocation",
    description: "The award has been reallocated to the reserve list.",
  },
  RESTRICTED: {
    label: "Funding restricted",
    description:
      "Your application has resulted in restrictions on future funding. Please review the outcome details.",
  },
  TERMINATED_RECOVERY: {
    label: "Terminated with recovery",
    description: "Your funding has been terminated and referred for recovery.",
  },
  UNSUCCESSFUL: {
    label: "Unsuccessful",
    description: "Your application was unsuccessful.",
  },
  WITHDRAWN: defaultWorkflowApplicantStatus("WITHDRAWN"),
} satisfies Record<string, TerminalApplicantStatus>;

export const standardTerminalOutcomes = Object.keys(workflowTerminalOutcomes);

export function terminalOutcomeLabel(outcome: string) {
  const words = outcome.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function terminalOutcomeApplicantStatus(
  outcome: string,
  wording?: TerminalApplicantStatus | null,
): WorkflowPublicStatusMapping {
  const defaults = workflowTerminalOutcomes[
    outcome as keyof typeof workflowTerminalOutcomes
  ] ?? {
    label: "Outcome available",
    description: "The outcome of your application is available to view.",
  };
  const status = terminalOutcomeStatusCode(outcome);
  return { ...defaults, ...wording, status };
}

function terminalOutcomeStatusCode(
  outcome: string,
): WorkflowPublicStatusMapping["status"] {
  switch (outcome) {
    case "INELIGIBLE":
    case "REJECTED":
    case "REJECTED_INCOMPLETE":
    case "WITHDRAWN":
      return outcome;
    case "CLOSED":
    case "CLOSED_QUALIFIED":
    case "CLOSED_UNSUCCESSFUL":
    case "COMPLETED":
    case "AWARD_LAPSED":
    case "TERMINATED_RECOVERY":
      return "CLOSED";
    default:
      return "OUTCOME_AVAILABLE";
  }
}
