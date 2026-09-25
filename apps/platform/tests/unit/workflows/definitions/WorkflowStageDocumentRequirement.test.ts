import { describe, expect, it } from "vitest";

import { workflowStageSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

function stageWithDocumentRequirements() {
  return {
    ...structuredClone(referenceWorkflow.stages[0]),
    documentRequirements: [
      {
        taskStableKey: referenceWorkflow.stages[0].tasks[0].stableKey,
        name: "Tax clearance certificate",
        mandatory: true,
        acceptedFileTypes: ["PDF", "JPG"] as const,
        maximumSizeMb: 10,
        expiryDays: 180,
        uploader: "APPLICANT" as const,
        verifier: "ASSIGNED_REVIEWER" as const,
        templateReference: "TAX_CLEARANCE_TEMPLATE",
      },
      {
        taskStableKey: referenceWorkflow.stages[0].tasks[0].stableKey,
        name: "Review memorandum",
        mandatory: false,
        acceptedFileTypes: ["PDF"] as const,
        maximumSizeMb: 5,
        expiryDays: null,
        uploader: "STAFF" as const,
        verifier: "STAFF" as const,
        templateReference: "",
      },
    ],
  };
}

describe("workflow stage document requirements", () => {
  it("accepts every configured document requirement field", () => {
    expect(
      workflowStageSchema.safeParse(stageWithDocumentRequirements()).success,
    ).toBe(true);
  });

  it("rejects duplicate requirement names without case sensitivity", () => {
    const stage = stageWithDocumentRequirements();
    stage.documentRequirements[1].name = "TAX CLEARANCE CERTIFICATE";

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "Document requirement names must be unique within the stage.",
    );
  });

  it("rejects a document assigned to a task in another stage", () => {
    const stage = stageWithDocumentRequirements();
    stage.documentRequirements[0].taskStableKey = "OTHER_STAGE_TASK";

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        message: "Document requirements must reference a task in the same stage.",
        path: ["documentRequirements", 0, "taskStableKey"],
      }),
    );
  });

  it("requires file types and valid size and expiry limits", () => {
    const stage = stageWithDocumentRequirements();
    const requirement = stage.documentRequirements[0] as Record<
      string,
      unknown
    >;
    requirement.acceptedFileTypes = [];
    requirement.maximumSizeMb = 101;
    requirement.expiryDays = 0;

    expect(workflowStageSchema.safeParse(stage).success).toBe(false);
  });
});
