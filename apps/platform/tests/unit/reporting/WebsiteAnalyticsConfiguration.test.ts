import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/reporting/infrastructure/AnonymousEligibilityRepository",
  () => ({
    recordAnonymousEligibilityCheck: vi.fn(),
  }),
);

import { getWebsiteAnalyticsMeasurementId } from "@/modules/reporting/ServerWebsiteAnalyticsCollectionService";

beforeEach(() => {
  vi.stubEnv("GA_COLLECTION_ENABLED", "true");
  vi.stubEnv("GA_MEASUREMENT_ID", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("website collection measurement ID selection", () => {
  it("uses the trimmed environment measurement ID", () => {
    vi.stubEnv("GA_MEASUREMENT_ID", " G-DEVELOPMENT123 ");
    expect(getWebsiteAnalyticsMeasurementId()).toBe("G-DEVELOPMENT123");
  });

  it.each([undefined, "", "   "])(
    "disables collection when the environment ID is blank (%s)",
    (value) => {
      vi.stubEnv("GA_MEASUREMENT_ID", value);
      expect(getWebsiteAnalyticsMeasurementId()).toBeNull();
    },
  );

  it("disables collection for an invalid explicit environment ID", () => {
    vi.stubEnv("GA_MEASUREMENT_ID", "556568299");
    expect(getWebsiteAnalyticsMeasurementId()).toBeNull();
  });

  it.each([undefined, "false"])(
    "requires the collection flag even with an environment ID (%s)",
    (value) => {
      vi.stubEnv("GA_MEASUREMENT_ID", "G-DEVELOPMENT123");
      vi.stubEnv("GA_COLLECTION_ENABLED", value);
      expect(getWebsiteAnalyticsMeasurementId()).toBeNull();
    },
  );

  it("rejects invalid configured IDs", () => {
    vi.stubEnv("GA_MEASUREMENT_ID", "invalid");
    expect(getWebsiteAnalyticsMeasurementId()).toBeNull();
  });
});
