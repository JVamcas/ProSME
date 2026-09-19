import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: Promise.resolve({}) }));
vi.mock("payload", () => ({ getPayload: vi.fn() }));

import { getPayload } from "payload";
import {
  findPublishedFundingOpportunity,
  listPublishedFundingOpportunities,
} from "@/modules/funding-calls/ServerFundingOpportunityIntegration";

const fundingCall = {
  callStatus: "open" as const,
  closesAt: "2026-10-31T21:59:59.000Z",
  eligibility: { root: { children: [] } },
  id: 42,
  maximumAmount: 200000,
  minimumAmount: 50000,
  opensAt: "2026-09-01T00:00:00.000Z",
  slug: "growth-fund",
  summary: "Support for growing Namibian businesses.",
  title: "Growth Fund",
};

const find = vi.fn();
const count = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  count.mockResolvedValue({ totalDocs: 1 });
  vi.mocked(getPayload).mockResolvedValue({ count, find } as never);
});

describe("published funding-call integration", () => {
  it("projects summaries from published CMS content only", async () => {
    find.mockResolvedValue({ docs: [fundingCall] });

    await expect(
      listPublishedFundingOpportunities({ limit: 25 }),
    ).resolves.toEqual({
      items: [expect.objectContaining({ id: 42, slug: "growth-fund" })],
      nextCursor: null,
      total: 1,
    });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: false,
        limit: 26,
        sort: ["-opensAt", "-id"],
        where: { _status: { equals: "published" } },
      }),
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { _status: { equals: "published" } },
      }),
    );
  });

  it("applies server-side search and status filters", async () => {
    find.mockResolvedValue({ docs: [] });
    count.mockResolvedValue({ totalDocs: 0 });

    await listPublishedFundingOpportunities({
      limit: 10,
      search: "growth",
      status: "open",
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { _status: { equals: "published" } },
            { callStatus: { equals: "open" } },
            {
              or: [
                { title: { contains: "growth" } },
                { summary: { contains: "growth" } },
              ],
            },
          ],
        },
      }),
    );
  });

  it("returns an opaque cursor when another page exists", async () => {
    find.mockResolvedValue({ docs: [fundingCall, { ...fundingCall, id: 41 }] });
    count.mockResolvedValue({ totalDocs: 2 });

    const result = await listPublishedFundingOpportunities({ limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(result.total).toBe(2);
  });

  it("uses the cursor as the unique opens-at and id boundary", async () => {
    find.mockResolvedValue({ docs: [fundingCall, { ...fundingCall, id: 41 }] });
    count.mockResolvedValue({ totalDocs: 2 });
    const firstPage = await listPublishedFundingOpportunities({ limit: 1 });
    find.mockResolvedValue({ docs: [{ ...fundingCall, id: 41 }] });

    await listPublishedFundingOpportunities({
      after: firstPage.nextCursor!,
      limit: 1,
    });

    expect(find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { _status: { equals: "published" } },
            {
              or: [
                { opensAt: { less_than: fundingCall.opensAt } },
                {
                  and: [
                    { opensAt: { equals: fundingCall.opensAt } },
                    { id: { less_than: fundingCall.id } },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );
  });

  it("rejects malformed cursors", async () => {
    await expect(
      listPublishedFundingOpportunities({ after: "not-a-cursor", limit: 25 }),
    ).rejects.toBeInstanceOf(z.ZodError);
    expect(find).not.toHaveBeenCalled();
  });

  it("queries one published call by its stable numeric id", async () => {
    find.mockResolvedValue({ docs: [fundingCall] });

    await expect(findPublishedFundingOpportunity(42)).resolves.toEqual(
      expect.objectContaining({
        eligibility: fundingCall.eligibility,
        id: 42,
      }),
    );
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: false,
        limit: 1,
        where: {
          and: [
            { _status: { equals: "published" } },
            { id: { equals: 42 } },
          ],
        },
      }),
    );
  });
});
