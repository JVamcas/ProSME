import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";
import { cmsPermissionCode } from "@/auth/authorization/permissions";

const session = vi.hoisted(() => ({ preview: false, user: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (read: unknown) => read,
}));
vi.mock("next/headers", () => ({ draftMode: async () => ({ isEnabled: session.preview }) }));
vi.mock("@/auth/authorization/current-user", () => ({ getCurrentUser: async () => session.user }));
vi.mock("@payload-config", async () => import("@/payload.config"));
vi.mock("@/lib/env/server", () => ({
  getDeploymentEnvironment: () => "local",
  getServerEnvironment: () => ({
    DATABASE_URL: process.env.FUNDING_OVERVIEW_TEST_DATABASE_URL,
    PAYLOAD_SECRET: "cms-read-isolated-fixture-secret-at-least-32-characters",
    PUBLIC_SITE_URL: "http://localhost:3008",
  }),
}));

import { openFundingOverviewFixture, testContext } from "../support/FundingOverviewDatabaseFixture";
import { getHomepage, getPage } from "@/modules/content/ServerContentQueries";
import { paragraphsToRichText } from "@/modules/content/ContentRichText";

const connectionString = process.env.FUNDING_OVERVIEW_TEST_DATABASE_URL;

describe.skipIf(!connectionString)("CMS publication reads on disposable PostgreSQL", () => {
  let fixture: Awaited<ReturnType<typeof openFundingOverviewFixture>>;
  let payload: Payload;
  const slug = "cms-read-fixture";
  let pageId: number;

  beforeAll(async () => {
    fixture = await openFundingOverviewFixture(connectionString!);
    payload = fixture.payload;
    const page = await payload.create({
      collection: "pages",
      context: testContext,
      data: {
        slug,
        title: "Initial draft",
        content: paragraphsToRichText(["Synthetic CMS fixture"]),
        _status: "draft",
      },
    });
    pageId = page.id;
  }, 60_000);

  beforeEach(() => {
    session.preview = false;
    session.user = null;
  });

  afterAll(async () => {
    await fixture?.payload.destroy();
    await fixture?.client.end();
  });

  function updatePage(data: { title?: string; _status: "draft" | "published" }, draft = false) {
    return payload.update({
      collection: "pages",
      id: pageId,
      context: testContext,
      draft,
      data: { ...data, reviewStatus: "approved" },
    });
  }

  it("excludes a draft and reads it immediately after publishing", async () => {
    expect(await getPage(slug)).toBeNull();
    await updatePage({ title: "Published page", _status: "published" });
    expect(await getPage(slug)).toMatchObject({ title: "Published page" });
  });

  it("keeps a pending revision private and checks the matching preview permission", async () => {
    await updatePage({ title: "Pending page", _status: "draft" }, true);
    expect(await getPage(slug)).toMatchObject({ title: "Published page" });
    session.preview = true;
    session.user = { status: "active", capabilities: new Set([cmsPermissionCode("pages", "read")]) };
    expect(await getPage(slug)).toMatchObject({ title: "Pending page" });
    session.user = { status: "active", capabilities: new Set([cmsPermissionCode("news", "read")]) };
    expect(await getPage(slug)).toMatchObject({ title: "Published page" });
  });

  it("excludes an unpublished page, allows authorized preview and reads a later republication", async () => {
    await updatePage({ _status: "draft" });
    expect(await getPage(slug)).toBeNull();
    session.preview = true;
    session.user = { status: "active", capabilities: new Set([cmsPermissionCode("pages", "read")]) };
    expect(await getPage(slug)).not.toBeNull();
    session.preview = false;
    await updatePage({ title: "Republished page", _status: "published" });
    expect(await getPage(slug)).toMatchObject({ title: "Republished page" });
  });

  it("does not retain a deleted publication", async () => {
    await payload.delete({ collection: "pages", id: pageId, context: testContext });
    expect(await getPage(slug)).toBeNull();
  });

  it("keeps Home draft changes private until native global publication", async () => {
    await payload.updateGlobal({
      slug: "homepage",
      context: testContext,
      data: { title: "Published Home", _status: "published", reviewStatus: "approved" },
    });
    await payload.updateGlobal({
      slug: "homepage",
      context: testContext,
      draft: true,
      data: { title: "Pending Home", _status: "draft" },
    });
    expect(await getHomepage()).toMatchObject({ title: "Published Home" });
    session.preview = true;
    session.user = { status: "active", capabilities: new Set([cmsPermissionCode("site-settings", "read")]) };
    expect(await getHomepage()).toMatchObject({ title: "Pending Home" });
    session.preview = false;
    await payload.updateGlobal({
      slug: "homepage",
      context: testContext,
      data: { title: "Pending Home", _status: "published", reviewStatus: "approved" },
    });
    expect(await getHomepage()).toMatchObject({ title: "Pending Home" });
  });

  it("hides unpublished Home content publicly while preserving authorized preview and republication", async () => {
    const home = await payload.updateGlobal({
      slug: "homepage",
      context: testContext,
      data: { _status: "draft" },
    });
    expect(home._status).toBe("draft");
    expect(await getHomepage()).toBeNull();
    session.preview = true;
    expect(await getHomepage()).toBeNull();
    session.user = {
      status: "active",
      capabilities: new Set([cmsPermissionCode("site-settings", "read")]),
    };
    expect(await getHomepage()).toMatchObject({ title: "Pending Home" });
    session.user = {
      status: "active",
      capabilities: new Set([cmsPermissionCode("pages", "read")]),
    };
    expect(await getHomepage()).toBeNull();
    session.preview = false;
    await payload.updateGlobal({
      slug: "homepage",
      context: testContext,
      data: {
        title: "Republished Home",
        _status: "published",
        reviewStatus: "approved",
      },
    });
    expect(await getHomepage()).toMatchObject({ title: "Republished Home" });
  });
});
