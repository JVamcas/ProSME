import type { Payload, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { migrateFundingOverviewDocuments } from "@/modules/content/infrastructure/PayloadFundingOverviewMigrationRepository";
import { fundingOverviewSections } from "@/modules/content/FundingOverviewSections";
import { publicPages } from "@/payload/seed/public-pages";

describe("independent Overview initialization", () => {
  it("leaves an empty database for explicit baseline initialization", async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [], hasNextPage: false }),
      create: vi.fn(),
      update: vi.fn(),
    };
    await migrateFundingOverviewDocuments(payload as unknown as Payload, {} as PayloadRequest);
    expect(payload.create).not.toHaveBeenCalled();
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.find).toHaveBeenCalledTimes(4);
  });

  it("includes the three independent documents in the explicit baseline seed", () => {
    for (const [slug, section] of Object.entries(fundingOverviewSections)) {
      const page = publicPages.find((page) => page.slug === slug);
      expect(page).toMatchObject({ slug, title: section.title });
      expect(page && "layout" in page ? page.layout : []).toHaveLength(1);
    }
    const focus = publicPages.find((page) => page.slug === "funding-focus-sectors");
    expect(focus && "layout" in focus ? focus.layout : []).toMatchObject([{
      blockType: "eligibilityFocusSectors",
      sectors: expect.arrayContaining([{ label: "Agriculture & agro-processing", description: "Priority area" }]),
    }]);
  });

  it("never overwrites sections that already have their own documents", async () => {
    const payload = {
      find: vi.fn(async ({ collection }: { collection: string }) => ({
        docs: collection === "pages"
          ? Object.keys(fundingOverviewSections).map((slug) => ({ slug }))
          : [],
        hasNextPage: false,
      })),
      create: vi.fn(),
      update: vi.fn(),
    };
    await migrateFundingOverviewDocuments(payload as unknown as Payload, {} as PayloadRequest);
    expect(payload.create).not.toHaveBeenCalled();
    expect(payload.update).not.toHaveBeenCalled();
  });
});
