import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  evaluateStageEntryCondition,
  normalizeStageConditionRecord,
} from "@/modules/workflows/engine/StageEntryCondition";

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
    expect(evaluateStageEntryCondition(null, {
      application: {},
      fundingCall: {},
      stages: [],
    })).toEqual({
      evaluation: null,
      passed: true,
      resolutionError: null,
    });
  });

  it("evaluates application and funding-call values", () => {
    const result = evaluateStageEntryCondition(condition, {
      application: { requested_amount: 250_000 },
      fundingCall: { maximum_amount: 500_000 },
      stages: [],
    });

    expect(result.passed).toBe(true);
    expect(result.evaluation?.passed).toBe(true);
    expect(result.resolutionError).toBeNull();
  });

  it("fails closed when a referenced runtime value is unavailable", () => {
    const result = evaluateStageEntryCondition(condition, {
      application: {},
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
