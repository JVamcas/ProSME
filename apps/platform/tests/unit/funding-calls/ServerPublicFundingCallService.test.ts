import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readPublicFundingCallById: vi.fn(),
  readPublicFundingCallBySlug: vi.fn(),
  readPublicFundingCalls: vi.fn(),
}));

import {
  findPublicFundingCallBySlug,
  listPublicFundingCalls,
  publicFundingCallStatus,
} from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import {
  readPublicFundingCallBySlug,
  readPublicFundingCalls,
  type PublicFundingCallRecord,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";

const call: PublicFundingCallRecord = {
  closesAt: new Date("2026-10-31T22:00:00.000Z"),
  description: "<p>Support for growing Namibian businesses.</p>",
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
  eligibilitySummary: "Registered Namibian SMEs may qualify.",
  fundingInstrument: "Grant",
  id: "00000000-0000-4000-8000-000000000042",
  maximumGrantAmount: "200000.00",
  minimumGrantAmount: "50000.00",
  opensAt: new Date("2026-09-01T00:00:00.000Z"),
  publicContactEmail: "funding@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: "+264 61 000 0000",
  publicDocuments: [
    { label: "Funding criteria", url: "/documents/funding-criteria.pdf" },
  ],
  reference: "GROWTH-2026",
  slug: "growth-fund",
  status: "OPEN",
  thematicArea: "Growth",
  title: "Growth Fund",
  totalBudgetEnvelope: "1000000.00",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SKIP_CMS_PRERENDER", "0");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-21T10:00:00.000Z"));
});

describe("public funding-call read model", () => {
  it("lists only the safe public summary projection", async () => {
    vi.mocked(readPublicFundingCalls).mockResolvedValue({
      items: [call],
      total: 1,
    });

    const result = await listPublicFundingCalls({ limit: 25 });

    expect(result.items[0]).toEqual({
      applicationsOpen: true,
      closesAt: call.closesAt.toISOString(),
      fundingInstrument: "Grant",
      id: call.id,
      maximumAmount: 200000,
      minimumAmount: 50000,
      opensAt: call.opensAt.toISOString(),
      reference: "GROWTH-2026",
      selfCheckAvailable: true,
      slug: "growth-fund",
      status: "open",
      summary: "Support for growing Namibian businesses.",
      thematicArea: "Growth",
      title: "Growth Fund",
      totalFundingAmount: 1000000,
    });
    expect(result.items[0]).not.toHaveProperty("workflowTemplateVersionId");
    expect(readPublicFundingCalls).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 25,
        now: new Date("2026-09-21T10:00:00.000Z"),
      }),
    );
  });

  it("returns public detail fields and published documents", async () => {
    vi.mocked(readPublicFundingCallBySlug).mockResolvedValue(call);

    const result = await findPublicFundingCallBySlug("growth-fund");

    expect(result).toMatchObject({
      eligibilitySummary: call.eligibilitySummary,
      publicContact: {
        email: call.publicContactEmail,
        name: call.publicContactName,
        phone: call.publicContactPhone,
      },
      publicDocuments: call.publicDocuments,
    });
    expect(result).not.toHaveProperty("eligibilityRuleSetVersionId");
  });

  it("uses server time for upcoming, open, and closed state", () => {
    expect(
      publicFundingCallStatus(call, new Date("2026-08-31T23:59:59.000Z")),
    ).toBe("upcoming");
    expect(
      publicFundingCallStatus(call, new Date("2026-09-01T00:00:00.000Z")),
    ).toBe("open");
    expect(
      publicFundingCallStatus(call, new Date("2026-10-31T22:00:00.000Z")),
    ).toBe("closed");
  });
});
