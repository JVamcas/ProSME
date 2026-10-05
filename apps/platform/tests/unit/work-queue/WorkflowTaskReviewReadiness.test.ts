import { describe, expect, it } from "vitest";
import type {
  TaskDetail,
  WorkflowTaskAction,
} from "@/modules/work-queue/TaskTypes";
import { workflowTaskReviewReadiness } from "@/modules/work-queue/ui/WorkflowTaskReviewReadiness";
import { emptyWorkflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import { workflowTaskServiceFixture } from "../../support/WorkflowTaskServiceFixture";

const decision: WorkflowTaskAction = {
  actionType: "APPROVE_ADVANCE",
  key: "RECOMMEND",
  label: "Recommend",
  available: true,
  presentation: { displayOrder: 1, variant: "primary" },
  requiredInput: emptyWorkflowActionInputMetadata,
  runtimeVersion: 1,
  unavailableReason: null,
};

const task: TaskDetail = {
  ...workflowTaskServiceFixture,
  dueAt: null,
  taskType: "STAGE_DECISION",
  actions: [decision],
  hasChecklist: false,
  checklistItems: [],
  checklistCompleted: false,
  commentFields: [],
  commentCompleted: false,
  resultComments: [],
  resultItems: [],
  resultDocuments: [],
  resultScores: [],
  documentsCompleted: false,
  scoringCompleted: false,
  canEvaluateEligibility: false,
  eligibilityEvaluation: null,
  displayMode: "STEP_PROGRESS",
};

function readiness(patch: Partial<TaskDetail> = {}, saving = false) {
  return workflowTaskReviewReadiness(
    { ...task, ...patch },
    { pending: saving, ready: true },
    { pending: false, ready: true },
    false,
  );
}

describe("task readiness reflects server action availability", () => {
  it("shows readiness when a stage decision is available", () => {
    expect(readiness().taskProgressStatus).toBe("Ready for decision");
  });

  it.each([
    "Meet the required contributing review thresholds before making the stage decision.",
    "The required participation quorum is absent.",
    "Requirements for this action are not currently met.",
    "This action is not available to you.",
  ])(
    "does not call an empty task ready when the server blocks it: %s",
    (reason) => {
      expect(
        readiness({
          actions: [
            { ...decision, available: false, unavailableReason: reason },
          ],
        }),
      ).toMatchObject({
        sectionCount: 0,
        taskProgressStatus: "Decision blocked",
        taskBlockedReason: reason,
      });
    },
  );

  it("explains the open RFI after the review threshold is met", () => {
    expect(readiness({ hasOpenRfi: true })).toMatchObject({
      taskProgressStatus: "Awaiting information",
      taskBlockedReason:
        "Review threshold met — awaiting closure of the open information request.",
    });
    expect(
      readiness({ hasOpenRfi: true, taskType: "CONTRIBUTING" }).canComplete,
    ).toBe(false);
  });

  it("waits for local changes to save without overriding server restrictions", () => {
    expect(readiness({}, true)).toMatchObject({
      taskProgressStatus: "Decision blocked",
      taskBlockedReason: "Wait for the current task changes to save.",
    });
  });

  it("requires at least one decision action instead of treating no actions as ready", () => {
    expect(readiness({ actions: [] }).taskProgressStatus).toBe(
      "Decision blocked",
    );
  });

  it("preserves held and completed states", () => {
    expect(readiness({ processingStatus: "ON_HOLD" }).taskProgressStatus).toBe(
      "On hold",
    );
    expect(
      readiness({ taskStatus: "COMPLETED", hasOpenRfi: true })
        .taskProgressStatus,
    ).toBe("Completed");
  });
});
