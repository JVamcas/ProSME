import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { evaluateConditionGroup } from "@/modules/conditions/engine/ConditionGroupEngine";
import {
  resolveWorkflowConditionValues,
  resolveWorkflowDataPath,
  resolveWorkflowFieldValues,
  WorkflowDataResolutionError,
  workflowConditionFieldPaths,
  type WorkflowDataContext,
} from "@/modules/conditions/engine/WorkflowDataResolver";

function workflowContext(): WorkflowDataContext {
  return {
    application: {
      optional_value: null,
      requested_amount: 350_000,
      summary: { sector: "Agriculture" },
    },
    eligibility: {
      eligible: true,
      outcome: "ELIGIBLE",
    },
    fundingCall: {
      maximum_grant_amount: 500_000,
    },
    stages: [
      {
        stableKey: "DUE_DILIGENCE",
        values: { risk_rating: "LOW" },
      },
      {
        stableKey: "FINANCIAL_REVIEW",
        values: { recommended_amount: 400_000 },
      },
    ],
  };
}

function definition(): ConditionGroup {
  return {
    id: "c0000000-0000-4000-8000-000000000001",
    kind: "GROUP",
    combinator: "AND",
    children: [
      {
        id: "c0000000-0000-4000-8000-000000000002",
        kind: "CONDITION",
        leftOperand: {
          kind: "FIELD",
          key: "application.requested_amount",
        },
        operator: basicOperators.LESS_THAN,
        rightOperand: {
          kind: "FIELD",
          key: "fundingCall.maximum_grant_amount",
        },
      },
      {
        id: "c0000000-0000-4000-8000-000000000003",
        kind: "GROUP",
        combinator: "AND",
        children: [{
          id: "c0000000-0000-4000-8000-000000000004",
          kind: "CONDITION",
          leftOperand: {
            kind: "COMPUTED",
            operation: "SUBTRACT",
            leftOperand: {
              kind: "FIELD",
              key: "stage.financial_review.recommended_amount",
            },
            rightOperand: { kind: "CONSTANT", value: 50_000 },
          },
          operator: basicOperators.EQUALS,
          rightOperand: { kind: "CONSTANT", value: 350_000 },
        }],
      },
    ],
  };
}

describe("workflow data resolver", () => {
  it("resolves application and funding-call paths by exact field key", () => {
    const context = workflowContext();

    expect(resolveWorkflowDataPath(
      "application.requested_amount",
      context,
    )).toBe(350_000);
    expect(resolveWorkflowDataPath(
      "fundingCall.maximum_grant_amount",
      context,
    )).toBe(500_000);
    expect(resolveWorkflowDataPath(
      "application.summary.sector",
      context,
    )).toBe("Agriculture");
    expect(resolveWorkflowDataPath(
      "application.optional_value",
      context,
    )).toBeNull();
    expect(resolveWorkflowDataPath(
      "eligibility.outcome",
      context,
    )).toBe("ELIGIBLE");
  });

  it("resolves stage outputs by stable key regardless of stage order", () => {
    const context = workflowContext();
    const reordered = {
      ...context,
      stages: [...context.stages].reverse(),
    };

    expect(resolveWorkflowDataPath(
      "stage.financial_review.recommended_amount",
      context,
    )).toBe(400_000);
    expect(resolveWorkflowDataPath(
      "stage.financial_review.recommended_amount",
      reordered,
    )).toBe(400_000);
    expect(resolveWorkflowDataPath(
      "stage.due_diligence.risk_rating",
      reordered,
    )).toBe("LOW");
  });

  it("rejects stage positions, missing data, and unsupported roots", () => {
    const context = workflowContext();

    expect(() => resolveWorkflowDataPath(
      "stage.0.recommended_amount",
      context,
    )).toThrowError(expect.objectContaining({ code: "INVALID_PATH" }));
    expect(() => resolveWorkflowDataPath(
      "stage.technical_review.score",
      context,
    )).toThrowError(expect.objectContaining({ code: "STAGE_NOT_FOUND" }));
    expect(() => resolveWorkflowDataPath(
      "application.missing_value",
      context,
    )).toThrowError(expect.objectContaining({ code: "VALUE_NOT_FOUND" }));
    expect(() => resolveWorkflowDataPath(
      "business.annual_turnover",
      context,
    )).toThrowError(expect.objectContaining({ code: "UNSUPPORTED_ROOT" }));
  });

  it("rejects ambiguous duplicate stable stage keys", () => {
    const context = workflowContext();
    context.stages = [
      ...context.stages,
      { stableKey: "FINANCIAL_REVIEW", values: {} },
    ];

    expect(() => resolveWorkflowDataPath(
      "stage.financial_review.recommended_amount",
      context,
    )).toThrowError(expect.objectContaining({
      code: "DUPLICATE_STAGE_KEY",
    }));
  });

  it("returns controlled resolution errors", () => {
    try {
      resolveWorkflowDataPath(
        "application.summary.sector.code",
        workflowContext(),
      );
      throw new Error("Expected resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowDataResolutionError);
      expect(error).toMatchObject({
        code: "NON_OBJECT_SEGMENT",
        path: "application.summary.sector.code",
      });
    }
  });

  it("resolves only the stable paths referenced by a condition tree", () => {
    const group = definition();
    const paths = workflowConditionFieldPaths(group);
    const values = resolveWorkflowConditionValues(group, workflowContext());

    expect(paths).toEqual([
      "application.requested_amount",
      "fundingCall.maximum_grant_amount",
      "stage.financial_review.recommended_amount",
    ]);
    expect(values).toEqual({
      "application.requested_amount": 350_000,
      "fundingCall.maximum_grant_amount": 500_000,
      "stage.financial_review.recommended_amount": 400_000,
    });
    expect(evaluateConditionGroup(group, values).passed).toBe(true);
  });

  it("deduplicates explicit path requests", () => {
    expect(resolveWorkflowFieldValues([
      "application.requested_amount",
      "application.requested_amount",
    ], workflowContext())).toEqual({
      "application.requested_amount": 350_000,
    });
  });
});
