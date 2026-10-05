import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

    const sections = buildHomeGuideSections(home, false);
    const [banner] = sections;

    expect(banner).toMatchObject({
      title: "Home Page Banner",
      preview: "The current banner headline",
      detail: "The current introduction",
      image: "/api/media/file/banner.jpg",
    });
    expect(banner.target).toBeUndefined();
    expect(sections[1].title).toBe("Action cards");
    expect(sections[1].target).toBeUndefined();
  });

  it("shows the five editable Home sections", async () => {
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
      },
    };
    const component = await CmsHomeGuide({
      initPageResult: {
        req,
        visibleEntities: { collections: [], globals: [] },
      },
    } as unknown as Parameters<typeof CmsHomeGuide>[0]);
    const markup = renderToStaticMarkup(component);

    const removedHeadings = [
      "Featured funding call",
      "News and resources",
    ];
    expect(markup).toMatch(/<h2\b[^>]*>Home Page Banner<\/h2>/);
    expect(markup).toMatch(/<h2\b[^>]*>Action cards<\/h2>/);
    expect(markup.match(/<article/g)).toHaveLength(5);
    for (const heading of removedHeadings) {
      expect(markup).not.toContain(heading);
    }
    expect(markup).toContain("A home headline");
    expect(markup).toContain("Impact heading");
    expect(markup).toContain('href="/cms/home/how-it-works"');
    expect(markup).toContain('href="/cms/home/who-we-support"');
    expect(markup).toContain('href="/cms/home/additional-content"');
    expect(markup).toContain('href="/cms/home/banner"');
    expect(markup).toContain('href="/cms/home/action-cards"');
    expect(markup).toContain("I want funding · Am I eligible? · I already applied");
    // Payload already wraps dashboard views in its template. A nested template
    // would render a second navigation/sidebar when returning through CMS.
    expect(markup).not.toContain("data-cms-shell");
    expect(markup).not.toContain('href="/admin/funding-calls"');
    expect(markup).not.toContain("Related content");
    expect(markup).not.toContain("Appears on every page");
  });
});
