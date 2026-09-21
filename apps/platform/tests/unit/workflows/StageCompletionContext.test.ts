import { describe, expect, it } from "vitest";

import { buildStageCompletionValues } from "@/modules/workflows/engine/StageCompletionContext";

describe("stage completion context", () => {
  it("exposes form, checklist, document and scoring results by stable keys", () => {
    expect(buildStageCompletionValues([
      {
        responseValues: { RECOMMENDED_AMOUNT: 400_000 },
        taskResult: null,
      },
      {
        responseValues: null,
        taskResult: {
          comments: { DELIVERY: "Strong evidence" },
          decisions: [{ category: "TAX_STATUS", outcome: "VERIFIED" }],
          items: [{ accepted: true, code: "ENTITY_VERIFIED" }],
          scores: { DELIVERY: 8 },
          weightedTotal: 7.5,
        },
      },
    ])).toEqual({
      DELIVERY: 8,
      DELIVERY_COMMENT: "Strong evidence",
      ENTITY_VERIFIED: true,
      RECOMMENDED_AMOUNT: 400_000,
      TAX_STATUS: "VERIFIED",
      weightedTotal: 7.5,
    });
  });

  it("does not copy task configuration or displayed context", () => {
    expect(buildStageCompletionValues([{
      responseValues: { DECISION: "APPROVE" },
      taskResult: { values: { RISK_RATING: "LOW" } },
    }])).toEqual({
      DECISION: "APPROVE",
      RISK_RATING: "LOW",
    });
  });
});
