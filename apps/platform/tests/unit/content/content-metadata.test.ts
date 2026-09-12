import { describe, expect, it } from "vitest";

import { contentMetadata } from "@/modules/content/content.metadata";

describe("CMS content metadata", () => {
  it("uses SEO overrides, social media and indexing controls", () => {
    const result = contentMetadata({
      excludeFromSearch: true,
      image: { alt: "Entrepreneur at work", height: 600, url: "/media/owner.jpg", width: 1200 },
      seoDescription: "Search description",
      seoTitle: "Search title",
      summary: "Page summary",
      title: "Page title",
    });
    expect(result.title).toBe("Search title");
    expect(result.description).toBe("Search description");
    expect(result.robots).toEqual({ follow: false, index: false });
    expect(result.openGraph).toMatchObject({ title: "Search title", images: [{ alt: "Entrepreneur at work", url: "/media/owner.jpg" }] });
  });
});
