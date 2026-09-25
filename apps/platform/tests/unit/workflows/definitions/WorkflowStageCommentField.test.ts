import { describe, expect, it } from "vitest";

import { workflowStageSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

const field = {
  taskStableKey: "PRE_SCREEN_CHECKLIST",
  key: "RECOMMENDATION",
  label: "Recommendation",
  helpText: "Explain your recommendation.",
  mandatory: true,
  visibility: "INTERNAL_ONLY" as const,
  displayOrder: 1,
};

function stageWithComments() {
  return {
    ...structuredClone(referenceWorkflow.stages[0]),
    commentFields: [field],
  };
}

describe("workflow stage comment fields", () => {
  it("accepts a prompt assigned to a task in the stage", () => {
    expect(workflowStageSchema.safeParse(stageWithComments()).success).toBe(true);
  });

  it("rejects an unknown task", () => {
    const stage = stageWithComments();
    stage.commentFields = [{ ...field, taskStableKey: "OTHER_TASK" }];
    const result = workflowStageSchema.safeParse(stage);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate keys and display orders", () => {
    const stage = stageWithComments();
    stage.commentFields = [field, { ...field, label: "Another prompt" }];
    expect(workflowStageSchema.safeParse(stage).success).toBe(false);
  });
});
