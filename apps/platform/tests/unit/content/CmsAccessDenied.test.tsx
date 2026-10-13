import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";

const mocks = vi.hoisted(() => ({ user: vi.fn() }));

vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("@payloadcms/next/css", () => ({}));
vi.mock("@payloadcms/next/layouts", () => ({
  RootLayout: ({ children }: { children: ReactNode }) => (
    <div data-payload-layout>{children}</div>
  ),
  handleServerFunctions: vi.fn(),
}));
vi.mock("@ant-design/nextjs-registry", () => ({
  AntdRegistry: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/app/(payload)/cms/importMap", () => ({ importMap: {} }));
vi.mock("@/platform/auth/ServerAuthNavigation", () => ({
  getAuthenticatedPageUser: mocks.user,
}));
vi.mock("@/platform/auth/ui/SessionActivity", () => ({
  CmsSessionActivity: () => null,
}));
vi.mock("@/modules/content/ui/admin/CmsLogoutButton", () => ({
  default: () => <span>Logout</span>,
}));

import { CmsAccessDenied } from "@/modules/content/ui/admin/CmsAccessDenied";
import PayloadLayout from "@/app/(payload)/layout";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({
    status: "active",
    capabilities: new Set([permissionCodes.userProfileOwnRead]),
  });
});

describe("CMS access-denied context", () => {
  it("keeps CMS branding and permitted workspace navigation without a public-site shell", async () => {
    const markup = renderToStaticMarkup(await CmsAccessDenied());
    expect(markup).toContain('aria-label="CMS workspace"');
    expect(markup).toContain("CMS access denied");
    expect(markup).toContain('href="/cms"');
    expect(markup).toContain('href="/portal"');
    expect(markup).not.toContain('href="/unauthorized"');
    expect(markup).not.toContain('href="/admin"');
    expect(markup).toContain("Logout");
  });

  it("replaces protected content inside the CMS layout when CMS access is denied", async () => {
    const layout = await PayloadLayout({ children: <div>Protected CMS content</div> });
    const workspace = layout.props.children.props.children;
    const deniedView = workspace.props.children[1];
    expect(deniedView.type).toBe(CmsAccessDenied);
    expect(workspace.props.children[0].type).toBeDefined();
  });

  it("keeps protected CMS content when the platform role grants access", async () => {
    mocks.user.mockResolvedValue({
      status: "active",
      capabilities: new Set([permissionCodes.cmsAccess]),
    });
    const content = <div>Protected CMS content</div>;
    const layout = await PayloadLayout({ children: content });
    const workspace = layout.props.children.props.children;
    expect(workspace.props.children[1]).toBe(content);
  });

  it("preserves sign-in redirects for missing sessions", async () => {
    mocks.user.mockRejectedValue(new Error("Redirect to sign-in"));
    await expect(PayloadLayout({ children: "Protected CMS content" }))
      .rejects.toThrow("Redirect to sign-in");
  });
});
