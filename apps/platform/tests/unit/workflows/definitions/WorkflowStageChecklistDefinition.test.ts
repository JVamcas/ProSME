import { describe, expect, it } from "vitest";

import { workflowStageSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

function stageWithChecklist() {
  return {
    ...structuredClone(referenceWorkflow.stages[0]),
    checklistItems: [
      {
        taskStableKey: "PRE_SCREEN_CHECKLIST",
        key: "OWNERSHIP_CONFIRMED",
        text: "Confirm that the ownership requirement is met.",
        mandatory: true,
        responseType: "YES_NO" as const,
        evidenceRequirement: "REQUIRED" as const,
        notes: "Review the current ownership records.",
        displayOrder: 1,
      },
      {
        taskStableKey: "PRE_SCREEN_CHECKLIST",
        key: "REVIEW_DATE",
        text: "Record the date of the review.",
        mandatory: false,
        responseType: "DATE" as const,
        evidenceRequirement: "NONE" as const,
        notes: "",
        displayOrder: 2,
      },
    ],
  };
}

describe("workflow stage checklist definition", () => {
  it("accepts every configured checklist field", () => {
    expect(workflowStageSchema.safeParse(stageWithChecklist()).success).toBe(
      true,
    );
  });

  it("rejects duplicate keys and display orders", () => {
    const stage = stageWithChecklist();
    stage.checklistItems[1].key = stage.checklistItems[0].key;
    stage.checklistItems[1].displayOrder =
      stage.checklistItems[0].displayOrder;

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Checklist keys must be unique within the stage.",
        "Checklist display orders must be unique within the stage.",
      ]),
    );
  });

  it("rejects unsupported response and evidence values", () => {
    const stage = stageWithChecklist();
    const item = stage.checklistItems[0] as Record<string, unknown>;
    item.responseType = "FILE";
    item.evidenceRequirement = "WHEN_AVAILABLE";

    expect(workflowStageSchema.safeParse(stage).success).toBe(false);
  });
});
