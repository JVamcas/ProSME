import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeFunding } from "@/modules/content/ui/public/HomeFunding";
import { getHomeNewsAndResources } from "@/modules/content/ServerContentQueries";
import { ResourceCard } from "@/modules/content/ui/public/ResourceCard";

vi.mock("@/modules/content/ServerContentQueries", () => ({
  getHomeNewsAndResources: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getHomeNewsAndResources).mockResolvedValue({
    news: [],
    resources: [
      {
        category: "Application guide",
        href: "/documents/sme-fund-first-call-funding-criteria.pdf",
        id: 1,
        image: {
          alt: "First Call for Applications funding criteria guide",
          height: 1404,
          url: "/api/media/file/funding-guide.png",
          width: 993,
          sizes: {
            thumbnail: {
              url: "/api/media/file/funding-guide-320.png",
              width: 320,
            },
          },
        },
        slug: "first-call-funding-criteria",
        summary: "Approved application criteria.",
        title: "First Call funding criteria",
      },
    ],
  });
});

describe("homepage news and resources", () => {
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

  it("keeps news links in the current tab when sharing the card presentation", async () => {
    vi.mocked(getHomeNewsAndResources).mockResolvedValue({
      news: [{
        id: 2,
        slug: "programme-update",
        title: "Programme update",
        summary: "Latest programme news.",
      }],
      resources: [],
    });
    const markup = renderToStaticMarkup(
      await HomeFunding({ heading: "Latest News & Resources" }),
    );

    expect(markup).toContain('href="/news/programme-update"');
    expect(markup).toContain("Read update");
    expect(markup).not.toContain('target="_blank"');
  });
});

describe("Resource Centre cards", () => {
  it("shows the document preview, metadata and direct document action", async () => {
    const { resources } = await getHomeNewsAndResources();
    const markup = renderToStaticMarkup(
      <ResourceCard item={{ ...resources[0], date: "2026-10-07T12:00:00Z" }} />,
    );

    expect(markup).toContain(
      'alt="First Call for Applications funding criteria guide"',
    );
    expect(markup).toContain("Application guide");
    expect(markup).toMatch(/<h2[^>]*>First Call funding criteria<\/h2>/);
    expect(markup).toContain("Approved application criteria.");
    expect(markup).toContain('<time dateTime="2026-10-07T12:00:00Z">7 Oct 2026</time>');
    expect(markup).toContain(
      'href="/documents/sme-fund-first-call-funding-criteria.pdf"',
    );
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("Open resource");
  });

  it("keeps resources without a document link or date accessible through their detail page", () => {
    const markup = renderToStaticMarkup(
      <ResourceCard
        item={{
          id: 2,
          slug: "project-outline",
          title: "Project outline",
          summary: "Guidance for preparing a project.",
        }}
      />,
    );

    expect(markup).toContain('href="/resources/project-outline"');
    expect(markup).toContain("Resource");
    expect(markup).not.toContain("<time");
  });
});
