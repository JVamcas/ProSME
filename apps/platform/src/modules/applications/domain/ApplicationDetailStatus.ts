import type { ApplicationSummary } from "../ApplicationTypes";

export function applicantDetailProgressLabel(
  status: ApplicationSummary["publicStatus"]["status"],
): string {
  switch (status) {
    case "INELIGIBLE":
      return "INELIGIBLE";
    case "REJECTED":
      return "REJECTED";
    case "REJECTED_INCOMPLETE":
      return "REJECTED INCOMPLETE";
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

export function staffApplicationStatusDescription(description: string): string {
  return description
    .replace(/\byour application\b/gi, (match) =>
      match.startsWith("Y") ? "This application" : "this application",
    )
    .replace(/\byour funded project\b/gi, (match) =>
      match.startsWith("Y") ? "The funded project" : "the funded project",
    );
}

export function applicantApplicationStatusDescription(
  description: string,
): string {
  return description.replace(
    /\b(?:this|the) (application|funded project)\b/gi,
    (match, subject: string) =>
      `${/^[A-Z]/.test(match) ? "Your" : "your"} ${subject}`,
  );
}
