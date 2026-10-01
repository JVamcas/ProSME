import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import {
  inspectWorkflowStageDeletion,
  removeWorkflowStage,
} from "@/modules/workflows/domain/definitions/WorkflowStageDeletion";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

describe("workflow stage deletion", () => {
  it("deletes an isolated stage without changing unrelated transitions", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions = graph.transitions.filter(
      (transition) =>
        transition.sourceStageKey !== "FINANCE_REVIEW"
        && !transition.targetStageKeys.includes("FINANCE_REVIEW"),
    );
    const originalTransitions = structuredClone(graph.transitions);

    const result = removeWorkflowStage(graph, "FINANCE_REVIEW");

    expect(result.stages).not.toContainEqual(
      expect.objectContaining({
        stableKey: "FINANCE_REVIEW",
      }),
    );
    expect(result.transitions).toEqual(originalTransitions);
  });

  it("deletes every incoming and outgoing transition connected to the stage", () => {
    const result = removeWorkflowStage(referenceWorkflow, "COMPLETENESS");

    expect(
      result.transitions.every(
        (transition) =>
          transition.sourceStageKey !== "COMPLETENESS"
          && !transition.targetStageKeys.includes("COMPLETENESS"),
      ),
    ).toBe(true);
    expect(result.transitions).not.toContainEqual(
      expect.objectContaining({
        sourceStageKey: "PRE_SCREENING",
      }),
    );
  });

  it("reconnects an incoming route only to explicitly selected successors", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions[0].id = "79e20de0-3558-4d63-90a4-8c9f5125df20";
    const inspection = inspectWorkflowStageDeletion(
      graph,
      "COMPLETENESS",
    );
    const incoming = inspection.incomingRoutes[0];

    const result = removeWorkflowStage(
      graph,
      "COMPLETENESS",
      [
        {
          targetStageKeys: ["TECHNICAL_ASSESSMENT"],
          transitionIndex: incoming.transitionIndex,
        },
      ],
    );

    expect(result.transitions).toContainEqual(
      expect.objectContaining({
        actionKey: incoming.transition.actionKey,
        priority: incoming.transition.priority,
        sourceStageKey: "PRE_SCREENING",
        targetStageKeys: ["TECHNICAL_ASSESSMENT"],
      }),
    );
    expect(
      result.transitions.find(
        (transition) => transition.sourceStageKey === "PRE_SCREENING",
      )?.id,
    ).toBeUndefined();
  });

  it("allows deletion without reconnecting an incoming route", () => {
    const result = removeWorkflowStage(referenceWorkflow, "COMPLETENESS", []);

    expect(result.transitions).not.toContainEqual(
      expect.objectContaining({
        sourceStageKey: "PRE_SCREENING",
      }),
    );
    expect(result.stages).toHaveLength(referenceWorkflow.stages.length - 1);
  });

  it("keeps reconnection decisions separate for each incoming transition", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions.push({
      ...graph.transitions[0],
      priority: 2,
    });
    graph.transitions.push({
      ...graph.transitions[1],
      targetStageKeys: ["FINANCE_REVIEW"],
      priority: 2,
    });
    const inspection = inspectWorkflowStageDeletion(graph, "COMPLETENESS");

    const result = removeWorkflowStage(
      graph,
      "COMPLETENESS",
      [
        {
          targetStageKeys: ["TECHNICAL_ASSESSMENT"],
          transitionIndex: inspection.incomingRoutes[0].transitionIndex,
        },
        {
          targetStageKeys: ["FINANCE_REVIEW"],
          transitionIndex: inspection.incomingRoutes[1].transitionIndex,
        },
      ],
    );

    expect(result.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          priority: 1,
          sourceStageKey: "PRE_SCREENING",
          targetStageKeys: ["TECHNICAL_ASSESSMENT"],
        }),
        expect.objectContaining({
          priority: 2,
          sourceStageKey: "PRE_SCREENING",
          targetStageKeys: ["FINANCE_REVIEW"],
        }),
      ]),
    );
  });

  it("flags stages made unreachable by deletion without reconnection", () => {
    const result = removeWorkflowStage(referenceWorkflow, "COMPLETENESS");

    expect(validateWorkflowGraph(result).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNREACHABLE_STAGE",
          message: "Technical assessment is unreachable.",
        }),
      ]),
    );
  });
});
