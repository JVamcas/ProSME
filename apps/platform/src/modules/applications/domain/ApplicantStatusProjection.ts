import type { WorkflowPublicStatus, WorkflowPublicStatusMapping } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";

export type ApplicantStatusSource = {
  lifecycleStatus: "draft" | "submitted" | "withdrawn";
  workflowStatus: string | null;
  terminalPublicStatus: WorkflowPublicStatusMapping | null;
  activeStageStatuses: WorkflowPublicStatusMapping[];
};

export type ApplicantPublicStatus = {
  actionRequired: boolean;
  description: string;
  label: string;
  status: WorkflowPublicStatus | "DRAFT";
};

const fallback = {
  DRAFT: {
    status: "DRAFT",
    label: "Draft",
    description: "Complete and submit your application.",
  },
  SUBMITTED: {
    status: "SUBMITTED",
    label: "Submitted",
    description: "Your application has been received.",
  },
  WITHDRAWN: {
    status: "WITHDRAWN",
    label: "Withdrawn",
    description: "This application has been withdrawn.",
  },
  CLOSED: {
    status: "CLOSED",
    label: "Closed",
    description: "Processing of this application has ended.",
  },
} satisfies Record<string, Omit<ApplicantPublicStatus, "actionRequired">>;

const priority = [
  "ACTION_REQUIRED",
  "UNDER_REVIEW",
  "SUBMITTED",
  "OUTCOME_AVAILABLE",
  "CLOSED",
  "WITHDRAWN",
] as const;

function approved(mapping: WorkflowPublicStatusMapping | null) {
  return mapping
    && priority.includes(mapping.status)
    && mapping.label.trim()
    && mapping.description.trim()
    ? mapping
    : null;
}

export function projectApplicantStatus(
  source: ApplicantStatusSource,
): ApplicantPublicStatus {
  let mapping: Omit<ApplicantPublicStatus, "actionRequired">;
  if (source.lifecycleStatus === "draft") {
    mapping = fallback.DRAFT;
  } else if (source.lifecycleStatus === "withdrawn") {
    mapping = fallback.WITHDRAWN;
  } else if (source.workflowStatus && source.workflowStatus !== "ACTIVE") {
    mapping = approved(source.terminalPublicStatus) ?? fallback.CLOSED;
  } else {
    const stages = source.activeStageStatuses
      .map(approved)
      .filter((item): item is WorkflowPublicStatusMapping => item !== null);
    mapping = stages.sort(
      (left, right) => priority.indexOf(left.status) - priority.indexOf(right.status),
    )[0] ?? fallback.SUBMITTED;
  }
  return { ...mapping, actionRequired: mapping.status === "ACTION_REQUIRED" };
}
