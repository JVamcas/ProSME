import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import {
  replaceWorkflowActionRoutes,
  workflowActionRoutes,
} from "@/modules/workflows/ui/definitions/WorkflowActionEditorRoutes";

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
      sourceStageKey: "IGNORED",
      actionKey: "IGNORED",
      targetStageKeys: ["TECHNICAL_ASSESSMENT"],
      terminalOutcome: null,
      priority: 1,
      condition: null,
    };
    const transitions = replaceWorkflowActionRoutes(
      referenceWorkflow.transitions,
      "PRE_SCREENING",
      "ADVANCE",
      "CONTINUE",
      [replacement],
    );

    expect(
      workflowActionRoutes(transitions, "PRE_SCREENING", "ADVANCE"),
    ).toHaveLength(0);
    expect(
      workflowActionRoutes(transitions, "PRE_SCREENING", "CONTINUE"),
    ).toEqual([
      expect.objectContaining({
        targetStageKeys: ["TECHNICAL_ASSESSMENT"],
      }),
    ]);
    expect(transitions).toHaveLength(referenceWorkflow.transitions.length);
  });
});
