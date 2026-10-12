import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  preview: false,
  grants: [] as string[],
  status: "active",
  find: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({ getPayload: async () => ({ find: state.find }) }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: state.preview }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("Not found"); },
}));
vi.mock("@/auth/authorization/current-user", () => ({
  getCurrentUser: async () => ({
    status: state.status,
    capabilities: new Set(state.grants),
  }),
}));
vi.mock("@/modules/content/infrastructure/PublishedContentCache", () => ({
  cachePublishedContent: (read: unknown) => read,
}));
vi.mock("@/modules/content/ui/public/CmsRichText", () => ({ CmsRichText: () => null }));
vi.mock("@/modules/content/ui/public/PublicPageHeader", () => ({ PublicPageHeader: () => null }));

import { getNewsArticle } from "@/modules/content/ServerNewsService";
import { newsPreviewUrl } from "@/payload/admin/preview-url";
import NewsDetailPage, { generateMetadata } from "@/app/(public)/news/[id]/page";

beforeEach(() => {
  state.preview = false;
  state.grants = [];
  state.status = "active";
  state.find.mockReset();
  state.find.mockResolvedValue({ docs: [{
    id: 9001,
    slug: "an-old-article",
    title: "Old article",
    excerpt: "Summary",
    body: { root: { children: [] } },
    image: { url: "/media/cover.jpg", alt: "Cover" },
    seoTitle: "Article metadata",
  }] });
});

describe("News articles by ID", () => {
  it("reads the requested article directly, independent of the newest 20 items", async () => {
    expect(await getNewsArticle("9001")).toMatchObject({
      id: 9001,
      title: "Old article",
      summary: "Summary",
      image: { url: "/media/cover.jpg", alt: "Cover" },
    });
    expect(state.find).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      collection: "news",
      draft: false,
      limit: 1,
      pagination: false,
      where: { and: [
        { id: { equals: 9001 } },
        { _status: { equals: "published" } },
      ] },
      select: expect.objectContaining({ body: true, title: true, image: true }),
      populate: {
        media: {
          alt: true,
          url: true,
          width: true,
          height: true,
          sizes: true,
          mimeType: true,
          filename: true,
        },
      },
    }));
  });

  it.each(["an-old-article", "0", "-1", "01", "1.5", "1e3", "9007199254740992"])(
    "rejects invalid article ID %s before reading content",
    async (id) => {
      expect(await getNewsArticle(id)).toBeNull();
      expect(state.find).not.toHaveBeenCalled();
    },
  );

  it("allows draft reads only with the News read permission", async () => {
    state.preview = true;
    state.grants = ["cms.news.read"];
    await getNewsArticle("9001");
    expect(state.find.mock.calls[0][0]).toMatchObject({
      draft: true,
      where: { and: [{ id: { equals: 9001 } }, {}] },
    });
  });

  it.each([
    { grants: [], status: "active" },
    { grants: ["cms.resources.read"], status: "active" },
    { grants: ["cms.news.read"], status: "disabled" },
  ])("keeps unauthorized previews published-only: %j", async (actor) => {
    state.preview = true;
    state.grants = actor.grants;
    state.status = actor.status;
    await getNewsArticle("9001");
    expect(state.find.mock.calls[0][0]).toMatchObject({
      draft: false,
      where: { and: [{ id: { equals: 9001 } }, { _status: { equals: "published" } }] },
    });
  });

  it("returns null and a missing page for absent or unpublished IDs", async () => {
    state.find.mockResolvedValue({ docs: [] });
    expect(await getNewsArticle("9001")).toBeNull();
    await expect(NewsDetailPage({ params: Promise.resolve({ id: "9001" }) }))
      .rejects.toThrow("Not found");
  });

  it("uses the same ID for page content, metadata and CMS preview URLs", async () => {
    const props = { params: Promise.resolve({ id: "9001" }) };
    expect(await NewsDetailPage(props)).toBeTruthy();
    expect(await generateMetadata(props)).toMatchObject({ title: "Article metadata" });
    expect(state.find.mock.calls.every(([query]) => query.where.and[0].id.equals === 9001))
      .toBe(true);
    expect(newsPreviewUrl({ id: 9001 })).toBe("/api/preview?path=%2Fnews%2F9001");
    expect(newsPreviewUrl({})).toBe("/api/preview?path=%2Fnews");
  });
});
