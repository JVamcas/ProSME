import { describe, expect, it } from "vitest";

import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

describe("workflow reject validation", () => {
  it("requires rejection configuration to match its published transition", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].actions[0] = {
      ...graph.stages[0].actions[0],
      actionType: "REJECT",
      reasonRequired: false,
      configuration: {
        outcome: {
          cancelOpenStageInstances: true as const,
          cancelOpenTasks: true as const,
          publicStatusMapping: {
            description: "A decision is available for your application.",
            label: "Decision available",
            status: "OUTCOME_AVAILABLE",
          },
          type: "TERMINAL",
        },
        reversibleActionKey: "UNKNOWN_REVERSAL",
      },
    };

    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_REJECTION_OUTCOME" }),
        expect.objectContaining({ code: "INVALID_REJECTION_REVERSAL" }),
      ]),
    );
  });
});
