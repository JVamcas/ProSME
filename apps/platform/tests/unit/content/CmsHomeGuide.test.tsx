import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth/authorization/current-user", () => ({
  getCurrentUser: async () => null,
}));
vi.mock("@/auth/authorization/portal-access", () => ({
  canAccessOperationsPortal: () => false,
}));
vi.mock("@/payload/access/can-access-cms", () => ({
  hasCmsCapability: (user: { capabilities: string[] }, code: string) =>
    user.capabilities.includes(code),
}));
vi.mock("@payloadcms/next/templates", () => ({
  DefaultTemplate: ({ children }: { children: React.ReactNode }) => (
    <div data-cms-shell>{children}</div>
  ),
}));

import CmsHomeGuide from "@/modules/content/ui/admin/CmsHomeGuide";
import { buildHomeGuideSections } from "@/modules/content/ui/admin/CmsHomeGuideSections";
import type { Homepage } from "@/payload-types";

describe("Home section guide", () => {
  it("keeps the banner recognisable without granting an edit link to readers", () => {
    const home = {
      title: "The current banner headline",
      summary: "The current introduction",
      heroImage: { url: "/api/media/file/banner.jpg" },
    } as Homepage;

    const [banner] = buildHomeGuideSections(home, false, false);

    expect(banner).toMatchObject({
      title: "Home Page Banner",
      preview: "The current banner headline",
      detail: "The current introduction",
      image: "/api/media/file/banner.jpg",
    });
    expect(banner.target).toBeUndefined();
  });

  it("follows the displayed section order and hides operations editing for CMS users", async () => {
    const req = {
      user: {
        capabilities: ["cms.site-settings.update", "cms.eligibility.read"],
      },
      payload: {
        findGlobal: async () => ({
          title: "A home headline",
          summary: "A home summary",
          actionCards: { fundingTitle: "I want funding" },
          process: { heading: "How it works" },
          supportHeading: "Who we support",
          layout: [
            { blockType: "resourceGrid", heading: "Latest news" },
            { blockType: "statistics", heading: "Impact heading" },
          ],
        }),
        find: async () => ({ docs: [] }),
      },
    };
    const component = await CmsHomeGuide({
      initPageResult: {
        req,
        visibleEntities: { collections: [], globals: [] },
      },
    } as unknown as Parameters<typeof CmsHomeGuide>[0]);
    const markup = renderToStaticMarkup(component);

    const headings = [
      "Home Page Banner",
      "Three action cards",
      "Featured funding call",
      "News and resources",
      "How it works",
      "Who we support",
      "Impact",
    ];
    const positions = headings.map((heading) =>
      markup.indexOf(`<h2>${heading}</h2>`),
    );

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual(
      [...positions].sort((first, second) => first - second),
    );
    expect(markup).toContain("A home headline");
    expect(markup).toContain('href="/cms/globals/homepage#home-page-banner"');
    expect(markup).toContain("data-cms-shell");
    expect(markup).not.toContain('href="/admin/funding-calls"');
    expect(markup).toContain("Operations access is required");
  });
});
