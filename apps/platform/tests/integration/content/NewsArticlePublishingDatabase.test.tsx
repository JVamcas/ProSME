import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@payload-config", async () => import("@/payload.config"));
vi.mock("@/lib/env/server", () => ({
  getDeploymentEnvironment: () => "local",
  getServerEnvironment: () => ({
    DATABASE_URL: process.env.NEWS_ARTICLE_TEST_DATABASE_URL,
    PAYLOAD_SECRET: "news-article-isolated-fixture-secret-at-least-32-characters",
    PUBLIC_SITE_URL: "http://localhost:3008",
  }),
}));

import { paragraphsToRichText } from "@/modules/content/ContentRichText";
import { readNewsById } from "@/modules/content/infrastructure/PayloadContentRepository";
import { NewsArticleContent } from "@/modules/content/ui/public/NewsArticleContent";
import { openFundingOverviewFixture, testContext } from "../../support/FundingOverviewDatabaseFixture";

const connectionString = process.env.NEWS_ARTICLE_TEST_DATABASE_URL;

describe.skipIf(!connectionString)("News layouts and autosave on disposable PostgreSQL", () => {
  let fixture: Awaited<ReturnType<typeof openFundingOverviewFixture>>;

  beforeAll(async () => {
    fixture = await openFundingOverviewFixture(connectionString!);
  }, 60_000);

  afterAll(async () => {
    await fixture?.payload.destroy();
    await fixture?.client.end();
  });

  it("creates an incomplete draft, populates section images, and keeps autosaved edits private", async () => {
    const { payload, client } = fixture;
    const blank = await payload.create({
      collection: "news",
      context: testContext,
      draft: true,
      data: {} as never,
    });
    expect(blank._status).toBe("draft");
    const inserted = await client.query(`
      INSERT INTO cms_media (
        alt, url, filename, mime_type, width, height,
        sizes_desktop_url, sizes_desktop_filename, sizes_desktop_width,
        sizes_desktop_height, sizes_desktop_mime_type
      ) VALUES (
        'Synthetic workshop', '/api/media/file/workshop.jpg', 'workshop.jpg',
        'image/jpeg', 1200, 800, '/api/media/file/workshop-desktop.webp',
        'workshop-desktop.webp', 1600, 1067, 'image/webp'
      ) RETURNING id
    `);
    const body = paragraphsToRichText([]);
    const section = {
      type: "block",
      version: 2,
      format: "",
      fields: {
        id: "advisory-section",
        blockType: "articleTextImage",
        heading: "Advisory services",
        content: paragraphsToRichText(["Published support details"]),
        image: inserted.rows[0].id,
        imagePosition: "left",
        caption: "A business workshop",
        button: { label: "Schedule a consultation", href: "/contact" },
      },
    };
    body.root.children.push(section);
    await payload.update({
      collection: "news",
      id: blank.id,
      context: testContext,
      data: {
        title: "Published advisory article",
        excerpt: "Support for entrepreneurs",
        reviewStatus: "approved",
        body,
        _status: "published",
      },
    });
    const publicArticle = await readNewsById(blank.id, {
      draft: false,
      where: { _status: { equals: "published" } },
    });
    const html = renderToStaticMarkup(<NewsArticleContent data={publicArticle!.body} />);
    expect(html).toContain('alt="Synthetic workshop"');
    expect(html).toContain("workshop-desktop.webp");
    expect(html).toContain("Published support details");
    expect(html).toContain('href="/contact"');

    await payload.update({
      collection: "news",
      id: blank.id,
      context: testContext,
      autosave: true,
      draft: true,
      data: { title: "Autosaved changes", body: paragraphsToRichText(["Pending edits"]) },
    });
    const [published, draft] = await Promise.all([
      readNewsById(blank.id, { draft: false, where: { _status: { equals: "published" } } }),
      readNewsById(blank.id, { draft: true, where: {} }),
    ]);
    expect(published?.title).toBe("Published advisory article");
    expect(draft?.title).toBe("Autosaved changes");
    const versions = await client.query(
      "SELECT autosave FROM _cms_news_v WHERE parent_id = $1 AND latest = true",
      [blank.id],
    );
    expect(versions.rows).toEqual([{ autosave: true }]);
  });

  it.each([
    { label: "Unsafe link", href: "javascript:alert(1)" },
    { label: "Missing destination", href: "" },
    { label: "", href: "/contact" },
  ])("rejects an invalid article button when publishing: %j", async (button) => {
    const body = paragraphsToRichText([]);
    const block = {
      type: "block",
      version: 2,
      format: "",
      fields: { id: "invalid-button", blockType: "articleButton", ...button },
    };
    body.root.children.push(block);
    await expect(fixture.payload.create({
      collection: "news",
      context: testContext,
      data: {
        title: "Invalid button fixture",
        slug: "invalid-button-fixture",
        excerpt: "Synthetic validation fixture",
        reviewStatus: "approved",
        body,
        _status: "published",
      },
    })).rejects.toThrow();
  });
});
