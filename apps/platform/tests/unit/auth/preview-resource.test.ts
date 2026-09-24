import { describe, expect, it } from "vitest";

import { previewResource } from "@/auth/authorization/preview-resource";

describe("frontend preview authorization", () => {
  it.each([
    ["/", "site-settings"],
    ["/news/update", "news"],
    ["/resources/guide", "resources"],
    ["/events/briefing", "events"],
    ["/eligibility", "eligibility"],
    ["/faq", "faqs"],
    ["/about", "pages"],
  ])("maps %s to the %s permission scope", (path, expected) => {
    expect(previewResource(path)).toBe(expected);
  });
});
