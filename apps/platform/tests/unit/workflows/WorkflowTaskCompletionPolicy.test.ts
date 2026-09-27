import { describe, expect, it } from "vitest";

import {
  shouldCompleteWorkflowTask,
  taskActionMatchesType,
} from "@/modules/workflows/domain/runtime/WorkflowTaskCompletionPolicy";

describe("workflow task completion policy", () => {
  it("manually completes ready contributing work even when actions exist", () => {
    expect(
      shouldCompleteWorkflowTask({
        actionKey: null,
        actionType: null,
        taskType: "CONTRIBUTING",
        workReady: true,
      }),
    ).toBe(true);
  });

  it("does not complete contributing work when a common action executes", () => {
    expect(
      shouldCompleteWorkflowTask({
        actionKey: "REQUEST_INFORMATION",
        actionType: "REQUEST_INFORMATION",
        taskType: "CONTRIBUTING",
        workReady: true,
      }),
    ).toBe(false);
  });

  it("completes a ready stage-decision task only through a decision action", () => {
    expect(
      shouldCompleteWorkflowTask({
        actionKey: null,
        actionType: null,
        taskType: "STAGE_DECISION",
        workReady: true,
      }),
    ).toBe(false);
    expect(
      shouldCompleteWorkflowTask({
        actionKey: "APPROVE",
        actionType: "APPROVE_ADVANCE",
        taskType: "STAGE_DECISION",
        workReady: true,
      }),
    ).toBe(true);
  });

  it("rejects decision actions on contributing tasks", () => {
    expect(
      taskActionMatchesType({
        actionType: "APPROVE_ADVANCE",
        taskType: "CONTRIBUTING",
      }),
    ).toBe(false);
    expect(
      taskActionMatchesType({
        actionType: "REQUEST_INFORMATION",
        taskType: "CONTRIBUTING",
      }),
    ).toBe(true);
  });
});
