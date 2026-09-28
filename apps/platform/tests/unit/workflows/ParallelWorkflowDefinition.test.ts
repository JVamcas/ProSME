import { describe, expect, it } from "vitest";

import { cloneWorkflowGraph } from "@/modules/workflows/domain/definitions/WorkflowGraphCloning";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

function parallelGraph() {
  const graph = structuredClone(referenceWorkflow);
  const start = graph.stages[0];
  const technical = graph.stages[1];
  const financial = graph.stages[2];
  const join = graph.stages[3];
  graph.stages = [start, technical, financial, join, ...graph.stages.slice(4)];
  graph.transitions[0].targetStageKeys = [
    technical.stableKey,
    financial.stableKey,
  ];
  graph.transitions[1].sourceStageKey = technical.stableKey;
  graph.transitions[1].targetStageKeys = [join.stableKey];
  graph.transitions[2].sourceStageKey = financial.stableKey;
  graph.transitions[2].targetStageKeys = [join.stableKey];
  join.joinPredecessorStageKeys = [
    technical.stableKey,
    financial.stableKey,
  ];
  return graph;
}

describe("parallel workflow definition", () => {
  it("clones fork targets and join prerequisites without definition ids", () => {
    const graph = parallelGraph();
    const clone = cloneWorkflowGraph(graph);

    expect(clone.transitions[0].targetStageKeys).toEqual(
      graph.transitions[0].targetStageKeys,
    );
    expect(clone.stages[3].joinPredecessorStageKeys).toEqual(
      graph.stages[3].joinPredecessorStageKeys,
    );
    expect(clone.stages[3].joinPredecessorStageKeys).not.toBe(
      graph.stages[3].joinPredecessorStageKeys,
    );
  });

  it("requires an incoming transition from every configured predecessor", () => {
    const graph = parallelGraph();
    graph.transitions = graph.transitions.filter(
      (transition) => transition.sourceStageKey !== graph.stages[2].stableKey,
    );

    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_JOIN_TRANSITION" }),
      ]),
    );
  });
});
