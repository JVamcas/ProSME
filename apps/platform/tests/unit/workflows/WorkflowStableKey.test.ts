import { describe, expect, it } from "vitest";

import {
  stableKeyFromLabel,
  uniqueStableKeyFromLabel,
} from "@/modules/workflows/domain/WorkflowStableKey";

describe("workflow stable keys", () => {
  it("generates a normalized key from a user-facing name", () => {
    expect(stableKeyFromLabel("Administrative & eligibility screening", "STAGE"))
      .toBe("ADMINISTRATIVE_ELIGIBILITY_SCREENING");
  });

  it("prefixes names that do not start with a letter", () => {
    expect(stableKeyFromLabel("2026 review", "STAGE"))
      .toBe("STAGE_2026_REVIEW");
  });

  it("adds a deterministic suffix when a generated key already exists", () => {
    expect(uniqueStableKeyFromLabel(
      "Finance review",
      ["FINANCE_REVIEW", "FINANCE_REVIEW_2"],
      "STAGE",
    )).toBe("FINANCE_REVIEW_3");
  });

  it("keeps collision-safe keys within the maximum length", () => {
    const label = "a".repeat(90);
    const baseKey = stableKeyFromLabel(label, "STAGE");
    const key = uniqueStableKeyFromLabel(label, [baseKey], "STAGE");

    expect(key).toHaveLength(80);
    expect(key.endsWith("_2")).toBe(true);
  });
});
