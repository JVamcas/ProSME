import { describe, expect, it } from "vitest";

import { workflowStageSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

function stageWithScoring() {
  return {
    ...structuredClone(referenceWorkflow.stages[0]),
    scoring: {
      aggregation: "WEIGHTED_AVERAGE" as const,
      taskStableKey: "PRE_SCREEN_CHECKLIST",
      criteria: [
        {
          criterion: "Business viability",
          description: "Assess the viability of the business.",
          weight: 60,
          scaleMinimum: 0,
          scaleMaximum: 10,
          mandatoryComment: true,
        },
        {
          criterion: "Economic impact",
          description: "Assess the expected economic impact.",
          weight: 40,
          scaleMinimum: 0,
          scaleMaximum: 10,
          mandatoryComment: false,
        },
      ],
    },
  };
}

describe("workflow stage scoring definition", () => {
  it("accepts all scoring fields and aggregation", () => {
    expect(workflowStageSchema.safeParse(stageWithScoring()).success).toBe(
      true,
    );
  });

  it("rejects duplicate criterion names without case sensitivity", () => {
    const stage = stageWithScoring();
    stage.scoring.criteria[1].criterion = "BUSINESS VIABILITY";

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "Scoring criteria must be unique within the stage.",
    );
  });

  it("requires a valid scoring scale", () => {
    const stage = stageWithScoring();
    stage.scoring.criteria[0].scaleMinimum = 10;
    stage.scoring.criteria[0].scaleMaximum = 5;

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Scale maximum must be greater than scale minimum.",
      ]),
    );
  });

  it("rejects scoring assigned to a task outside the stage", () => {
    const stage = stageWithScoring();
    stage.scoring.taskStableKey = "OTHER_STAGE_TASK";

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "Scoring must reference a task in the same stage.",
    );
  });
});
