import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: cache.revalidate }));

import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";

beforeEach(() => vi.clearAllMocks());

describe("funding CMS publication cache updates", () => {
  it.each([
    ["pages", "funding"],
    ["pages", "eligibility"],
    ["eligibility-content", undefined],
  ])("refreshes public funding content when %s / %s changes", (collection, slug) => {
    revalidateCollection({
      collection: { slug: collection },
      doc: { slug },
      req: { context: {} },
    } as unknown as Parameters<CollectionAfterChangeHook>[0]);
    expect(cache.revalidate).toHaveBeenCalledWith("/how-to-apply/funding");
    expect(cache.revalidate).toHaveBeenCalledWith("/how-to-apply/eligibility");
  });

  it("refreshes funding content when a focus sector is deleted", () => {
    revalidateCollectionDelete({
      collection: { slug: "eligibility-content" },
      doc: {},
      req: { context: {} },
    } as unknown as Parameters<CollectionAfterDeleteHook>[0]);
    expect(cache.revalidate).toHaveBeenCalledWith("/how-to-apply/funding");
  });

  it("respects the seed and migration revalidation opt-out", () => {
    revalidateCollection({
      collection: { slug: "pages" },
      doc: { slug: "funding" },
      req: { context: { skipRevalidation: true } },
    } as unknown as Parameters<CollectionAfterChangeHook>[0]);
    expect(cache.revalidate).not.toHaveBeenCalled();
  });
});
