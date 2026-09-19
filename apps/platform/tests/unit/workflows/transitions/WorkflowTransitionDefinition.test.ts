import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { workflowTransitionSchema } from "@/modules/workflows/domain/transitions/WorkflowTransitionSchemas";
import {
  toWorkflowTransition,
  workflowTransitionFormDefaults,
} from "@/modules/workflows/ui/definitions/WorkflowTransitionFormSchema";

describe("WorkflowTransitionDefinition", () => {
  it("requires exactly one stage or terminal destination", () => {
    const common = {
      sourceStageKey: "SCREENING",
      actionKey: "ADVANCE",
      priority: 1,
    };
    expect(
      workflowTransitionSchema.safeParse({
        ...common,
        targetStageKey: "ASSESSMENT",
      }).success,
    ).toBe(true);
    expect(
      workflowTransitionSchema.safeParse({
        ...common,
        terminalOutcome: "REJECTED",
      }).success,
    ).toBe(true);
    expect(workflowTransitionSchema.safeParse(common).success).toBe(false);
    expect(
      workflowTransitionSchema.safeParse({
        ...common,
        targetStageKey: "ASSESSMENT",
        terminalOutcome: "REJECTED",
      }).success,
    ).toBe(false);
  });

  it("uses the next stage only as an explicit editor default", () => {
    const values = workflowTransitionFormDefaults(
      undefined,
      "ADVANCE",
      "ASSESSMENT",
      1,
    );
    expect(toWorkflowTransition(values, "SCREENING")).toEqual({
      sourceStageKey: "SCREENING",
      actionKey: "ADVANCE",
      targetStageKey: "ASSESSMENT",
      terminalOutcome: null,
      priority: 1,
    });
  });

  it("rejects an action that is not configured on the source stage", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions[0].actionKey = "UNKNOWN_ACTION";
    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_TRANSITION_ACTION" }),
      ]),
    );
  });

  it("rejects targets outside the workflow version", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions[0].targetStageKey = "UNKNOWN_STAGE";
    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_TRANSITION_TARGET" }),
      ]),
    );
  });
});
