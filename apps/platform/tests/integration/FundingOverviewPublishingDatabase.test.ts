import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { commitTransaction, initTransaction, killTransaction, type Payload } from "payload";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/env/server", () => ({
  getDeploymentEnvironment: () => "local",
  getServerEnvironment: () => ({
    DATABASE_URL: process.env.FUNDING_OVERVIEW_TEST_DATABASE_URL,
    PAYLOAD_SECRET: "overview-isolated-test-secret-at-least-32-characters",
    PUBLIC_SITE_URL: "http://localhost:3008",
  }),
}));

import { openFundingOverviewFixture, seedLegacyOverview, testContext } from "../support/FundingOverviewDatabaseFixture";
import { up } from "@/payload/migrations/20261007_200000_independent_funding_overview";
import { fundingOverviewSections } from "@/modules/content/FundingOverviewSections";

const connectionString = process.env.FUNDING_OVERVIEW_TEST_DATABASE_URL;
describe.skipIf(!connectionString)("independent Overview publishing on PostgreSQL", () => {
  let fixture: Awaited<ReturnType<typeof openFundingOverviewFixture>>;
  let payload: Payload;

  beforeAll(async () => {
    fixture = await openFundingOverviewFixture(connectionString!);
    payload = fixture.payload;
    await seedLegacyOverview(payload);
    await initTransaction(fixture.req);
    try {
      await up({ ...fixture } as Parameters<typeof up>[0]);
      await commitTransaction(fixture.req);
    } catch (error) {
      await killTransaction(fixture.req);
      throw error;
    }
  }, 60000);

  afterAll(async () => {
    await fixture?.payload.destroy();
    await fixture?.client.end();
  });

  async function read(slug: string, draft = false) {
    const result = await payload.find({
      collection: "pages", draft, depth: 0, limit: 1,
      overrideAccess: true, where: { slug: { equals: slug } },
    });
    return result.docs[0];
  }

  it("preserves published values separately from pending drafts, including ordered sectors", async () => {
    expect((await read("funding-support")).layout?.[0]).toMatchObject({ eyebrow: "Published support" });
    expect((await read("funding-support", true)).layout?.[0]).toMatchObject({ eyebrow: "Pending support" });
    expect((await read("funding-priority-applicants")).layout?.[0])
      .toMatchObject({ eyebrow: "Published priorities" });
    expect((await read("funding-priority-applicants", true)).layout?.[0])
      .toMatchObject({ eyebrow: "Pending priorities" });
    expect((await read("funding-focus-sectors")).layout?.[0]).toMatchObject({
      sectors: [{ label: "Second sector" }, { label: "First sector" }],
    });
    expect((await read("funding-focus-sectors", true)).layout?.[0]).toMatchObject({
      eyebrow: "Pending focus",
      sectors: [{ label: "Pending sector" }, { label: "First sector" }],
    });
  });

  it("publishes Support while leaving both sibling publications and drafts unchanged", async () => {
    const support = await read("funding-support", true);
    const siblings = ["funding-priority-applicants", "funding-focus-sectors"];
    const before = await Promise.all(siblings.flatMap((slug) => [read(slug), read(slug, true)]));
    await payload.update({
      collection: "pages", id: support.id, overrideAccess: true, context: testContext,
      data: { layout: support.layout, _status: "published", reviewStatus: "approved" },
    });
    expect((await read("funding-support")).layout?.[0]).toMatchObject({ eyebrow: "Pending support" });
    const after = await Promise.all(siblings.flatMap((slug) => [read(slug), read(slug, true)]));
    expect(after).toEqual(before);
  });

  it("keeps native histories separate and preserves the legacy histories", async () => {
    for (const slug of [...Object.keys(fundingOverviewSections), "funding", "eligibility"]) {
      const doc = await read(slug, true);
      const versions = await payload.findVersions({
        collection: "pages", where: { parent: { equals: doc.id } },
        limit: 10, overrideAccess: true,
      });
      expect(versions.docs.length).toBeGreaterThan(0);
      expect(versions.docs.every((version) => version.version.slug === slug)).toBe(true);
    }
  });

  it("publishes focus headings and sectors together without publishing priorities", async () => {
    const focus = await read("funding-focus-sectors", true);
    const before = await read("funding-priority-applicants");
    await payload.update({
      collection: "pages", id: focus.id, overrideAccess: true, context: testContext,
      data: { layout: focus.layout, _status: "published", reviewStatus: "approved" },
    });
    expect((await read("funding-focus-sectors")).layout?.[0]).toMatchObject({
      eyebrow: "Pending focus",
      sectors: [{ label: "Pending sector" }, { label: "First sector" }],
    });
    expect(await read("funding-priority-applicants")).toEqual(before);
  });

  it("restores a Support version without modifying its siblings", async () => {
    const support = await read("funding-support");
    const siblings = await Promise.all([read("funding-priority-applicants"), read("funding-focus-sectors")]);
    const versions = await payload.findVersions({
      collection: "pages", overrideAccess: true, limit: 1,
      where: { and: [
        { parent: { equals: support.id } },
        { "version._status": { equals: "published" } },
      ] },
      sort: "createdAt",
    });
    await payload.restoreVersion({
      collection: "pages", id: String(versions.docs[0].id),
      overrideAccess: true, context: testContext,
    });
    expect((await read("funding-support")).layout?.[0]).toMatchObject({ eyebrow: "Published support" });
    expect(await Promise.all([read("funding-priority-applicants"), read("funding-focus-sectors")]))
      .toEqual(siblings);
  });

  it("enforces edit and publish permissions through the real Payload operations", async () => {
    const support = await read("funding-support");
    await expect(payload.update({
      collection: "pages", id: support.id, overrideAccess: false,
      user: { id: 1, capabilities: [] },
      data: { _status: "published" },
    })).rejects.toThrow();
    await expect(payload.update({
      collection: "pages", id: support.id, overrideAccess: false,
      user: { id: 1, capabilities: ["cms.pages.update"] },
      data: { _status: "published" },
    })).rejects.toThrow("cms.pages.publish");
    expect(await read("funding-support")).toEqual(support);
  });

  it("can repeat the migration without replacing editorial changes", async () => {
    const before = await read("funding-support", true);
    await up({ ...fixture } as Parameters<typeof up>[0]);
    expect(await read("funding-support", true)).toEqual(before);
  });
});
