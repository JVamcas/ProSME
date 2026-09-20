import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import {
  workflowTaskPreviewActions,
  workflowTaskPreviewPanelClass,
} from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog";
import { runtimeDefinition } from "../../support/form-runtime";

describe("workflow task reviewer preview", () => {
  it("shows every enabled action bound to the selected task", () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    const task = stage.tasks[0];
    stage.actions.push({
      actionType: "REJECT",
      configuration: { reasonCodes: ["INELIGIBLE"] },
      displayOrder: 2,
      enabled: true,
      label: "Reject",
      reasonCodeRequired: true,
      stableKey: "REJECT",
    });
    task.actionKeys.push("REJECT");

    expect(
      workflowTaskPreviewActions(stage, task),
    ).toEqual([
      {
        actionType: "APPROVE_ADVANCE",
        key: "ADVANCE",
        label: "Advance",
      },
      {
        actionType: "REJECT",
        key: "REJECT",
        label: "Reject",
      },
    ]);
  });

  it("preserves section width for the outer preview layout", () => {
    expect(workflowTaskPreviewPanelClass(runtimeDefinition()))
      .toContain("max-w-6xl");
  });
});
