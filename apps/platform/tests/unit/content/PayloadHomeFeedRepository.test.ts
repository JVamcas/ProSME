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

  it("requests at most four published candidates from each date group and collection", async () => {
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
        limit: 4,
      });
      expect(query.where.and[0]).toEqual({ _status: { equals: "published" } });
      expect(query.select).toMatchObject({
        id: true,
        title: true,
        slug: true,
      });
      expect(query.select).not.toHaveProperty("body");
      expect(query.sort).toEqual(
        query.where.and[1].publishedAt.exists
          ? ["-publishedAt", "-id"]
          : ["-createdAt", "-id"],
      );
    }
  });

  function item(id: number, publishedAt: string | null, createdAt = "2026-09-01") {
    return {
      id,
      title: `Item ${id}`,
      slug: `item-${id}`,
      excerpt: "News summary",
      description: "Resource summary",
      publishedAt,
      createdAt,
    };
  }

  it("shows four newer news items ahead of older resources", async () => {
    find.mockImplementation(async (query) => {
      if (!query.where.and[1].publishedAt.exists) return { docs: [] };

      const docs = query.collection === "news"
        ? [1, 2, 3, 4].map((id) => item(id, `2026-10-0${id}`))
        : [item(5, "2026-09-20")];
      return { docs };
    });

    const result = await readHomeFeed();

    expect(result.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: 4, kind: "news" },
      { id: 3, kind: "news" },
      { id: 2, kind: "news" },
      { id: 1, kind: "news" },
    ]);
  });

  it("interleaves collections by date and uses creation date for undated items", async () => {
    find.mockImplementation(async (query) => {
      const hasDate = query.where.and[1].publishedAt.exists;
      if (query.collection === "news") {
        return {
          docs: hasDate
            ? [item(1, "2026-10-08"), item(2, "2026-10-06")]
            : [item(3, null, "2026-10-10")],
        };
      }
      return {
        docs: hasDate
          ? [item(4, "2026-10-09"), item(5, "2026-09-30")]
          : [item(6, null, "2026-10-07")],
      };
    });

    const result = await readHomeFeed();

    expect(result.map(({ id, kind, date }) => ({ id, kind, date }))).toEqual([
      { id: 3, kind: "news", date: "2026-10-10" },
      { id: 4, kind: "resource", date: "2026-10-09" },
      { id: 1, kind: "news", date: "2026-10-08" },
      { id: 6, kind: "resource", date: "2026-10-07" },
    ]);
    expect(result[0]).toMatchObject({ summary: "News summary", title: "Item 3" });
    expect(result[1]).toMatchObject({ summary: "Resource summary", category: "Resource" });
  });

  it("can fill all four slots with resources when news is absent", async () => {
    find.mockImplementation(async (query) => ({
      docs: query.collection === "resources" && query.where.and[1].publishedAt.exists
        ? [1, 2, 3, 4].map((id) => item(id, `2026-10-0${id}`))
        : [],
    }));

    const result = await readHomeFeed();

    expect(result.map(({ id }) => id)).toEqual([4, 3, 2, 1]);
    expect(result.every(({ kind }) => kind === "resource")).toBe(true);
  });

  it("returns an empty feed when neither collection has published candidates", async () => {
    expect(await readHomeFeed()).toEqual([]);
  });
});
