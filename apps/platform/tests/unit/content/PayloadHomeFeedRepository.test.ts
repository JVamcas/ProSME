import { beforeEach, describe, expect, it, vi } from "vitest";

const find = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("payload", () => ({ getPayload: async () => ({ find }) }));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("@/modules/content/infrastructure/ContentProjection", () => ({
  media: () => undefined,
  resourceHref: () => undefined,
  resourceThumbnail: () => undefined,
}));

import { readHomeFeed } from "@/modules/content/infrastructure/PayloadHomeFeedRepository";

describe("Home feed queries", () => {
  beforeEach(() => {
    find.mockReset();
    find.mockResolvedValue({ docs: [] });
  });

  it("requests only two published items from each date group and collection", async () => {
    await readHomeFeed();

    expect(find).toHaveBeenCalledTimes(4);
    expect(find.mock.calls.map(([query]) => query.collection).sort()).toEqual([
      "news",
      "news",
      "resources",
      "resources",
    ]);
    expect(find.mock.calls.map(([query]) => query.where.and[1])).toEqual([
      { publishedAt: { exists: true } },
      { publishedAt: { exists: false } },
      { publishedAt: { exists: true } },
      { publishedAt: { exists: false } },
    ]);

    for (const [query] of find.mock.calls) {
      expect(query).toMatchObject({
        draft: false,
        limit: 2,
      });
      expect(query.where.and[0]).toEqual({ _status: { equals: "published" } });
      expect(query.select).toMatchObject({
        id: true,
        title: true,
        slug: true,
      });
      expect(query.select).not.toHaveProperty("body");
    }
  });
});
