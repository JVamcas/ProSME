import type {
  WorkflowPublicStatus,
  WorkflowPublicStatusMapping,
} from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";

export const workflowApplicantStatusDefaults = {
  SUBMITTED: {
    label: "Submitted",
    description: "Your application has been submitted.",
  },
  UNDER_REVIEW: {
    label: "Under review",
    description: "Your application is being reviewed.",
  },
  ACTION_REQUIRED: {
    label: "Action required",
    description:
      "Please review your application and complete the requested actions.",
  },
  OUTCOME_AVAILABLE: {
    label: "Outcome available",
    description: "The outcome of your application is available to view.",
  },
  CLOSED: {
    label: "Closed",
    description: "Your application is closed.",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    description: "Your application has been withdrawn.",
  },
  INELIGIBLE: {
    label: "Ineligible",
    description: "Your application does not meet the eligibility requirements.",
  },
  REJECTED: {
    label: "Rejected",
    description: "Your application has been rejected.",
  },
  REJECTED_INCOMPLETE: {
    label: "Rejected incomplete",
    description:
      "Your application has been rejected because required information is incomplete.",
  },
} satisfies Record<
  WorkflowPublicStatus,
  Pick<WorkflowPublicStatusMapping, "label" | "description">
>;

export function defaultWorkflowApplicantStatus(
  status: WorkflowPublicStatus,
): WorkflowPublicStatusMapping {
  return { status, ...workflowApplicantStatusDefaults[status] };
}
