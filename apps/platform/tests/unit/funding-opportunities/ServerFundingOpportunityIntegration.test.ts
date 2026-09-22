import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readPublishedFundingCall: vi.fn(),
  readPublishedFundingCalls: vi.fn(),
}));

import {
  findPublishedFundingOpportunity,
  listPublishedFundingOpportunities,
  resolvePublishedEligibilityRuleSetBinding,
} from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import {
  readPublishedFundingCall,
  readPublishedFundingCalls,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";

const fundingCallId = "00000000-0000-4000-8000-000000000042";
const previousFundingCallId = "00000000-0000-4000-8000-000000000041";
const fundingCall = {
  closesAt: new Date("2026-10-31T21:59:59.000Z"),
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  createdBy: "10000000-0000-4000-8000-000000000001",
  description:
    "<p>Support for <strong>growing</strong> Namibian businesses.</p>",
  eligibilitySummary: "Registered Namibian SMEs may qualify.",
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
  formVersionId: "20000000-0000-4000-8000-000000000001",
  fundingInstrument: "Grant",
  id: fundingCallId,
  maximumGrantAmount: "200000.00",
  minimumGrantAmount: "50000.00",
  opensAt: new Date("2026-09-01T00:00:00.000Z"),
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "GROWTH-2026",
  rowVersion: 2,
  slug: "growth-fund",
  status: "LIVE" as const,
  suspendedFromStatus: null,
  thematicArea: "Growth",
  title: "Growth Fund",
  totalBudgetEnvelope: "1000000.00",
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedBy: "10000000-0000-4000-8000-000000000001",
  workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readPublishedFundingCalls).mockResolvedValue({
    items: [fundingCall],
    total: 1,
  });
});
describe("published funding-call integration", () => {
  it("projects summaries from business-domain funding calls", async () => {
    await expect(
      listPublishedFundingOpportunities({ limit: 25 }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: fundingCallId,
          slug: "growth-fund",
          summary: "Support for growing Namibian businesses.",
        }),
      ],
      nextCursor: null,
      total: 1,
    });
    expect(readPublishedFundingCalls).toHaveBeenCalledWith({
      after: undefined,
      limit: 25,
      now: expect.any(Date),
      search: undefined,
      status: undefined,
    });
  });

  it("passes public status filters with server time", async () => {
    await listPublishedFundingOpportunities({
      limit: 10,
      search: "growth",
      status: "open",
    });
    expect(readPublishedFundingCalls).toHaveBeenCalledWith({
      after: undefined,
      limit: 10,
      now: expect.any(Date),
      search: "growth",
      status: "open",
    });
  });

  it("returns and consumes an opaque keyset cursor", async () => {
    vi.mocked(readPublishedFundingCalls).mockResolvedValueOnce({
      items: [fundingCall, { ...fundingCall, id: previousFundingCallId }],
      total: 2,
    });
    const firstPage = await listPublishedFundingOpportunities({ limit: 1 });
    await listPublishedFundingOpportunities({
      after: firstPage.nextCursor!,
      limit: 1,
    });
    expect(readPublishedFundingCalls).toHaveBeenLastCalledWith(
      expect.objectContaining({
        after: { id: fundingCallId, opensAt: fundingCall.opensAt },
      }),
    );
  });

  it("rejects malformed cursors before querying", async () => {
    await expect(
      listPublishedFundingOpportunities({ after: "not-a-cursor", limit: 25 }),
    ).rejects.toBeInstanceOf(z.ZodError);
    expect(readPublishedFundingCalls).not.toHaveBeenCalled();
  });

  it("queries one published call by its stable id", async () => {
    vi.mocked(readPublishedFundingCall).mockResolvedValue(fundingCall);
    await expect(findPublishedFundingOpportunity(fundingCallId)).resolves.toEqual(
      expect.objectContaining({
        description: fundingCall.description,
        id: fundingCallId,
        status: "open",
      }),
    );
    expect(readPublishedFundingCall).toHaveBeenCalledWith(fundingCallId);
  });

  it("resolves the exact eligibility version bound to a published call", async () => {
    vi.mocked(readPublishedFundingCall).mockResolvedValue(fundingCall);

    await expect(
      resolvePublishedEligibilityRuleSetBinding(fundingCallId),
    ).resolves.toEqual({
      eligibilityRuleSetVersionId: fundingCall.eligibilityRuleSetVersionId,
      formVersionId: fundingCall.formVersionId,
      fundingCallId,
      status: "open",
    });
  });
});
