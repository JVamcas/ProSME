import { describe, expect, it } from "vitest";

import { workflowActionDefinitionSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { workflowActionTypes } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

const action = {
  stableKey: "APPROVE_REVIEW",
  label: "Approve review",
  actionType: "APPROVE_ADVANCE" as const,
  enabled: true,
  reasonCodeRequired: false,
  displayOrder: 1,
};

describe("WorkflowActionDefinition", () => {
  it("accepts every common Phase 1.5 field", () => {
    expect(workflowActionDefinitionSchema.parse(action)).toEqual(action);
  });

  it("supports every standard action type", () => {
    for (const actionType of workflowActionTypes) {
      expect(
        workflowActionDefinitionSchema.safeParse({ ...action, actionType })
          .success,
      ).toBe(true);
    }
  });

  it("rejects arbitrary action types and invalid stable keys", () => {
    expect(
      workflowActionDefinitionSchema.safeParse({
        ...action,
        actionType: "CUSTOM_ACTION",
      }).success,
    ).toBe(false);
    expect(
      workflowActionDefinitionSchema.safeParse({
        ...action,
        stableKey: "approve-review",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate keys and display orders within one stage", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].actions = [action, { ...action, label: "Another label" }];
    const codes = validateWorkflowGraph(graph).errors.map((item) => item.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "DUPLICATE_ACTION_KEY",
        "DUPLICATE_ACTION_ORDER",
      ]),
    );
  });
});
