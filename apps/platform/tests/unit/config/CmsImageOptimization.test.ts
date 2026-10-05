import { describe, expect, it, vi } from "vitest";
import { hasLocalMatch } from "next/dist/shared/lib/match-local-pattern";

vi.mock("../../../config/load-environment.js", () => ({
  loadEnvironment: () => undefined,
}));

import config from "../../../next.config.mjs";

describe("CMS image optimizer allow-list", () => {
  it("accepts media URLs with their UUID storage prefix", () => {
    expect(hasLocalMatch(
      config.images?.localPatterns,
      "/api/media/file/pic7-mobile.png?prefix=media%2F84b7ca16-de39-43ad-87d9-041d49668efc",
    )).toBe(true);
  });

  it("keeps ordinary static images valid and rejects queries on other routes", () => {
    expect(hasLocalMatch(config.images?.localPatterns, "/brand/logo.png")).toBe(true);
    expect(hasLocalMatch(config.images?.localPatterns, "/api/documents?file=private")).toBe(false);
  });
});
