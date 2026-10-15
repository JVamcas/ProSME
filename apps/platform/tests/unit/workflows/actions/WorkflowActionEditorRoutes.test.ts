import { describe, expect, it } from "vitest";

import { changedWorkflowActionGraph } from "@/modules/workflows/domain/actions/WorkflowActionChange";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import { workflowActionRoutes } from "@/modules/workflows/ui/definitions/WorkflowActionEditorRoutes";

describe("workflow action editor routes", () => {
  it("selects only routes owned by the stage action", () => {
    const routes = workflowActionRoutes(
      referenceWorkflow.transitions,
      "PRE_SCREENING",
      "ADVANCE",
    );

    expect(routes).toHaveLength(1);
    expect(routes[0].targetStageKeys).toEqual(["COMPLETENESS"]);
  });

  it("replaces an action's routes and preserves unrelated routing", () => {
    const replacement = {
      sourceStageKey: "PRE_SCREENING",
      actionKey: "ADVANCE",
      targetStageKeys: ["TECHNICAL_ASSESSMENT"],
      terminalOutcome: null,
      priority: 1,
      condition: null,
    };
    const stage = referenceWorkflow.stages[0];
    const result = changedWorkflowActionGraph(referenceWorkflow, stage, {
      stageKey: stage.stableKey,
      actionKey: "ADVANCE",
      action: stage.actions[0],
      taskStableKeys: [],
      routes: [replacement],
    });
    const transitions = result.transitions;
    expect(
      workflowActionRoutes(transitions, stage.stableKey, "ADVANCE"),
    ).toEqual([replacement]);
    expect(result.stages).toEqual(referenceWorkflow.stages);
    expect(transitions).toHaveLength(referenceWorkflow.transitions.length);
  });
});
