import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { workflowStageSchema } from "@/modules/workflows/api/WorkflowSchemas";
import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

function stage(
  stableKey: string,
  name: string,
  displayOrder: number,
): WorkflowStageInput {
  return {
    stableKey,
    name,
    description: "",
    enabled: true,
    optional: false,
    displayOrder,
    publicStatusMapping: {
      status: "UNDER_REVIEW",
      label: "Under review",
      description: "The application is under review.",
    },
    repeatable: false,
    coiGated: false,
    entryCondition: null,
    exitCondition: null,
    initial: displayOrder === 1,
    actions: [],
    tasks: [],
  };
}

const configuredCondition: ConditionGroup = {
  id: "70000000-0000-4000-8000-000000000001",
  kind: "GROUP",
  combinator: "AND",
  children: [
    {
      id: "70000000-0000-4000-8000-000000000002",
      kind: "CONDITION",
      leftOperand: {
        kind: "FIELD",
        key: "stage.technical_review.user_defined_review_result",
      },
      operator: basicOperators.EQUALS,
      rightOperand: { kind: "CONSTANT", value: true },
    },
  ],
};

describe("workflow stage conditions", () => {
  it("attaches generic condition groups without prescribing field names", () => {
    const result = workflowStageSchema.safeParse({
      ...stage("TECHNICAL_REVIEW", "Technical review", 2),
      entryCondition: configuredCondition,
      exitCondition: configuredCondition,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entryCondition).toEqual(configuredCondition);
      expect(result.data.exitCondition).toEqual(configuredCondition);
    }
  });

  it("rejects unstructured condition documents", () => {
    const result = workflowStageSchema.safeParse({
      ...stage("TECHNICAL_REVIEW", "Technical review", 2),
      exitCondition: { rules: [] },
    });

    expect(result.success).toBe(false);
  });
});
