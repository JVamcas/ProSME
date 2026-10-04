import { describe, expect, it } from "vitest";

import { workflowStageSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { isSameWorkflowTaskRequirement } from "@/modules/workflows/domain/definitions/WorkflowTaskRequirementIdentity";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

function stageWithTwoTasks() {
  const stage = structuredClone(referenceWorkflow.stages[0]);
  stage.tasks.push({
    ...structuredClone(stage.tasks[0]),
    stableKey: "SECOND_REVIEW",
    taskType: "CONTRIBUTING",
    name: "Second review",
    displayOrder: stage.tasks.length + 1,
  });
  const taskKeys = [stage.tasks[0].stableKey, "SECOND_REVIEW"];
  stage.checklistItems = taskKeys.map((taskStableKey) => ({
    taskStableKey,
    key: "VERIFIED",
    text: "Verify evidence",
    mandatory: true,
    responseType: "YES_NO",
    evidenceRequirement: "NONE",
    notes: "",
    displayOrder: 1,
  }));
  stage.commentFields = taskKeys.map((taskStableKey) => ({
    taskStableKey,
    key: "RECOMMENDATION",
    label: "Recommendation",
    helpText: "",
    mandatory: true,
    displayOrder: 1,
  }));
  stage.documentRequirements = taskKeys.map((taskStableKey) => ({
    taskStableKey,
    stableKey: "EVIDENCE",
    name: "Evidence",
    mandatory: true,
    acceptedFileTypes: ["PDF"],
    maximumSizeMb: 10,
    expiryDays: null,
    requestOnStageActivation: false,
    uploader: "ASSIGNED_REVIEWER",
    verifier: "ASSIGNED_REVIEWER",
    templateReference: "",
  }));
  stage.scoring = taskKeys.map((taskStableKey) => ({
    taskStableKey,
    aggregation: "AVERAGE",
    criteria: [
      {
        stableKey: "VIABILITY",
        criterion: "Viability",
        description: "",
        weight: 1,
        scaleMinimum: 0,
        scaleMaximum: 10,
        mandatoryComment: false,
      },
    ],
  }));
  return stage;
}

describe("task-owned configuration", () => {
  it("allows independent tasks to reuse keys, names and display orders", () => {
    const result = workflowStageSchema.safeParse(stageWithTwoTasks());
    expect(result.error?.issues).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it("rejects duplicate checklist keys inside the same task", () => {
    const stage = stageWithTwoTasks();
    stage.checklistItems[1].taskStableKey = stage.tasks[0].stableKey;
    expect(workflowStageSchema.safeParse(stage).success).toBe(false);
  });

  it("rejects two scoring configurations for one task", () => {
    const stage = stageWithTwoTasks();
    stage.scoring![1].taskStableKey = stage.tasks[0].stableKey;
    const result = workflowStageSchema.safeParse(stage);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      "Only one scoring configuration is allowed per task.",
    );
  });

  it("identifies edits and deletes using both task and requirement keys", () => {
    const first = { taskStableKey: "FIRST", key: "RECOMMENDATION" };
    const second = { taskStableKey: "SECOND", key: "RECOMMENDATION" };
    expect(isSameWorkflowTaskRequirement(first, second)).toBe(false);
    expect(isSameWorkflowTaskRequirement(first, { ...first })).toBe(true);
    expect(
      [first, second].filter(
        (item) => !isSameWorkflowTaskRequirement(item, first),
      ),
    ).toEqual([second]);
  });
});
