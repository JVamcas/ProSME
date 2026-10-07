// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CmsNavigation from "@/modules/content/ui/admin/CmsNavigation";
import CmsNavigationLinks from "@/modules/content/ui/admin/CmsNavigationLinks";
import CmsSidebar from "@/modules/content/ui/admin/CmsSidebar";
import { permissionCodes } from "@/auth/authorization/permissions";

const access = vi.hoisted(() => ({
  currentUser: vi.fn(),
  logout: vi.fn(),
  pathname: "/cms",
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
    status: "active",
    capabilities: new Set([
      permissionCodes.cmsAccess,
      permissionCodes.userProfileOwnRead,
      permissionCodes.workflowTaskAllRead,
    ]),
  });
  access.pathname = "/cms";
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
      <CmsSidebar
        availableSpaces={["applicant", "operations", "cms"]}
        displayName="CMS editor"
        email="cms@example.test"
      />,
    ),
  );
  return { container, root };
}

describe("CMS navigation", () => {
  it("uses one Website content heading for its top-level destinations", () => {
    const html = renderToStaticMarkup(<CmsNavigationLinks />);

    expect(html.match(/>Website content<\/p>/g)).toHaveLength(1);
    expect(html.indexOf("Website content")).toBeLessThan(html.indexOf("Home Page"));
    expect(html).toContain("About");
    expect(html).toContain("Resource Centre");
    expect(html).toContain("Funding");
  });

  it("places Resource Centre directly below About and marks its native editor active", () => {
    access.pathname = "/cms/collections/resources/42";
    const html = renderToStaticMarkup(<CmsNavigationLinks />);
    expect(html.indexOf('href="/cms/about"')).toBeLessThan(
      html.indexOf('href="/cms/collections/resources"'),
    );
    expect(html).toContain(">Resource Centre</span>");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
  it("shows an expandable Home Page container without an Overview entry", () => {
    const html = renderToStaticMarkup(<CmsNavigationLinks />);
    expect(html).toContain("Home Page");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Overview");
    expect(html).not.toContain('href="/admin"');
  });

  it("places About after Home as an active top-level sidebar link", () => {
    access.pathname = "/cms/about";
    const html = renderToStaticMarkup(<CmsNavigationLinks />);
    expect(html.indexOf("Home Page")).toBeLessThan(html.indexOf('href="/cms/about"'));
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/cms/about"');
    expect(html).toContain(">About</span>");
    expect(html).toContain('aria-expanded="false"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("expands Funding and marks Application guide active", () => {
    access.pathname = "/cms/funding/application-guide";
    const html = renderToStaticMarkup(<CmsNavigationLinks />);
    expect(html).toContain('href="/cms/funding/application-guide"');
    expect(html).toContain(">Application guide</span>");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("expands Overview and shows its three independent editors", () => {
    access.pathname = "/cms/funding/overview/priority-applicants";
    const html = renderToStaticMarkup(<CmsNavigationLinks />);
    expect(html).toContain('href="/cms/funding/overview/support"');
    expect(html).toContain('href="/cms/funding/overview/priority-applicants"');
    expect(html).toContain('href="/cms/funding/overview/focus-sectors"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("shows FAQ after Funding as the active content link", () => {
    access.pathname = "/cms/faq";
    const html = renderToStaticMarkup(<CmsNavigationLinks />);
    expect(html).toContain('href="/cms/faq"');
    expect(html).toContain(">FAQ</span>");
    expect(html.indexOf(">Funding</span>")).toBeLessThan(html.indexOf('href="/cms/faq"'));
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("shows Contact Us after FAQ as the active content link", () => {
    access.pathname = "/cms/contact";
    const html = renderToStaticMarkup(<CmsNavigationLinks />);
    expect(html).toContain('href="/cms/contact"');
    expect(html).toContain(">Contact Us</span>");
    expect(html.indexOf(">FAQ</span>")).toBeLessThan(html.indexOf('href="/cms/contact"'));
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it.each(["banner", "action-cards", "how-it-works", "who-we-support", "additional-content"])(
    "expands Home Page and marks only the active %s section",
    (section) => {
      access.pathname = `/cms/home/${section}`;
      const html = renderToStaticMarkup(<CmsNavigationLinks />);
      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain('href="/cms/home/banner"');
      expect(html).toContain('href="/cms/home/action-cards"');
      expect(html).toContain("Home Page Banner");
      expect(html).toContain("Action cards");
      expect(html).toContain('href="/cms/home/how-it-works"');
      expect(html).toContain('href="/cms/home/who-we-support"');
      expect(html).toContain('href="/cms/home/additional-content"');
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      expect(html).not.toContain("/cms/globals/homepage");
    },
  );

  it("expands the icon rail from the Home Page container", async () => {
    const { container, root } = await renderSidebar();
    await act(async () =>
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Collapse navigation sidebar"]',
      )?.click(),
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('button[title="Home Page"]')?.click(),
    );
    expect(container.querySelector('[data-sidebar-frame]')?.getAttribute("data-collapsed"))
      .toBe("false");
    expect(container.querySelector('a[href="/cms/home/banner"]')).not.toBeNull();
    await act(async () => root.unmount());
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
    expect(html).toContain('aria-label="Switch portal space"');
    expect(html).toContain('href="/portal"');
    expect(html).toContain('href="/admin"');
    expect(html).toContain('href="/cms"');
  });

  it("renders no sidebar without a signed-in application user", async () => {
    access.currentUser.mockResolvedValue(null);
    expect(await CmsNavigation()).toBeNull();
  });

  it("renders no CMS sidebar without the canonical CMS grant", async () => {
    access.currentUser.mockResolvedValue({
      status: "active",
      capabilities: new Set(),
    });
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
    expect(container.querySelector('button[title="Home Page"]')).not.toBeNull();
    expect(document.documentElement.style.getPropertyValue("--cms-nav-width")).toBe("80px");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Expand navigation sidebar"]',
        )
        ?.click(),
    );
    expect(document.documentElement.style.getPropertyValue("--cms-nav-width")).toBe("320px");
    await act(async () => root.unmount());
    expect(document.documentElement.style.getPropertyValue("--cms-nav-width")).toBe("");
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
    expect(document.documentElement.style.getPropertyValue("--cms-nav-width")).toBe("480px");
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
