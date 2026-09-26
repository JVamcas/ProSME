"use client";

import { toast } from "sonner";

import {
  WorkflowPublicationValidationError,
  workflowValidationIssueLocation,
  workflowValidationIssueMessage,
} from "../../WorkflowPublicationValidationFeedback";

export function showWorkflowPublicationError(error: Error) {
  if (!(error instanceof WorkflowPublicationValidationError)) {
    toast.error("Workflow could not be published", {
      description: error.message,
      duration: 10_000,
    });
    return;
  }

  const visibleIssues = error.issues.slice(0, 3);
  const remaining = error.issues.length - visibleIssues.length;
  toast.error(
    `Fix ${error.issues.length} workflow validation ${error.issues.length === 1 ? "issue" : "issues"}`,
    {
      description: (
        <div className="space-y-2">
          <ul className="list-disc space-y-1 pl-4">
            {visibleIssues.map((issue, index) => (
              <li key={`${issue.code}-${issue.path}-${index}`}>
                <span className="font-semibold">
                  {workflowValidationIssueLocation(issue, error.graph)}:
                </span>{" "}
                {workflowValidationIssueMessage(issue)}
              </li>
            ))}
          </ul>
          <p>
            {remaining > 0
              ? `${remaining} more ${remaining === 1 ? "issue requires" : "issues require"} attention. `
              : ""}
            Open the workflow editor to correct the configuration.
          </p>
        </div>
      ),
      duration: 12_000,
    },
  );
}

