// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CmsNavigation from "@/modules/content/ui/admin/CmsNavigation";
import CmsNavigationLinks from "@/modules/content/ui/admin/CmsNavigationLinks";
import CmsSidebar from "@/modules/content/ui/admin/CmsSidebar";

const access = vi.hoisted(() => ({
  currentUser: vi.fn(),
  logout: vi.fn(),
  pathname: "/cms/home",
  mobile: false,
  setNavOpen: vi.fn(),
}));

vi.mock("@/auth/authorization/current-user", () => ({
  getCurrentUser: access.currentUser,
}));
vi.mock("@/platform/auth/firebase/ClientAuthService", () => ({
  authClientService: { logout: access.logout },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => access.pathname,
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@payloadcms/ui", () => ({
  useNav: () => ({ setNavOpen: access.setNavOpen }),
  useWindowInfo: () => ({ breakpoints: { m: access.mobile } }),
}));
vi.mock("@payloadcms/next/client", () => ({
  NavWrapper: ({ children }: { children: React.ReactNode }) => (
    <aside className="nav nav--nav-open">
      <div className="nav__scroll">{children}</div>
    </aside>
  ),
}));

beforeEach(() => {
  access.currentUser.mockResolvedValue({
    displayName: "CMS editor",
    email: "cms@example.test",
  });
  access.pathname = "/cms/home";
  access.mobile = false;
  vi.clearAllMocks();
});
afterEach(() => document.body.replaceChildren());

async function renderSidebar() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <CmsSidebar displayName="CMS editor" email="cms@example.test" />,
    ),
  );
  return { container, root };
}

describe("CMS navigation", () => {
  it("shows Home Page as the only navigation item with the same active item presentation", () => {
    const html = renderToStaticMarkup(<CmsNavigationLinks />);
    expect(html).toContain('href="/cms/home"');
    expect(html).toContain("Home Page");
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('href="/admin"');
  });

  it("keeps Home active while editing its global", () => {
    access.pathname = "/cms/globals/homepage";
    expect(renderToStaticMarkup(<CmsNavigationLinks />)).toContain(
      'aria-current="page"',
    );
    access.pathname = "/cms/collections/news";
    expect(renderToStaticMarkup(<CmsNavigationLinks />)).not.toContain(
      'aria-current="page"',
    );
  });

  it("uses the shared header, user, navigation and pinned footer without a Query provider", async () => {
    const html = renderToStaticMarkup(await CmsNavigation());
    const slots = ["header", "user", "navigation", "footer"];
    const positions = slots.map((slot) =>
      html.indexOf(`data-sidebar-slot="${slot}"`),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual(
      [...positions].sort((first, second) => first - second),
    );
    expect(html).toContain("CMS editor");
    expect(html).toContain("cms@example.test");
    expect(html).toContain("Logout");
  });

  it("renders no sidebar without a signed-in application user", async () => {
    access.currentUser.mockResolvedValue(null);
    expect(await CmsNavigation()).toBeNull();
  });

  it("collapses to the shared icon rail and restores the expanded width", async () => {
    const { container, root } = await renderSidebar();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Collapse navigation sidebar"]',
        )
        ?.click(),
    );
    expect(
      container
        .querySelector("[data-sidebar-frame]")
        ?.getAttribute("data-collapsed"),
    ).toBe("true");
    expect(container.querySelector('a[title="Home Page"]')).not.toBeNull();
    expect(container.querySelector("style")?.textContent).toContain("80px");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Expand navigation sidebar"]',
        )
        ?.click(),
    );
    expect(container.querySelector("style")?.textContent).toContain("272px");
    await act(async () => root.unmount());
  });

  it("resizes with the shared keyboard control and bounds", async () => {
    const { container, root } = await renderSidebar();
    const handle = container.querySelector<HTMLElement>(
      '[aria-label="Resize navigation sidebar"]',
    );
    await act(async () =>
      handle?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "End" }),
      ),
    );
    expect(handle?.getAttribute("aria-valuenow")).toBe("480");
    expect(container.querySelector("style")?.textContent).toContain("480px");
    await act(async () =>
      handle?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
      ),
    );
    expect(handle?.getAttribute("aria-valuenow")).toBe("480");
    await act(async () => root.unmount());
  });

  it("closes the mobile sidebar through Payload's own navigation state", async () => {
    access.mobile = true;
    const { container, root } = await renderSidebar();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Close navigation sidebar"]',
        )
        ?.click(),
    );
    expect(access.setNavOpen).toHaveBeenCalledWith(false);
    await act(async () => root.unmount());
  });
});
