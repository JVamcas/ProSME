import { describe, expect, it } from "vitest";

import { buildStageCompletionValues } from "@/modules/workflows/engine/StageCompletionContext";
import { normalizeStageConditionRecord } from "@/modules/workflows/engine/StageCondition";
import { resolveWorkflowDataPath } from "@/modules/conditions/engine/WorkflowDataResolver";
import { workflowConditionFields } from "@/modules/workflows/engine/WorkflowConditionFields";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

function submission(
  slot: number,
  accepted: boolean,
  score: number,
  recommendation: string,
) {
  return {
    taskId: `task-${slot}`,
    taskKey: "ASSESSMENT",
    reviewerId: `reviewer-${slot}`,
    reviewerSlot: slot,
    reviewerCount: 2,
    responseValues: { RECOMMENDED_AMOUNT: score * 1000 },
    taskResult: {
      items: [{ code: "VERIFIED", accepted }],
      scores: [{ criterion: "VIABILITY", score }],
      comments: [{ key: "RECOMMENDATION", value: recommendation }],
    },
  };
}

describe("reviewer submission scope", () => {
  it("retains conflicting answers and attribution without stage-level overwrite", () => {
    const first = submission(1, true, 2, "Decline");
    const second = submission(2, false, 9, "Approve");
    const values = buildStageCompletionValues([first, second]);
    expect(values).toEqual(buildStageCompletionValues([second, first]));
    expect(values).not.toHaveProperty("scoring");
    expect(values).not.toHaveProperty("checklist");
    expect(values).not.toHaveProperty("comment");
    expect(values).not.toHaveProperty("form");
    const context = {
      application: {},
      eligibility: {},
      fundingCall: {},
      stages: [
        { stableKey: "REVIEW", values: normalizeStageConditionRecord(values) },
      ],
    };
    expect(
      resolveWorkflowDataPath(
        "stage.review.task.assessment.reviewer_1.scoring.viability.value",
        context,
      ),
    ).toBe(2);
    expect(
      resolveWorkflowDataPath(
        "stage.review.task.assessment.reviewer_2.scoring.viability.value",
        context,
      ),
    ).toBe(9);
    expect(values.task).toMatchObject({
      ASSESSMENT: {
        reviewer_1: {
          reviewerId: "reviewer-1",
          taskId: "task-1",
          checklist: { VERIFIED: { accepted: true } },
          comment: { RECOMMENDATION: "Decline" },
        },
        reviewer_2: {
          reviewerId: "reviewer-2",
          taskId: "task-2",
          checklist: { VERIFIED: { accepted: false } },
          comment: { RECOMMENDATION: "Approve" },
        },
      },
    });
  });

  it("does not expose an ambiguous scalar when only one of several reviewers completed", () => {
    const values = buildStageCompletionValues([
      submission(1, true, 2, "Decline"),
    ]);
    expect(values).not.toHaveProperty("scoring");
    expect(values).toHaveProperty(
      "task.ASSESSMENT.reviewer_1.scoring.VIABILITY.value",
      2,
    );
  });

  it("separates the same keys in different tasks and drops ambiguous legacy aliases", () => {
    const first = { ...submission(1, true, 2, "Decline"), reviewerCount: 1 };
    const second = {
      ...submission(1, false, 9, "Approve"),
      taskId: "other-task",
      taskKey: "FINANCIAL_REVIEW",
      reviewerCount: 1,
    };
    const values = buildStageCompletionValues([first, second]);
    expect(values).not.toHaveProperty("scoring");
    expect(values).not.toHaveProperty("comment");
    expect(values).toHaveProperty(
      "task.ASSESSMENT.reviewer_1.scoring.VIABILITY.value",
      2,
    );
    expect(values).toHaveProperty(
      "task.FINANCIAL_REVIEW.reviewer_1.scoring.VIABILITY.value",
      9,
    );
  });

  it("offers separate condition paths for each reviewer instead of an aggregate", () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    const task = stage.tasks[0];
    task.reviewerCount = 2;
    task.taskType = "CONTRIBUTING";
    stage.commentFields = [
      {
        taskStableKey: task.stableKey,
        key: "RECOMMENDATION",
        label: "Recommendation",
        helpText: "",
        mandatory: true,
        displayOrder: 1,
      },
    ];
    const fields = workflowConditionFields(
      { stages: [stage], transitions: [] },
      new Map(),
      stage,
      true,
    );
    const prefix = `stage.${stage.stableKey.toLowerCase()}.task.${task.stableKey.toLowerCase()}`;
    expect(fields.map((field) => field.key)).toContain(
      `${prefix}.reviewer_1.comment.recommendation`,
    );
    expect(fields.map((field) => field.key)).toContain(
      `${prefix}.reviewer_2.comment.recommendation`,
    );
    expect(fields.map((field) => field.key)).not.toContain(
      `stage.${stage.stableKey.toLowerCase()}.comment.recommendation`,
    );
  });
});
