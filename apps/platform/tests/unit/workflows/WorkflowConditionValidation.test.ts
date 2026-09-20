import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { validateWorkflowConditions } from "@/modules/workflows/engine/WorkflowConditionValidation";

const firstFormVersionId = "10000000-0000-4000-8000-000000000001";
const secondFormVersionId = "10000000-0000-4000-8000-000000000002";

function stage(
  stableKey: string,
  displayOrder: number,
  formVersionId: string,
): WorkflowStageInput {
  return {
    actions: [],
    checklistItems: [],
    documentRequirements: [],
    commentFields: [],
    scoring: null,
    coiGated: false,
    description: "Review the application",
    displayOrder,
    enabled: true,
    entryCondition: null,
    exitCondition: null,
    initial: displayOrder === 1,
    name: stableKey,
    optional: false,
    publicStatusMapping: {
      description: "Application under review",
      label: "Under review",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    stableKey,
    tasks: [{
      actionKeys: [],
      assignmentMode: "ROLE",
      coiRequired: false,
      config: {},
      description: "Complete the bound form",
      displayOrder: 1,
      formBinding: {
        contextFields: [{
          key: "application.client_metric",
          label: "Client metric",
          type: "NUMBER",
        }],
        formVersionId,
      },
      name: "Bound form",
      quorum: false,
      required: true,
      requiredCompletionCount: 1,
      reviewerCount: 1,
      stableKey: `${stableKey}_FORM`,
      type: "STRUCTURED_FORM",
    }],
  };
}

function condition(fieldKey: string, value: number | string): ConditionGroup {
  return {
    children: [{
      id: `${fieldKey}-condition`,
      kind: "CONDITION",
      leftOperand: { key: fieldKey, kind: "FIELD" },
      operator: basicOperators.GREATER_THAN,
      rightOperand: { kind: "CONSTANT", value },
    }],
    combinator: "AND",
    id: `${fieldKey}-group`,
    kind: "GROUP",
  };
}

function fixture() {
  const first = stage("SCREENING", 1, firstFormVersionId);
  const second = stage("FINANCE_REVIEW", 2, secondFormVersionId);
  const graph: WorkflowGraphInput = {
    stages: [first, second],
    transitions: [],
  };
  const fields = new Map([
    [firstFormVersionId, [{
      key: "CUSTOM_RESULT",
      label: "Custom result",
      type: "NUMBER" as const,
    }]],
    [secondFormVersionId, [{
      key: "RECOMMENDED_AMOUNT",
      label: "Recommended amount",
      type: "CURRENCY" as const,
    }]],
  ]);
  return { fields, first, graph, second };
}

describe("workflow condition publication validation", () => {
  it("allows entry conditions to use prior-stage outputs", () => {
    const { fields, graph, second } = fixture();
    second.entryCondition = condition("stage.screening.CUSTOM_RESULT", 10);

    expect(validateWorkflowConditions(graph, fields)).toEqual([]);
  });

  it("rejects entry conditions that use current-stage outputs", () => {
    const { fields, graph, second } = fixture();
    second.entryCondition = condition(
      "stage.finance_review.RECOMMENDED_AMOUNT",
      10,
    );

    expect(validateWorkflowConditions(graph, fields)).toEqual([
      expect.objectContaining({
        code: "INVALID_WORKFLOW_CONDITION",
        path: "stages.1.entryCondition.children.0",
      }),
    ]);
  });

  it("validates exit and transition conditions against current outputs", () => {
    const { fields, graph, second } = fixture();
    second.exitCondition = condition(
      "stage.finance_review.RECOMMENDED_AMOUNT",
      100,
    );
    graph.transitions.push({
      actionKey: "ADVANCE",
      condition: condition("stage.finance_review.UNKNOWN_FIELD", 100),
      priority: 1,
      sourceStageKey: second.stableKey,
      targetStageKey: null,
      terminalOutcome: "APPROVED",
    });

    expect(validateWorkflowConditions(graph, fields)).toEqual([
      expect.objectContaining({
        code: "INVALID_WORKFLOW_CONDITION",
        path: "transitions.0.condition.children.0",
      }),
    ]);
  });

  it("rejects empty groups and values incompatible with their fields", () => {
    const { fields, graph, first } = fixture();
    first.entryCondition = {
      children: [],
      combinator: "AND",
      id: "empty-group",
      kind: "GROUP",
    };
    first.exitCondition = condition(
      "application.client_metric",
      "not a number",
    );

    expect(validateWorkflowConditions(graph, fields)).toEqual([
      expect.objectContaining({ path: "stages.0.entryCondition" }),
      expect.objectContaining({
        path: "stages.0.exitCondition.children.0",
      }),
    ]);
  });
});
