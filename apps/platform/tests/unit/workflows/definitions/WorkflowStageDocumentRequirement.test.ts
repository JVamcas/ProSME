import { describe, expect, it } from "vitest";

import { workflowStageSchema } from "@/modules/workflows/api/WorkflowSchemas";
import {
  parseOptionalExpiryDays,
  workflowStageDocumentRequirementFormSchema,
} from "@/modules/workflows/ui/definitions/WorkflowStageDocumentRequirementFormSchema";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import { validateWorkflowStage } from "@/modules/workflows/WorkflowStageValidation";
import { requestInformation } from "@/modules/workflows/domain/standard/StandardWorkflowBuilders";

function stageWithDocumentRequirements() {
  return {
    ...structuredClone(referenceWorkflow.stages[0]),
    documentRequirements: [
      {
        taskStableKey: referenceWorkflow.stages[0].tasks[0].stableKey,
        stableKey: "TAX_CLEARANCE_CERTIFICATE",
        name: "Tax clearance certificate",
        mandatory: true,
        acceptedFileTypes: ["PDF", "JPG"] as const,
        maximumSizeMb: 10,
        expiryDays: 180,
        requestOnStageActivation: false,
        uploader: "APPLICANT" as const,
        verifier: "ASSIGNED_REVIEWER" as const,
        templateReference: "TAX_CLEARANCE_TEMPLATE",
      },
      {
        taskStableKey: referenceWorkflow.stages[0].tasks[0].stableKey,
        stableKey: "REVIEW_MEMORANDUM",
        name: "Review memorandum",
        mandatory: false,
        acceptedFileTypes: ["PDF"] as const,
        maximumSizeMb: 5,
        expiryDays: null,
        requestOnStageActivation: false,
        uploader: "STAFF" as const,
        verifier: "STAFF" as const,
        templateReference: "",
      },
    ],
  };
}

describe("workflow stage document requirements", () => {
  it("requires one enabled task-bound RFI action for automatic requests", () => {
    const stage = stageWithDocumentRequirements();
    stage.documentRequirements[0].requestOnStageActivation = true;
    expect(
      validateWorkflowStage(workflowStageSchema.parse(stage), 0).map(
        (item) => item.code,
      ),
    ).toContain("AUTO_RFI_ACTION_REQUIRED");

    const action = requestInformation(
      "REQUEST_DOCUMENTS",
      "Request documents",
      1,
    );
    stage.actions.push(action);
    stage.tasks[0].actionKeys.push(action.stableKey);
    expect(
      validateWorkflowStage(workflowStageSchema.parse(stage), 0).map(
        (item) => item.code,
      ),
    ).not.toContain("AUTO_RFI_ACTION_REQUIRED");
  });

  it("rejects automatic requests for staff-owned documents", () => {
    const stage = stageWithDocumentRequirements();
    stage.documentRequirements[1].requestOnStageActivation = true;
    expect(
      validateWorkflowStage(workflowStageSchema.parse(stage), 0).map(
        (item) => item.code,
      ),
    ).toContain("AUTO_RFI_APPLICANT_OWNER_REQUIRED");
  });

  it("keeps an empty optional expiry blank and validates entered days", () => {
    const requirement = stageWithDocumentRequirements().documentRequirements[1];

    for (const value of [null, undefined, ""]) {
      expect(parseOptionalExpiryDays(value)).toBeNull();
      expect(
        workflowStageDocumentRequirementFormSchema.safeParse({
          ...requirement,
          expiryDays: parseOptionalExpiryDays(value),
        }).success,
      ).toBe(true);
    }

    expect(parseOptionalExpiryDays("180")).toBe(180);
    expect(
      workflowStageDocumentRequirementFormSchema.safeParse({
        ...requirement,
        expiryDays: parseOptionalExpiryDays("0"),
      }).success,
    ).toBe(false);
  });

  it("accepts every configured document requirement field", () => {
    expect(
      workflowStageSchema.safeParse(stageWithDocumentRequirements()).success,
    ).toBe(true);
  });

  it("rejects an empty document stable key", () => {
    const stage = stageWithDocumentRequirements();
    stage.documentRequirements[0].stableKey = "";

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
  });

  it("rejects duplicate requirement names without case sensitivity", () => {
    const stage = stageWithDocumentRequirements();
    stage.documentRequirements[1].name = "TAX CLEARANCE CERTIFICATE";

    const result = workflowStageSchema.safeParse(stage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "Document requirement names must be unique within the task.",
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
        message:
          "Document requirements must reference a task in the same stage.",
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
