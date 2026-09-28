import { describe, expect, it } from "vitest";

import { formSectionCountsAsComplete } from "@/modules/work-queue/ui/WorkflowTaskProgress";

describe("workflow task review progress", () => {
  it("counts a saved form as complete", () => {
    expect(formSectionCountsAsComplete({
      formCompleted: true,
      pending: false,
      ready: true,
      taskActionSubmission: false,
    })).toBe(true);
  });

  it("counts a ready task-action form as complete", () => {
    expect(formSectionCountsAsComplete({
      formCompleted: false,
      pending: false,
      ready: true,
      taskActionSubmission: true,
    })).toBe(true);
  });

  it("does not count pending or invalid task-action forms as complete", () => {
    expect(formSectionCountsAsComplete({
      formCompleted: false,
      pending: true,
      ready: true,
      taskActionSubmission: true,
    })).toBe(false);
    expect(formSectionCountsAsComplete({
      formCompleted: false,
      pending: false,
      ready: false,
      taskActionSubmission: true,
    })).toBe(false);
  });

  it("does not count a form that is completed independently", () => {
    expect(formSectionCountsAsComplete({
      formCompleted: false,
      pending: false,
      ready: true,
      taskActionSubmission: false,
    })).toBe(false);
  });
});
