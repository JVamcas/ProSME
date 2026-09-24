import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  evaluateStageCondition,
  normalizeStageConditionRecord,
} from "@/modules/workflows/engine/StageCondition";

const condition: ConditionGroup = {
  children: [{
    id: "condition-1",
    kind: "CONDITION",
    leftOperand: { key: "application.requested_amount", kind: "FIELD" },
    operator: basicOperators.LESS_THAN_OR_EQUAL,
    rightOperand: { key: "fundingCall.maximum_amount", kind: "FIELD" },
  }],
  combinator: "AND",
  id: "group-1",
  kind: "GROUP",
};

describe("stage entry condition", () => {
  it("passes stages without an entry condition", () => {
    expect(evaluateStageCondition(null, {
      application: {},
      eligibility: {},
      fundingCall: {},
      stages: [],
    })).toEqual({
      evaluation: null,
      passed: true,
      resolutionError: null,
    });
  });

  it("evaluates application and funding-call values", () => {
    const result = evaluateStageCondition(condition, {
      application: { requested_amount: 250_000 },
      eligibility: {},
      fundingCall: { maximum_amount: 500_000 },
      stages: [],
    });

    expect(result.passed).toBe(true);
    expect(result.evaluation?.passed).toBe(true);
    expect(result.resolutionError).toBeNull();
  });

  it("fails closed when a referenced runtime value is unavailable", () => {
    const result = evaluateStageCondition(condition, {
      application: {},
      eligibility: {},
      fundingCall: { maximum_amount: 500_000 },
      stages: [],
    });

    expect(result.passed).toBe(false);
    expect(result.evaluation).toBeNull();
    expect(result.resolutionError).toMatchObject({
      code: "VALUE_NOT_FOUND",
      path: "application.requested_amount",
    });
  });

  it("normalizes persisted camel-case values to stable context paths", () => {
    expect(normalizeStageConditionRecord({
      requestedAmount: 250_000,
      submittedAt: new Date("2026-09-21T08:00:00.000Z"),
    })).toEqual({
      requested_amount: 250_000,
      submitted_at: "2026-09-21T08:00:00.000Z",
    });
  });
});
