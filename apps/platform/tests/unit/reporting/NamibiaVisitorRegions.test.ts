import { describe, expect, it } from "vitest";
import { canonicalNamibiaRegion, namibiaVisitorRegions } from "@/modules/reporting/domain/NamibiaVisitorRegions";

describe("Namibia visitor region normalization", () => {
  it.each(namibiaVisitorRegions)(
    "accepts canonical and GA suffixed names for %s",
    (region) => {
      expect(canonicalNamibiaRegion(region)).toBe(region);
      expect(canonicalNamibiaRegion(`${region} Region`)).toBe(region);
      expect(canonicalNamibiaRegion(` ${region.toUpperCase()} REGION `)).toBe(
        region,
      );
    },
  );

  it.each([
    "(not set)",
    "Unverified alias",
    "Unknown Region",
    "Khomas Region extra",
    "",
  ])(
    "keeps unknown provider name %j unmapped",
    (value) => {
      expect(canonicalNamibiaRegion(value)).toBeNull();
    },
  );
});
