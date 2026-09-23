import { describe, expect, it } from "vitest";

import {
  workflowValidationIssueLocation,
  workflowValidationIssueMessage,
} from "@/modules/workflows/WorkflowPublicationValidationFeedback";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

describe("workflow publication validation feedback", () => {
  it("turns a task path into an administrator-facing location", () => {
    const location = workflowValidationIssueLocation(
      {
        code: "INVALID_FORM_VERSION",
        message: "New workflow tasks must reference a published form version.",
        path: "stages.0.tasks.0.formBinding.formVersionId",
      },
      referenceWorkflow,
    );

    expect(location).toContain(referenceWorkflow.stages[0].name);
    expect(location).toContain(referenceWorkflow.stages[0].tasks[0].name);
    expect(location).not.toContain("stages.0");
  });

  it("explains how to repair known form and condition errors", () => {
    expect(workflowValidationIssueMessage({
      code: "INVALID_FORM_VERSION",
      message: "New workflow tasks must reference a published form version.",
      path: "stages.0.tasks.0.formBinding.formVersionId",
    })).toBe(
      "Remove the unavailable form binding or select a published form version.",
    );

    expect(workflowValidationIssueMessage({
      code: "INVALID_WORKFLOW_CONDITION",
      message: 'Field "eligibility.outcome" is not available.',
      path: "stages.0.actions.0.condition.children.0",
    })).toBe(
      "Select an available condition field or update the form bound to this workflow.",
    );
  });
});
