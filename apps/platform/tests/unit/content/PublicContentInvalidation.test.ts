import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ path: vi.fn(), tag: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: state.path,
  revalidateTag: state.tag,
}));

import {
  revalidateCollection,
  revalidateCollectionDelete,
  revalidateGlobal,
} from "@/payload/hooks/revalidate-public-content";
import { Media } from "@/payload/collections/content/Media";

// The collection config imports storage/thumbnail integrations. Replace those
// unrelated writes while checking that media hooks are actually registered.
vi.mock("@/modules/content/infrastructure/CmsMediaStorage", () => ({
  organizeCmsMedia: vi.fn(),
}));
vi.mock("@/modules/content/ServerResourceThumbnailService", () => ({
  generateDocumentThumbnail: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe("published content invalidation", () => {
  it.each(["pages", "news", "resources", "events", "faqs", "programme-statistics", "eligibility-content"])(
    "immediately expires %s on publication, unpublication and draft changes",
    (source) => {
      for (const status of ["published", "draft"]) {
        const doc = { slug: "guide", _status: status };
        expect(revalidateCollection({
          collection: { slug: source }, doc, req: { context: {} },
        } as unknown as Parameters<CollectionAfterChangeHook>[0])).toBe(doc);
      }
      expect(state.tag).toHaveBeenCalledWith(`cms-published:${source}`, { expire: 0 });
      expect(state.path).toHaveBeenCalledWith("/sitemap.xml");
    },
  );

  it("invalidates both old and new detail URLs after a slug rename", () => {
    revalidateCollection({
      collection: { slug: "news" },
      doc: { slug: "renamed" },
      previousDoc: { slug: "original" },
      req: { context: {} },
    } as unknown as Parameters<CollectionAfterChangeHook>[0]);
    expect(state.path).toHaveBeenCalledWith("/news/original");
    expect(state.path).toHaveBeenCalledWith("/news/renamed");
    expect(state.path).toHaveBeenCalledWith("/news");
  });

  it("expires cached absence/listings/details on delete", () => {
    revalidateCollectionDelete({
      collection: { slug: "resources" }, doc: { slug: "removed" },
      req: { context: {} },
    } as unknown as Parameters<CollectionAfterDeleteHook>[0]);
    expect(state.tag).toHaveBeenCalledExactlyOnceWith("cms-published:resources", { expire: 0 });
    expect(state.path).toHaveBeenCalledWith("/resources/removed");
  });

  it.each(["homepage", "header", "footer", "site-settings", "contact-details"])(
    "invalidates shared public layout dependencies when %s changes",
    (slug) => {
      revalidateGlobal({
        global: { slug }, doc: {}, req: { context: {} },
      } as unknown as Parameters<GlobalAfterChangeHook>[0]);
      expect(state.tag).toHaveBeenCalledExactlyOnceWith(`cms-published:${slug}`, { expire: 0 });
      expect(state.path).toHaveBeenCalledWith("/(public)", "layout");
      expect(state.path).not.toHaveBeenCalledWith("/", "layout");
      if (slug === "site-settings") {
        expect(state.path).toHaveBeenCalledWith("/robots.txt");
      }
    },
  );

  it("registers media change/delete invalidation for populated relationships", () => {
    expect(Media.hooks?.afterChange).toContain(revalidateCollection);
    expect(Media.hooks?.afterDelete).toContain(revalidateCollectionDelete);
    revalidateCollection({
      collection: { slug: "media" }, doc: {}, req: { context: {} },
    } as unknown as Parameters<CollectionAfterChangeHook>[0]);
    expect(state.tag).toHaveBeenCalledWith("cms-published:media", { expire: 0 });
    expect(state.path).toHaveBeenCalledWith("/(public)", "layout");
  });

  it("respects explicit script opt-out for both data and route invalidation", () => {
    revalidateGlobal({
      global: { slug: "homepage" }, doc: {}, req: { context: { skipRevalidation: true } },
    } as unknown as Parameters<GlobalAfterChangeHook>[0]);
    expect(state.tag).not.toHaveBeenCalled();
    expect(state.path).not.toHaveBeenCalled();
  });

  it("allows standalone Payload scripts without a Next request cache", () => {
    state.tag.mockImplementationOnce(() => {
      throw new Error("Invariant: static generation store missing in revalidateTag");
    });
    expect(() => revalidateGlobal({
      global: { slug: "homepage" }, doc: {}, req: { context: {} },
    } as unknown as Parameters<GlobalAfterChangeHook>[0])).not.toThrow();
  });

  it("propagates unexpected cache failures during a publication", () => {
    state.tag.mockImplementationOnce(() => {
      throw new Error("Cache unavailable");
    });
    expect(() => revalidateGlobal({
      global: { slug: "homepage" }, doc: {}, req: { context: {} },
    } as unknown as Parameters<GlobalAfterChangeHook>[0])).toThrow("Cache unavailable");
  });
});
