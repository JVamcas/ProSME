import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import {
  workflowTaskPreviewActions,
  workflowTaskPreviewPanelClass,
} from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog";
import { runtimeDefinition } from "../../support/form-runtime";

describe("workflow task reviewer preview", () => {
  it("shows only enabled actions bound to the selected task with a transition", () => {
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

    expect(
      workflowTaskPreviewActions(
        stage,
        task,
        referenceWorkflow.transitions,
      ),
    ).toEqual([
      {
        actionType: "APPROVE_ADVANCE",
        key: "ADVANCE",
        label: "Advance",
      },
    ]);
  });

  it("preserves section width for the outer preview layout", () => {
    expect(workflowTaskPreviewPanelClass(runtimeDefinition()))
      .toContain("max-w-6xl");
  });
});
