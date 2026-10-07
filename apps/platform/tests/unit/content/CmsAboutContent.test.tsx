import type {
  CollectionBeforeChangeHook,
  Field,
  GroupFieldClientProps,
  PayloadRequest,
} from "payload";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  fields: {} as Record<string, { value: unknown }>,
}));

vi.mock("@payloadcms/ui", () => ({
  GroupField: ({ readOnly }: GroupFieldClientProps) => (
    <div data-native-fields data-read-only={readOnly} />
  ),
  useFormFields: (selector: (state: unknown[]) => unknown) => selector([editor.fields]),
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  usePayloadAPI: () => [{ data: {}, isLoading: false, isError: false }],
  useEditDepth: () => 1,
  useStepNav: () => ({ stepNav: [], setStepNav: vi.fn() }),
}));

import CmsPageContentGroupField from "@/modules/content/ui/admin/CmsPageContentGroupField";
import { paragraphsToRichText } from "@/modules/content/ContentRichText";
import { approvedPageParagraphs, defaultPages } from "@/modules/content/ContentDefaults";
import { pageContentFields, pageSlugField } from "@/payload/fields/PageContentFields";
import { Pages } from "@/payload/collections/content/Pages";
import { cmsPermissionCode } from "@/auth/authorization/permissions";

function storedFields(fields: Field[]): Field[] {
  return fields.flatMap((field) => {
    if ("name" in field && field.name) return [field];
    return "fields" in field ? storedFields(field.fields) : [];
  });
}

async function defaultFor(field: Field, cmsPage?: string) {
  if (!("defaultValue" in field) || typeof field.defaultValue !== "function") {
    throw new Error("Missing default function");
  }
  return field.defaultValue({
    req: { query: { cmsPage } } as unknown as PayloadRequest,
    user: null,
  });
}

beforeEach(() => {
  editor.fields = {
    slug: { value: "about" },
    title: { value: "Our updated About heading" },
    summary: { value: "Updated About introduction" },
    content: { value: paragraphsToRichText(["Edited body paragraph", "Second paragraph"]) },
  };
});

async function changePage(
  data: Record<string, unknown>,
  permissions: string[],
  originalDoc: Record<string, unknown> = {},
) {
  const guard = Pages.hooks?.beforeChange?.[0];
  if (!guard) throw new Error("Missing Pages publishing guard");
  return guard({
    data,
    originalDoc,
    req: { user: { capabilities: permissions } } as unknown as PayloadRequest,
  } as Parameters<CollectionBeforeChangeHook>[0]);
}

describe("About publishing without review controls", () => {
  it.each([undefined, "draft", "inReview", "approved"])(
    "allows an authorized publisher to publish About from review status %s",
    async (reviewStatus) => {
      await expect(
        changePage(
          { _status: "published", reviewStatus },
          [cmsPermissionCode("pages", "publish")],
          { slug: "about" },
        ),
      ).resolves.toEqual({ _status: "published", reviewStatus: "approved" });
    },
  );

  it.each([
    [],
    [cmsPermissionCode("pages", "update")],
    [cmsPermissionCode("site-settings", "publish")],
  ])("denies publishing with mismatched grants %j", async (...permissions) => {
    await expect(
      changePage({ slug: "about", _status: "published" }, permissions),
    ).rejects.toThrow("Publishing requires the cms.pages.publish capability");
  });

  it("retains explicit review approval for other pages", async () => {
    await expect(
      changePage(
        { slug: "privacy", _status: "published", reviewStatus: "inReview" },
        [cmsPermissionCode("pages", "publish")],
      ),
    ).rejects.toThrow("Content must be approved before it can be published");
  });

  it("keeps About drafts editable without granting approval", async () => {
    await expect(
      changePage(
        { slug: "about", _status: "draft", reviewStatus: "approved" },
        [cmsPermissionCode("pages", "update")],
        { slug: "about", reviewStatus: "approved" },
      ),
    ).resolves.toEqual({ slug: "about", _status: "draft", reviewStatus: "inReview" });
  });
});

describe("About rich-text editor", () => {
  it("keeps native saved paths with required rich-text body content", () => {
    expect(pageContentFields[0]).not.toHaveProperty("name");
    const fields = storedFields(pageContentFields);
    expect(fields.map((field) => "name" in field && field.name)).toEqual([
      "eyebrow", "title", "summary", "content", "featuredImage",
    ]);
    expect(fields.find((field) => "name" in field && field.name === "content"))
      .toMatchObject({ type: "richText", required: true });
  });

  it("prefills an absent About page from approved copy only on the About entry", async () => {
    const fields = storedFields(pageContentFields);
    await expect(defaultFor(pageSlugField, "about")).resolves.toBe("about");
    const title = fields.find((field) => "name" in field && field.name === "title")!;
    const summary = fields.find((field) => "name" in field && field.name === "summary")!;
    const content = fields.find((field) => "name" in field && field.name === "content")!;
    await expect(defaultFor(title, "about")).resolves.toBe(defaultPages.about.title);
    await expect(defaultFor(summary, "about")).resolves.toBe(defaultPages.about.summary);
    await expect(defaultFor(content, "about")).resolves.toEqual(
      paragraphsToRichText(approvedPageParagraphs.about),
    );
    for (const field of [pageSlugField, title, summary, content]) {
      await expect(defaultFor(field)).resolves.toBeUndefined();
    }
  });

  it("renders current rich text with the public page and inert, read-only native controls", () => {
    const body = paragraphsToRichText(["Edited body paragraph", "Second paragraph"]);
    const paragraph = {
      ...body.root.children[0],
      children: [{ type: "text", text: "Edited body paragraph", format: 1, version: 1 }],
    };
    body.root.children[0] = paragraph;
    editor.fields.content.value = body;
    const html = renderToStaticMarkup(
      <CmsPageContentGroupField {...({ readOnly: true } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Our updated About heading");
    expect(html).toContain("Updated About introduction");
    expect(html).toContain("<strong>Edited body paragraph</strong>");
    expect(html).toContain("Second paragraph");
    expect(html).toContain("Live About preview");
    expect(html).toContain("inert");
    expect(html).toContain('data-read-only="true"');
  });

  it("uses the ordinary native group for other pages", () => {
    editor.fields.slug.value = "privacy";
    const html = renderToStaticMarkup(
      <CmsPageContentGroupField {...({} as GroupFieldClientProps)} />,
    );
    expect(html).toContain("data-native-fields");
    expect(html).not.toContain("Live About preview");
    expect(html).not.toContain("Our updated About heading");
  });
});
