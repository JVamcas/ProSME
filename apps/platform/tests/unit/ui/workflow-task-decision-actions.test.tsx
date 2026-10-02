import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskDecisionActions } from "@/modules/workflows/ui/tasks/WorkflowTaskDecisionActions";

const task = {
  actions: [{
    actionType: "APPROVE_ADVANCE",
    available: true,
    key: "ADVANCE",
    label: "Advance application",
    presentation: { displayOrder: 1, variant: "success" },
    requiredInput: {
      comment: { maxLength: 4_000, required: false },
      confirmation: { message: null, required: false },
      dueDate: { deadlineDays: null, required: false },
      editableFieldPaths: [],
      reasonCode: { options: [], required: false },
      reasonOrCommentRequired: false,
      reviewDate: { required: false },
      target: { type: null, value: null },
    },
    runtimeVersion: 1,
    unavailableReason: null,
  }],
  taskStatus: "IN_PROGRESS",
} as unknown as TaskDetail;

describe("workflow task decision actions", () => {
  it("shows the shared action dropdown on an active task", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskDecisionActions task={task} />,
    );

    expect(markup).toContain("Actions");
    expect(markup).toContain('aria-haspopup="true"');
    expect(markup).toContain('type="button"');
  });

  it("hides actions after the task is complete", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskDecisionActions task={{ ...task, taskStatus: "COMPLETED" }} />,
    );

    expect(markup).not.toContain("Actions");
    expect(markup).not.toContain("aria-haspopup");
  });
});
