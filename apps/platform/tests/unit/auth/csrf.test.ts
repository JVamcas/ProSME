import { describe, expect, it } from "vitest";

import { createCsrfToken } from "@/auth/csrf/create-token";
import { csrfTokensMatch } from "@/auth/csrf/verify-token";

describe("CSRF tokens", () => {
  it("generates unique tokens and validates exact matches", () => {
    const first = createCsrfToken();
    const second = createCsrfToken();
    expect(first).not.toBe(second);
    expect(csrfTokensMatch(first, first)).toBe(true);
  });

  it("rejects absent, unequal, and differently sized values", () => {
    expect(csrfTokensMatch(null, null)).toBe(false);
    expect(csrfTokensMatch("one", "two")).toBe(false);
    expect(csrfTokensMatch("short", "a-much-longer-value")).toBe(false);
  });
});
