import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  draftMode: vi.fn(),
  user: vi.fn(),
  find: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (read: unknown) => read }));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({ getPayload: async () => ({ find: state.find }) }));
vi.mock("next/headers", () => ({ draftMode: state.draftMode }));
vi.mock("@/auth/authorization/current-user", () => ({ getCurrentUser: state.user }));

import { getFundingOverview } from "@/modules/content/application/ServerFundingOverviewService";
import { fundingOverviewDefaultBlocks, fundingOverviewSections } from "@/modules/content/FundingOverviewSections";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  state.draftMode.mockResolvedValue({ isEnabled: false });
  state.user.mockResolvedValue(null);
  state.find.mockResolvedValue({ docs: [] });
});

describe("public independent Overview projection", () => {
  it("reads all three published sections with one bounded projection", async () => {
    await getFundingOverview();
    expect(state.find).toHaveBeenCalledExactlyOnceWith({
      collection: "pages",
      depth: 0,
      draft: false,
      limit: 3,
      pagination: false,
      overrideAccess: true,
      select: { slug: true, layout: true },
      where: { and: [
        { slug: { in: Object.keys(fundingOverviewSections) } },
        { _status: { equals: "published" } },
      ] },
    });
    expect(state.user).not.toHaveBeenCalled();
  });

  it.each([null, { status: "active", capabilities: new Set(["cms.eligibility.read"]) }])(
    "does not expose drafts to unauthorized preview visitors",
    async (user) => {
      state.draftMode.mockResolvedValue({ isEnabled: true });
      state.user.mockResolvedValue(user);
      await getFundingOverview();
      expect(state.find.mock.calls[0][0].draft).toBe(false);
    },
  );

  it("allows draft preview with the canonical Pages read permission", async () => {
    state.draftMode.mockResolvedValue({ isEnabled: true });
    state.user.mockResolvedValue({ status: "active", capabilities: new Set(["cms.pages.read"]) });
    await getFundingOverview();
    expect(state.find.mock.calls[0][0].draft).toBe(true);
    expect(state.find.mock.calls[0][0].where.and).toHaveLength(1);
  });

  it("composes independently sourced sections and retains sector ordering", async () => {
    state.find.mockResolvedValue({ docs: [
      { slug: "funding-priority-applicants", layout: [{
        ...fundingOverviewDefaultBlocks("funding-priority-applicants")[0],
        eyebrow: "Live priorities",
      }] },
      { slug: "funding-focus-sectors", layout: [{
        blockType: "eligibilityFocusSectors",
        eyebrow: "Live focus",
        sectors: [{ label: "Second" }, { label: "First" }],
      }] },
      { slug: "funding-support", layout: [{
        ...fundingOverviewDefaultBlocks("funding-support")[0],
        eyebrow: "Live support",
      }] },
    ] });
    const result = await getFundingOverview();
    expect(result.support.eyebrow).toBe("Live support");
    expect(result.priorities.eyebrow).toBe("Live priorities");
    expect(result.focus.eyebrow).toBe("Live focus");
    expect(result.sectors.map((sector) => sector.label)).toEqual(["Second", "First"]);
  });
});
