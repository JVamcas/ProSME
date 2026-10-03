import { describe, expect, it } from "vitest";

import {
  authNavigationHref,
  authReturnTo,
  safeReturnTo,
} from "@/platform/auth/AuthNavigation";

describe("generic authentication return destinations", () => {
  it.each([
    "/portal/applications/new?fundingOpportunityId=chosen-call",
    "/admin/tasks/task-id?tab=history&filter=awaiting+review",
    "/cms/collections/pages/42",
    "/portal/businesses?page=2",
  ])("preserves the requested local URL: %s", (path) => {
    expect(safeReturnTo(path)).toBe(path);
    const href = authNavigationHref("/sign-in", path);
    expect(new URL(href, "https://platform.invalid").searchParams.get("returnTo"))
      .toBe(path);
  });

  it.each([
    "https://example.com/",
    "//example.com/",
    "/\\example.com/",
    "/%5cexample.com/",
    "/%2fexample.com/",
    "/path%0aLocation:evil",
    "javascript:alert(1)",
    "/%invalid",
    "portal/tasks",
    "",
  ])("rejects unsafe destinations: %s", (path) => {
    expect(safeReturnTo(path)).toBeUndefined();
    expect(authNavigationHref("/sign-in", path)).toBe("/sign-in");
  });

  it("accepts old next links while giving returnTo priority", () => {
    expect(authReturnTo({ next: "/admin/users" })).toBe("/admin/users");
    expect(authReturnTo({ returnTo: "/portal/businesses", next: "/admin" }))
      .toBe("/portal/businesses");
    expect(authReturnTo({ returnTo: "//evil.invalid", next: "/admin" }))
      .toBeUndefined();
    expect(authReturnTo({ returnTo: ["/portal", "//evil.invalid"] }))
      .toBe("/portal");
  });

  it("does not invent a destination when there is none", () => {
    expect(authReturnTo({})).toBeUndefined();
    expect(authNavigationHref("/register")).toBe("/register");
  });
});
