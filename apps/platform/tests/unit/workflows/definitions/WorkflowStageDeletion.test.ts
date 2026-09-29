import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import { removeWorkflowStage } from "@/modules/workflows/domain/definitions/WorkflowStageDeletion";

describe("workflow stage deletion", () => {
  it("reconnects an incoming transition to the next ordered stage", () => {
    const graph = removeWorkflowStage(referenceWorkflow, "COMPLETENESS");
    const incoming = graph.transitions.find(
      (transition) => transition.sourceStageKey === "PRE_SCREENING",
    );

    expect(incoming?.targetStageKeys).toEqual(["TECHNICAL_ASSESSMENT"]);
    expect(graph.stages.map((stage) => stage.displayOrder)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("removes incoming transitions when the final stage has no successor", () => {
    const graph = removeWorkflowStage(
      referenceWorkflow,
      "OUTCOME_COMMUNICATION",
    );

    expect(graph.transitions).not.toContainEqual(expect.objectContaining({
      targetStageKeys: ["OUTCOME_COMMUNICATION"],
    }));
    expect(graph.transitions).not.toContainEqual(expect.objectContaining({
      sourceStageKey: "OUTCOME_COMMUNICATION",
    }));
  });
});
