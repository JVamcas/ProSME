import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/application/ServerPublicFundingCallService", () => ({
  getPublicFundingCallBySlug: vi.fn(),
  listPublicFundingCalls: vi.fn(),
}));

import * as detailRoute from "@/app/api/public/funding-calls/[slug]/route";
import * as listRoute from "@/app/api/public/funding-calls/route";
import {
  getPublicFundingCallBySlug,
  listPublicFundingCalls,
} from "@/modules/funding-calls/application/ServerPublicFundingCallService";

beforeEach(() => vi.clearAllMocks());

describe("public funding-call routes", () => {
  it("returns funding calls without authentication", async () => {
    vi.mocked(listPublicFundingCalls).mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const response = await listRoute.GET(
      new Request("http://localhost/api/public/funding-calls?status=open"),
    );

    expect(response.status).toBe(200);
    expect(listPublicFundingCalls).toHaveBeenCalledWith({
      limit: 25,
      status: "open",
    });
  });

  it("resolves detail by the public slug", async () => {
    vi.mocked(getPublicFundingCallBySlug).mockResolvedValue({
      applicationsOpen: false,
      closesAt: "2026-08-31T22:00:00.000Z",
      description: "<p>Archived call.</p>",
      eligibilitySummary: null,
      fundingInstrument: "Grant",
      id: "00000000-0000-4000-8000-000000000042",
      maximumAmount: 200000,
      minimumAmount: 50000,
      opensAt: "2026-08-01T00:00:00.000Z",
      publicContact: { email: null, name: null, phone: null },
      publicDocuments: [],
      reference: "GROWTH-2026",
      selfCheckAvailable: true,
      slug: "growth-fund",
      status: "closed",
      summary: "Archived call.",
      thematicArea: "Growth",
      title: "Growth Fund",
      totalFundingAmount: 1000000,
    });

    const response = await detailRoute.GET(
      new Request("http://localhost/api/public/funding-calls/growth-fund"),
      { params: Promise.resolve({ slug: "growth-fund" }) },
    );

    expect(response.status).toBe(200);
    expect(getPublicFundingCallBySlug).toHaveBeenCalledWith("growth-fund");
  });
});
