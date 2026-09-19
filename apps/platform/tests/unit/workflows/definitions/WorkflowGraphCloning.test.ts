import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";
import { cloneWorkflowGraph } from "@/modules/workflows/domain/definitions/WorkflowGraphCloning";

describe("workflow graph cloning", () => {
  it("clones Phase 1.9 configuration into independent records", () => {
    const source = structuredClone(referenceWorkflow);
    source.stages[0].id = "41111111-1111-4111-8111-111111111111";
    source.stages[0].actions[0].id =
      "42222222-2222-4222-8222-222222222222";
    source.stages[0].tasks[0].id =
      "43333333-3333-4333-8333-333333333333";
    source.stages[0].tasks[0].roleId =
      "44444444-4444-4444-8444-444444444444";
    source.stages[0].tasks[0].formVersionId =
      "45555555-5555-4555-8555-555555555555";
    source.stages[0].actions[0] = {
      ...source.stages[0].actions[0],
      actionType: "REJECT",
      configuration: { reasonCodes: ["INELIGIBLE"] },
    };
    source.transitions[0].id = "46666666-6666-4666-8666-666666666666";

    const clone = cloneWorkflowGraph(source);

    expect(clone.stages[0]).toMatchObject({
      id: undefined,
      publicStatusMapping: source.stages[0].publicStatusMapping,
    });
    expect(clone.stages[0].tasks[0]).toMatchObject({
      id: undefined,
      roleId: source.stages[0].tasks[0].roleId,
      assignmentMode: source.stages[0].tasks[0].assignmentMode,
      formVersionId: null,
    });
    expect(clone.stages[0].actions[0]).toEqual({
      ...source.stages[0].actions[0],
      id: undefined,
    });
    expect(clone.transitions[0]).toEqual({
      ...source.transitions[0],
      id: undefined,
    });

    clone.stages[0].publicStatusMapping.label = "Changed clone";
    const clonedAction = clone.stages[0].actions[0];
    const sourceAction = source.stages[0].actions[0];
    if (clonedAction.actionType !== "REJECT") throw new Error("Clone failed.");
    if (sourceAction.actionType !== "REJECT") throw new Error("Setup failed.");
    clonedAction.configuration.reasonCodes.push("DUPLICATE");
    expect(source.stages[0].publicStatusMapping.label).not.toBe("Changed clone");
    expect(sourceAction.configuration.reasonCodes).toEqual(["INELIGIBLE"]);
    expect(clone).not.toBe(source);
  });
});
