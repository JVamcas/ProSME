import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { workflowTransitionSchema } from "@/modules/workflows/domain/transitions/WorkflowTransitionSchemas";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  toWorkflowTransition,
  workflowTransitionFormDefaults,
} from "@/modules/workflows/ui/definitions/WorkflowTransitionFormSchema";

const configuredCondition: ConditionGroup = {
  id: "71000000-0000-4000-8000-000000000001",
  kind: "GROUP",
  combinator: "AND",
  children: [
    {
      id: "71000000-0000-4000-8000-000000000002",
      kind: "CONDITION",
      leftOperand: {
        kind: "FIELD",
        key: "stage.review.user_defined_outcome",
      },
      operator: basicOperators.EQUALS,
      rightOperand: { kind: "CONSTANT", value: "PROCEED" },
    },
  ],
};

describe("WorkflowTransitionDefinition", () => {
  it("requires exactly one stage or terminal destination", () => {
    const common = {
      sourceStageKey: "SCREENING",
      actionKey: "ADVANCE",
      priority: 1,
      condition: null,
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
      condition: null,
    });
  });

  it("attaches and preserves a generic transition condition", () => {
    const values = workflowTransitionFormDefaults(
      undefined,
      "ADVANCE",
      "ASSESSMENT",
      1,
    );
    const transition = toWorkflowTransition(
      { ...values, condition: configuredCondition },
      "SCREENING",
    );

    expect(workflowTransitionSchema.parse(transition).condition).toEqual(
      configuredCondition,
    );
  });

  it("rejects unstructured transition conditions", () => {
    expect(workflowTransitionSchema.safeParse({
      sourceStageKey: "SCREENING",
      actionKey: "ADVANCE",
      targetStageKey: "ASSESSMENT",
      priority: 1,
      condition: { rules: [] },
    }).success).toBe(false);
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
