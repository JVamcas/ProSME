import { describe, expect, it } from "vitest";

import { updateWorkflowDraftSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

function draftWithTwoTasks() {
  const graph = structuredClone(referenceWorkflow);
  const stage = graph.stages[0];
  stage.tasks.push({
    ...structuredClone(stage.tasks[0]),
    stableKey: "SECOND_REVIEW",
    displayOrder: stage.tasks[0].displayOrder + 1,
    taskType: "CONTRIBUTING",
  });
  return { expectedRowVersion: 1, graph };
}

describe("workflow task display order validation", () => {
  it("rejects the duplicate stage task order before a draft reaches persistence", () => {
    const input = draftWithTwoTasks();
    const stage = input.graph.stages[0];
    stage.tasks[1].displayOrder = stage.tasks[0].displayOrder;
    const result = updateWorkflowDraftSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["graph", "stages", 0, "tasks", 1, "displayOrder"],
        message: "Task display orders must be unique within the stage.",
      }));
    }
  });

  it("allows distinct task orders within a stage", () => {
    expect(updateWorkflowDraftSchema.safeParse(draftWithTwoTasks()).success)
      .toBe(true);
  });
});
