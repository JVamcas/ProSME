import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { validateWorkflowTransitions } from "@/modules/workflows/domain/transitions/WorkflowTransitionValidation";

const returnAction: WorkflowActionDefinition = {
  actionType: "RETURN",
  configuration: {
    dataHandling: "RETAIN",
    reasonRequired: true,
  },
  displayOrder: 2,
  enabled: true,
  label: "Return for reassessment",
  reasonCodeRequired: true,
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
  source.actions.push(returnAction);
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
  it("identifies the source action and stage when a target is not repeatable", () => {
    const errors = validateWorkflowTransitions(
      graphWithReturnTransition(["TECHNICAL_ASSESSMENT"]),
    );

    expect(errors).toContainEqual(expect.objectContaining({
      code: "NON_REPEATABLE_SEMANTIC_TARGET",
      message:
        "The Return action \"Return for reassessment\" on source stage "
        + "\"Committee decision\" (COMMITTEE_DECISION) targets "
        + "\"Technical assessment\" (TECHNICAL_ASSESSMENT), which must be marked Repeatable.",
    }));
  });

  it("identifies the source action and stage when its target is missing", () => {
    const errors = validateWorkflowTransitions(graphWithReturnTransition([]));

    expect(errors).toContainEqual(expect.objectContaining({
      code: "INVALID_SEMANTIC_TARGET_COUNT",
      message:
        "The Return action \"Return for reassessment\" on source stage "
        + "\"Committee decision\" (COMMITTEE_DECISION) has no target stage. "
        + "Select exactly one target stage.",
    }));
  });
});
