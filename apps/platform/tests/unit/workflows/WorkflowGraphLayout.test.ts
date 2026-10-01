import { describe, expect, it } from "vitest";

import {
  aggregateWorkflowDisplayRoutes,
  arrangeWorkflowStages,
} from "@/modules/workflows/ui/definitions/WorkflowGraphLayout";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

describe("workflow graph layout", () => {
  it("leaves room for paths inside taller cards in the same column", () => {
    const [start, left, right] = referenceWorkflow.stages;
    const positions = arrangeWorkflowStages(
      [start, left, right],
      [route(start.stableKey, left.stableKey), route(start.stableKey, right.stableKey)],
      { [left.stableKey]: 444 },
    );

    expect(positions[right.stableKey].y).toBeGreaterThan(
      positions[left.stableKey].y + 444,
    );
  });

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

  it("renders multiple transitions between the same stages as one path", () => {
    const routes = aggregateWorkflowDisplayRoutes([
      route("screening", "assessment", "APPROVE"),
      route("screening", "assessment", "OVERRIDE"),
      route("screening", "review", "RETURN"),
      route("assessment", "review", "APPROVE"),
    ]);

    expect(routes).toEqual([
      {
        destinationKey: "assessment",
        isTerminal: false,
        key: "screening:stage:assessment",
        sourceStageKey: "screening",
      },
      {
        destinationKey: "review",
        isTerminal: false,
        key: "screening:stage:review",
        sourceStageKey: "screening",
      },
      {
        destinationKey: "review",
        isTerminal: false,
        key: "assessment:stage:review",
        sourceStageKey: "assessment",
      },
    ]);
  });

  it("keeps stage and terminal destinations as distinct display paths", () => {
    const routes = aggregateWorkflowDisplayRoutes([
      route("decision", "APPROVED", "APPROVE"),
      terminalRoute("decision", "APPROVED", "DECLINE"),
    ]);

    expect(routes.map((item) => item.key)).toEqual([
      "decision:stage:APPROVED",
      "decision:terminal:APPROVED",
    ]);
  });
});

function route(
  sourceStageKey: string,
  targetStageKey: string,
  actionKey = "ADVANCE",
) {
  return {
    actionKey,
    condition: null,
    priority: 1,
    sourceStageKey,
    targetStageKeys: [targetStageKey],
  };
}

function terminalRoute(
  sourceStageKey: string,
  terminalOutcome: string,
  actionKey: string,
) {
  return {
    actionKey,
    condition: null,
    priority: 1,
    sourceStageKey,
    targetStageKeys: [],
    terminalOutcome,
  };
}
