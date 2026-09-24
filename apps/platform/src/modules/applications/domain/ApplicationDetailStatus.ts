import type { ApplicationSummary } from "../ApplicationTypes";

export function applicantDetailProgressLabel(
  status: ApplicationSummary["publicStatus"]["status"],
): string {
  switch (status) {
    case "DRAFT":
      return "DRAFT";
    case "WITHDRAWN":
      return "WITHDRAWN";
    case "CLOSED":
      return "COMPLETED";
    case "ACTION_REQUIRED":
      return "ACTION REQUIRED";
    case "OUTCOME_AVAILABLE":
      return "OUTCOME AVAILABLE";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "IN PROGRESS";
  }
}

