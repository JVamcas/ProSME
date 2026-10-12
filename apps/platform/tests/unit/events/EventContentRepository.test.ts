import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({
  getPayload: async () => ({ find: fixture.find }),
}));
import {
  readEventBySlug,
  readEventContentPage,
  readOperationsEventPage,
} from "@/modules/content/infrastructure/PayloadEventRepository";
import { eventContentQuerySchema } from "@/modules/content/api/EventContentSchemas";

const mode = { draft: false, where: { _status: { equals: "published" } } };
beforeEach(() => {
  vi.clearAllMocks();
  fixture.find.mockResolvedValue({ docs: [], totalDocs: 0 });
});

describe("Event content persistence queries", () => {
  it("loads bounded Operations cards with populated covers and summaries", async () => {
    fixture.find.mockResolvedValue({
      docs: [
        {
          id: 42,
          title: "Session",
          summary: "Prepare your application.",
          startsAt: "2030-11-12T10:00:00Z",
          timezone: "Africa/Windhoek",
          location: "Windhoek",
          image: {
            url: "/cover.jpg",
            alt: "Session cover",
            sizes: {
              mobile: { url: "/cover-mobile.webp", width: 640 },
            },
          },
        },
        {
          id: 43,
          title: "No cover",
          summary: "Summary",
          image: null,
        },
      ],
      totalDocs: 25,
    });
    const result = await readOperationsEventPage(2);
    expect(result).toMatchObject({ total: 25, page: 2, pageSize: 20 });
    expect(result.items[0]).toMatchObject({
      summary: "Prepare your application.",
      image: {
        alt: "Session cover",
        sizes: { mobile: { url: "/cover-mobile.webp" } },
      },
    });
    expect(result.items[1].image).toBeUndefined();
    expect(fixture.find).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        collection: "events",
        page: 2,
        limit: 20,
        depth: 1,
        draft: false,
        sort: ["-startsAt", "-id"],
        select: {
          title: true,
          summary: true,
          image: true,
          startsAt: true,
          timezone: true,
          location: true,
        },
        populate: {
          media: expect.objectContaining({ sizes: true, url: true }),
        },
      }),
    );
  });

  it("looks up a slug directly without fetching the first listing page", async () => {
    fixture.find.mockResolvedValue({
      docs: [{ id: 500, slug: "beyond-first-page" }],
    });
    expect(await readEventBySlug("beyond-first-page", mode)).toMatchObject({
      id: 500,
    });
    expect(fixture.find).toHaveBeenCalledOnce();
    expect(fixture.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "events",
        draft: false,
        limit: 1,
        pagination: false,
        where: { and: [{ slug: { equals: "beyond-first-page" } }, mode.where] },
      }),
    );
  });

  it("delegates search, type/category filters, ordering, counts and pages to Payload", async () => {
    const query = eventContentQuerySchema.parse({
      search: "workshop",
      eventType: "workshop",
      category: "Business",
      page: 3,
      pageSize: 12,
    });
    await readEventContentPage(query, mode);
    expect(fixture.find).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 3,
        limit: 12,
        sort: ["startsAt", "id"],
        where: {
          and: [
            mode.where,
            {
              or: [
                { title: { contains: "workshop" } },
                { summary: { contains: "workshop" } },
                { location: { contains: "workshop" } },
              ],
            },
            { eventType: { equals: "workshop" } },
            { category: { equals: "Business" } },
          ],
        },
      }),
    );
    const selection = fixture.find.mock.calls[0][0].select;
    expect(selection).not.toHaveProperty("body");
    expect(selection).not.toHaveProperty("reviewNotes");
    expect(selection).not.toHaveProperty("participants");
  });

  it("filters recordings to finished published sessions with nonempty URLs", async () => {
    const now = new Date("2030-11-12T12:00:00Z");
    await readEventContentPage(
      eventContentQuerySchema.parse({ period: "recordings" }),
      mode,
      now,
    );
    const args = fixture.find.mock.calls[0][0];
    expect(args.sort).toEqual(["-startsAt", "-id"]);
    expect(args.where.and[0]).toEqual(mode.where);
    expect(args.where.and[1].and).toContainEqual({
      startsAt: { less_than_equal: now.toISOString() },
    });
    expect(args.where.and[1].and).toContainEqual({
      recordingUrl: { not_equals: "" },
    });
  });

  it("does not fabricate missing events", async () => {
    expect(await readEventBySlug("missing", mode)).toBeNull();
  });

  it("includes future and ongoing events using the persisted end time", async () => {
    const now = new Date("2030-11-12T10:00:00Z");
    await readEventContentPage(
      eventContentQuerySchema.parse({
        period: "upcoming",
        pageSize: 3,
        page: 2,
      }),
      mode,
      now,
    );

    expect(fixture.find).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 3,
        where: {
          and: [
            mode.where,
            {
              or: [
                { startsAt: { greater_than: now.toISOString() } },
                { endsAt: { greater_than: now.toISOString() } },
              ],
            },
          ],
        },
      }),
    );
  });
});
