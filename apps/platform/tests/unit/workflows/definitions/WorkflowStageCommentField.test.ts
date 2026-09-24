import { describe, expect, it } from "vitest";

import { workflowStageSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

function stageWithComments() {
  const stage = structuredClone(referenceWorkflow.stages[0]);
  stage.commentFields = [
    {
      key: "REVIEW_RECOMMENDATION",
      label: "Review recommendation",
      helpText: "Summarise the recommendation.",
      mandatory: true,
      visibility: "INTERNAL_ONLY",
      displayOrder: 1,
    },
    {
      key: "APPLICANT_FEEDBACK",
      label: "Applicant feedback",
      helpText: "Provide feedback suitable for the applicant.",
      mandatory: false,
      visibility: "APPLICANT_VISIBLE",
      displayOrder: 2,
    },
  ];
  return stage;
}

describe("workflow stage comments and recommendations", () => {
  it("accepts configured fields and visibility", () => {
    expect(workflowStageSchema.safeParse(stageWithComments()).success).toBe(true);
  });

  it("rejects duplicate keys and display orders", () => {
    const stage = stageWithComments();
    stage.commentFields[1].key = stage.commentFields[0].key;
    stage.commentFields[1].displayOrder = stage.commentFields[0].displayOrder;

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Comment and recommendation keys must be unique within the stage.",
        "Comment and recommendation display orders must be unique within the stage.",
      ]),
    );
  });
});
