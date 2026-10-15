import { describe, expect, it } from "vitest";
import { formatWorkflowStageScore } from "@/modules/workflows/domain/WorkflowStageScoreDisplay";

describe("stage score scale", () => {
  it.each([
    [7.5, 10, "POINTS", "7.50 / 10"],
    [75, 100, "PERCENTAGE", "75.00%"],
    [150, 200, "PERCENTAGE", "150.00% / 200%"],
    [0, 10, "POINTS", "0.00 / 10"],
    [null, null, null, "—"],
  ] as const)(
    "formats %s out of %s in %s",
    (averageScore, scoreMaximum, scoreUnit, expected) => {
      expect(
        formatWorkflowStageScore({ averageScore, scoreMaximum, scoreUnit }),
      ).toBe(expected);
    },
  );
});
