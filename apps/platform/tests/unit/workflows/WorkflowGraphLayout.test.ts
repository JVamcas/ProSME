import { describe, expect, it } from "vitest";

import { arrangeWorkflowStages } from "@/modules/workflows/ui/definitions/WorkflowGraphLayout";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

describe("workflow graph layout", () => {
  it("places parallel routes in one column and their join in the next", () => {
    const [start, leftBranch, rightBranch, join] = referenceWorkflow.stages;
    const positions = arrangeWorkflowStages(
      [start, leftBranch, rightBranch, join],
      [
        route(start.stableKey, leftBranch.stableKey),
        route(start.stableKey, rightBranch.stableKey),
        route(leftBranch.stableKey, join.stableKey),
        route(rightBranch.stableKey, join.stableKey),
      ],
    );

    expect(positions[leftBranch.stableKey].x).toBe(
      positions[rightBranch.stableKey].x,
    );
    expect(positions[leftBranch.stableKey].y).not.toBe(
      positions[rightBranch.stableKey].y,
    );
    expect(positions[join.stableKey].x).toBeGreaterThan(
      positions[leftBranch.stableKey].x,
    );
  });
});

function route(sourceStageKey: string, targetStageKey: string) {
  return {
    actionKey: "ADVANCE",
    condition: null,
    priority: 1,
    sourceStageKey,
    targetStageKey,
  };
}
