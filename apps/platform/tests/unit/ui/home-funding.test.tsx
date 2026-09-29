import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeFunding } from "@/modules/content/ui/public/HomeFunding";
import { getHomeNewsAndResources } from "@/modules/content/ServerContentQueries";

vi.mock("@/modules/content/ServerContentQueries", () => ({
  getHomeNewsAndResources: vi.fn(),
}));

describe("homepage news and resources", () => {
  beforeEach(() => {
    vi.mocked(getHomeNewsAndResources).mockResolvedValue({ news: [], resources: [
      {
        category: "Application guide",
        href: "/documents/sme-fund-first-call-funding-criteria.pdf",
        id: 1,
        image: {
          alt: "First Call for Applications funding criteria guide",
          height: 1404,
          url: "/api/media/file/funding-guide.png",
          width: 993,
        },
        slug: "first-call-funding-criteria",
        summary: "Approved application criteria.",
        title: "First Call funding criteria",
      },
    ] });
  });

  it("shows the guide thumbnail and opens the resource in a new tab", async () => {
    const component = await HomeFunding({
      heading: "Latest News & Resources",
    });
    const markup = renderToStaticMarkup(component);

    expect(markup).toContain(
      'alt="First Call for Applications funding criteria guide"',
    );
    expect(markup).toContain(
      'href="/documents/sme-fund-first-call-funding-criteria.pdf"',
    );
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("opens in a new tab");
  });
});
