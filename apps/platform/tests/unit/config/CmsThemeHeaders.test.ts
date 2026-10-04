import { describe, expect, it } from "vitest";
import { scopeCmsThemeHeaders } from "../../../config/scope-cms-theme-headers.js";

describe("CMS theme hint scope", () => {
  it("keeps critical color negotiation on CMS and preserves unrelated platform headers", () => {
    const scoped = scopeCmsThemeHeaders([
      {
        source: "/:path*",
        headers: [
          { key: "Accept-CH", value: "Sec-CH-Prefers-Color-Scheme" },
          { key: "Critical-CH", value: "Sec-CH-Prefers-Color-Scheme" },
          { key: "Vary", value: "Cookie, Sec-CH-Prefers-Color-Scheme" },
          { key: "X-Powered-By", value: "Next.js, Payload" },
        ],
      },
    ]);
    expect(scoped).toEqual([
      {
        source: "/:path*",
        headers: [
          { key: "Vary", value: "Cookie" },
          { key: "X-Powered-By", value: "Next.js, Payload" },
        ],
      },
      {
        source: "/cms/:path*",
        headers: [
          { key: "Accept-CH", value: "Sec-CH-Prefers-Color-Scheme" },
          { key: "Critical-CH", value: "Sec-CH-Prefers-Color-Scheme" },
          { key: "Vary", value: "Sec-CH-Prefers-Color-Scheme" },
        ],
      },
    ]);
  });

  it("preserves custom rules and unrelated hints, and omits empty rules", () => {
    const rule = {
      source: "/api/:path*",
      headers: [{ key: "Cache-Control", value: "no-store" }],
    };
    const unrelated = {
      source: "/:path*",
      headers: [{ key: "Critical-CH", value: "Sec-CH-UA" }],
    };
    expect(scopeCmsThemeHeaders([rule, unrelated])).toEqual([rule, unrelated]);
    expect(
      scopeCmsThemeHeaders([
        {
          source: "/:path*",
          headers: [
            { key: "critical-ch", value: "sec-ch-prefers-color-scheme" },
          ],
        },
      ]),
    ).toEqual([
      {
        source: "/cms/:path*",
        headers: [{ key: "critical-ch", value: "Sec-CH-Prefers-Color-Scheme" }],
      },
    ]);
  });
});
