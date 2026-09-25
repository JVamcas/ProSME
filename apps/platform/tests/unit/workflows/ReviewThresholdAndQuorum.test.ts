import { describe, expect, it } from "vitest";

import {
  requiredReviewCompletions,
} from "@/modules/workflows/domain/runtime/ReviewThreshold";
import {
  evaluateQuorum,
  type QuorumRule,
} from "@/modules/workflows/domain/runtime/Quorum";

const rule: QuorumRule = {
  population: "REGISTERED",
  minimumCount: 2,
  minimumPercentage: 50,
  rounding: "CEIL",
  chairRequired: true,
  recusalDenominator: "EXCLUDE",
  freeze: "AT_DECISION",
  abstentionsCountAsPresent: true,
};

describe("reviewer completion threshold", () => {
  it("uses stable slot denominators and rounds percentage up", () => {
    expect(requiredReviewCompletions({
      mode: "ALL",
      count: 1,
      percentage: null,
      rounding: "CEIL",
    }, 3)).toBe(3);
    expect(requiredReviewCompletions({
      mode: "COUNT",
      count: 2,
      percentage: null,
      rounding: "CEIL",
    }, 3)).toBe(2);
    expect(requiredReviewCompletions({
      mode: "PERCENT",
      count: 1,
      percentage: 67,
      rounding: "CEIL",
    }, 3)).toBe(3);
  });
});

describe("participation quorum", () => {
  const participants = [
    {
      userId: "chair",
      isChair: true,
      attendance: "PRESENT" as const,
      coiCleared: true,
      abstained: true,
    },
    {
      userId: "member",
      isChair: false,
      attendance: "PRESENT" as const,
      coiCleared: true,
      abstained: false,
    },
    {
      userId: "recused",
      isChair: false,
      attendance: "RECUSED" as const,
      coiCleared: false,
      abstained: false,
    },
  ];

  it("counts a cleared abstaining chair as present and excludes recusals", () => {
    expect(evaluateQuorum(rule, participants)).toMatchObject({
      denominator: 2,
      requiredCount: 2,
      satisfied: true,
    });
  });

  it("denies quorum when the required chair is absent or uncleared", () => {
    const absentChair = participants.map((item) => item.userId === "chair"
      ? { ...item, attendance: "ABSENT" as const }
      : item);
    expect(evaluateQuorum(rule, absentChair).satisfied).toBe(false);
    const unclearedChair = participants.map((item) => item.userId === "chair"
      ? { ...item, coiCleared: false }
      : item);
    expect(evaluateQuorum(rule, unclearedChair).satisfied).toBe(false);
  });

  it("uses the configured recusal denominator and abstention policy", () => {
    expect(evaluateQuorum({
      ...rule,
      recusalDenominator: "INCLUDE",
      minimumPercentage: 100,
    }, participants)).toMatchObject({
      denominator: 3,
      requiredCount: 3,
      satisfied: false,
    });
    expect(evaluateQuorum({
      ...rule,
      abstentionsCountAsPresent: false,
    }, participants).satisfied).toBe(false);
  });
});
