import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/reporting/infrastructure/AnonymousEligibilityRepository",
  () => ({ recordAnonymousEligibilityCheck: vi.fn() }),
);
import { recordAnonymousEligibilityCheck } from "@/modules/reporting/infrastructure/AnonymousEligibilityRepository";
import {
  collectAnonymousEligibilityOutcome,
  hasWebsiteAnalyticsConsent,
} from "@/modules/reporting/ServerWebsiteAnalyticsCollectionService";

beforeEach(() => vi.clearAllMocks());
describe("anonymous assessment collection", () => {
  it("requires an exact accepted consent cookie", () => {
    expect(hasWebsiteAnalyticsConsent(new Headers())).toBe(false);
    expect(
      hasWebsiteAnalyticsConsent(
        new Headers({
          cookie: "other=accepted; smefund_analytics_consent=accepted",
        }),
      ),
    ).toBe(true);
    expect(
      hasWebsiteAnalyticsConsent(
        new Headers({ cookie: "smefund_analytics_consent=accepted-evil" }),
      ),
    ).toBe(false);
  });

  it("returns normally and emits no raw payload when persistence fails", async () => {
    vi.mocked(recordAnonymousEligibilityCheck).mockRejectedValue(
      new Error("private answer"),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      collectAnonymousEligibilityOutcome({
        fundingCallId: "call",
        ruleSetVersionId: "version",
        outcome: "likely-eligible",
      }),
    ).resolves.toBeUndefined();
    expect(JSON.stringify(warn.mock.calls)).not.toContain("private answer");
    warn.mockRestore();
  });
});
