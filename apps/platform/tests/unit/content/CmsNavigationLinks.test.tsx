import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CmsNavigationLinks from "@/modules/content/ui/admin/CmsNavigationLinks";

const access = vi.hoisted(() => ({
  currentUser: vi.fn(),
  operations: vi.fn(),
}));

vi.mock("@/auth/authorization/current-user", () => ({
  getCurrentUser: access.currentUser,
}));

vi.mock("@/auth/authorization/portal-access", () => ({
  canAccessOperationsPortal: access.operations,
}));

beforeEach(() => {
  access.currentUser.mockResolvedValue({ displayName: "CMS editor" });
  access.operations.mockReturnValue(false);
});

describe("CMS navigation links", () => {
  it("does not offer operations to a CMS-only editor", async () => {
    const html = renderToStaticMarkup(await CmsNavigationLinks());

    expect(html).toContain('href="/cms"');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('href="/admin"');
  });

  it("offers operations to an authorized user", async () => {
    access.operations.mockReturnValue(true);

    const html = renderToStaticMarkup(await CmsNavigationLinks());

    expect(html).toContain('href="/admin"');
  });

  it("renders no links without a signed-in user", async () => {
    access.currentUser.mockResolvedValue(null);

    const html = renderToStaticMarkup(await CmsNavigationLinks());

    expect(html).toBe("");
  });
});
