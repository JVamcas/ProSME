import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { validateWorkflowTransitions } from "@/modules/workflows/domain/transitions/WorkflowTransitionValidation";

const returnAction: WorkflowActionDefinition = {
  actionType: "RETURN",
  configuration: {
    dataHandling: "RETAIN",
  },
  displayOrder: 2,
  enabled: true,
  label: "Return for reassessment",
  reasonRequired: true,
  stableKey: "RETURN_FOR_REASSESSMENT",
};

function graphWithReturnTransition(targetStageKeys: string[]) {
  const graph = structuredClone(referenceWorkflow);
  const source = graph.stages.find(
    (stage) => stage.stableKey === "COMMITTEE_DECISION",
  );
  if (!source) {
    throw new Error("Reference workflow is missing the committee stage.");
  }
  source.actions.push(structuredClone(returnAction));
  graph.transitions.push({
    actionKey: returnAction.stableKey,
    condition: null,
    priority: 1,
    sourceStageKey: source.stableKey,
    targetStageKeys,
  });
  return graph;
}

describe("workflow transition validation feedback", () => {
  it("rejects Return that skips the previous stage to reach an older ancestor", () => {
    expect(
      validateWorkflowTransitions(
        graphWithReturnTransition(["TECHNICAL_ASSESSMENT"]),
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: "INVALID_CONTROL_DESTINATION",
        message: expect.stringContaining("the previous stage"),
      }),
    );
  });
  it("rejects downstream and current-stage Return defaults", () => {
    for (const destination of ["OUTCOME_COMMUNICATION", "COMMITTEE_DECISION"]) {
      const graph = graphWithReturnTransition([destination]);
      expect(validateWorkflowTransitions(graph)).toContainEqual(
        expect.objectContaining({ code: "INVALID_CONTROL_DESTINATION" }),
      );
    }
  });

  it("uses progression paths rather than display order for the previous stage", () => {
    const graph = graphWithReturnTransition(["FINANCE_REVIEW"]);
    const target = graph.stages.find(
      (stage) => stage.stableKey === "FINANCE_REVIEW",
    )!;
    target.displayOrder = 100;
    expect(validateWorkflowTransitions(graph)).toEqual([]);
  });

  it("rejects a stage reachable downstream even when a normal cycle leads back", () => {
    const graph = graphWithReturnTransition(["OUTCOME_COMMUNICATION"]);
    const downstream = graph.stages.find(
      (stage) => stage.stableKey === "OUTCOME_COMMUNICATION",
    )!;
    downstream.actions.push({
      ...returnAction,
      actionType: "APPROVE_ADVANCE",
      configuration: {},
      stableKey: "LOOP",
    });
    graph.transitions.push({
      actionKey: "LOOP",
      condition: null,
      priority: 1,
      sourceStageKey: downstream.stableKey,
      targetStageKeys: ["COMMITTEE_DECISION"],
    });
    expect(validateWorkflowTransitions(graph)).toContainEqual(
      expect.objectContaining({ code: "INVALID_CONTROL_DESTINATION" }),
    );
  });

  it("allows a nonrepeatable stage as the default for an explicit rework action", () => {
    const errors = validateWorkflowTransitions(
      graphWithReturnTransition(["FINANCE_REVIEW"]),
    );
    expect(errors).toEqual([]);
  });

  it("identifies the source action and stage when its target is missing", () => {
    const errors = validateWorkflowTransitions(graphWithReturnTransition([]));

    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_SEMANTIC_TARGET_COUNT",
        message:
          'The Return action "Return for reassessment" on source stage ' +
          '"Committee decision" (COMMITTEE_DECISION) has no target stage. ' +
          "Select exactly one target stage.",
      }),
    );
  });
});
