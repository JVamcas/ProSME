import type { CollectionBeforeChangeHook, Field, GroupFieldClientProps, PayloadRequest } from "payload";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  fields: {} as Record<string, { value: unknown }>,
  api: vi.fn(),
  drawer: vi.fn(),
  setParams: vi.fn(),
  error: false,
}));

vi.mock("@payloadcms/ui", () => ({
  GroupField: ({ readOnly }: GroupFieldClientProps) => (
    <div data-native-fields data-read-only={readOnly} />
  ),
  useFormFields: (selector: (state: unknown[]) => unknown) => selector([state.fields]),
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useEditDepth: () => 1,
  useStepNav: () => ({ stepNav: [], setStepNav: vi.fn() }),
  usePayloadAPI: (url: string, options: unknown) => {
    state.api(url, options);
    return [{
      data: {
        docs: url.endsWith("/faqs") ? [{
          id: 42,
          question: "How does the fund help?",
          answer: { root: { type: "root", version: 1, children: [{
            type: "paragraph", version: 1, children: [{
              type: "text", version: 1, text: "Our current answer", format: 1,
            }],
          }] } },
          category: "General",
        }] : [],
      },
      isLoading: false,
      isError: state.error,
    }, { setParams: state.setParams }];
  },
  useDocumentDrawer: (options: unknown) => {
    state.drawer(options);
    return [() => null, () => null, { openDrawer: vi.fn() }];
  },
}));

import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { defaultPages } from "@/modules/content/ContentDefaults";
import { FaqContent } from "@/modules/content/ui/public/FaqContent";
import CmsPageContentGroupField from "@/modules/content/ui/admin/CmsPageContentGroupField";
import { FAQs } from "@/payload/collections/content/FAQs";
import { Pages } from "@/payload/collections/content/Pages";
import { pageContentFields, pageSlugField } from "@/payload/fields/PageContentFields";

beforeEach(() => {
  vi.clearAllMocks();
  state.error = false;
  state.fields = {
    slug: { value: "faq" },
    eyebrow: { value: "Help and support" },
    title: { value: "Our frequently asked questions" },
    summary: { value: "Get answers here." },
  };
});

async function fieldDefault(field: Field) {
  if (!("defaultValue" in field) || typeof field.defaultValue !== "function") {
    throw new Error("Missing default function");
  }
  return field.defaultValue({
    req: { query: { cmsPage: "faq" } } as unknown as PayloadRequest,
    user: null,
  });
}

describe("FAQ CMS screen", () => {
  it("uses the existing FAQ page defaults for native creation", async () => {
    const group = pageContentFields[0];
    if (!("fields" in group)) throw new Error("Missing content group");
    await expect(fieldDefault(pageSlugField)).resolves.toBe("faq");
    for (const name of ["eyebrow", "title", "summary"] as const) {
      const field = group.fields.find((entry) => "name" in entry && entry.name === name)!;
      await expect(fieldDefault(field)).resolves.toBe(defaultPages.faq[name]);
    }
    const content = group.fields.find((entry) => "name" in entry && entry.name === "content")!;
    expect(content.admin?.condition?.({ slug: "faq" }, {}, {} as never)).toBe(false);
  });

  it("previews banner edits and rich-text answers with native question drawers", () => {
    const html = renderToStaticMarkup(
      <CmsPageContentGroupField {...({ readOnly: true } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Live FAQ preview");
    expect(html).toContain("Help and support");
    expect(html).toContain("Our frequently asked questions");
    expect(html).toContain("Get answers here.");
    expect(html).toContain("How does the fund help?");
    expect(html).toContain("<strong>Our current answer</strong>");
    expect(html).toContain("Add question");
    expect(html).toContain('data-read-only="true"');
    expect(state.drawer).toHaveBeenCalledWith({ collectionSlug: "faqs", id: 42 });
    expect(state.drawer).toHaveBeenCalledWith({ collectionSlug: "faqs", id: undefined });
    expect(state.api).toHaveBeenCalledWith("/api/faqs", {
      initialParams: {
        depth: 0,
        draft: true,
        limit: 20,
        sort: "order",
        select: { question: true, answer: true, category: true },
      },
    });
  });

  it("does not expose creation controls after a failed questions read", () => {
    state.error = true;
    const html = renderToStaticMarkup(<CmsPageContentGroupField {...({} as GroupFieldClientProps)} />);
    expect(html).toContain("FAQs could not be loaded");
    expect(html).not.toContain("Add question");
    expect(state.drawer).not.toHaveBeenCalled();
  });

  it("retains the public Help centre label for existing pages", () => {
    const html = renderToStaticMarkup(<FaqContent page={defaultPages.faq} faqs={[]} />);
    expect(html).toContain("Help centre");
    expect(html).toContain("Frequently asked questions");
  });
});

describe("FAQ native publishing permissions", () => {
  async function publish(collection: typeof FAQs, permissions: string[], reviewStatus = "approved") {
    const guard = collection.hooks?.beforeChange?.[0];
    if (!guard) throw new Error("Missing publishing guard");
    return guard({
      data: { _status: "published", reviewStatus },
      originalDoc: { slug: "faq" },
      req: { user: { capabilities: permissions } },
    } as unknown as Parameters<CollectionBeforeChangeHook>[0]);
  }

  it("keeps native versions and required rich-text answers", () => {
    expect(FAQs.versions).toEqual({ drafts: true, maxPerDoc: 50 });
    expect(FAQs.fields.find((field) => "name" in field && field.name === "answer"))
      .toMatchObject({ type: "richText", required: true });
  });

  it("hides category and review metadata while retaining their stored fields", () => {
    for (const name of ["category", "reviewStatus", "reviewNotes"]) {
      const field = FAQs.fields.find(
        (entry) => "name" in entry && entry.name === name,
      );
      expect(field).toMatchObject({ admin: { hidden: true } });
    }
    const order = FAQs.fields.find(
      (field) => "name" in field && field.name === "order",
    );
    expect(order).toMatchObject({ type: "number", required: true });
    expect(order).not.toMatchObject({ admin: { hidden: true } });
  });

  it("requires FAQ publishing permission and approves through the native Publish action", async () => {
    await expect(publish(FAQs, [cmsPermissionCode("faqs", "publish")]))
      .resolves.toMatchObject({ _status: "published" });
    await expect(publish(FAQs, [cmsPermissionCode("pages", "publish")]))
      .rejects.toThrow("cms.faqs.publish");
    await expect(publish(FAQs, [cmsPermissionCode("faqs", "update")]))
      .rejects.toThrow("cms.faqs.publish");
    await expect(publish(FAQs, [cmsPermissionCode("faqs", "publish")], "inReview"))
      .resolves.toMatchObject({ _status: "published", reviewStatus: "approved" });
    await expect(publish(FAQs, [cmsPermissionCode("faqs", "publish")], "draft"))
      .resolves.toMatchObject({ _status: "published", reviewStatus: "approved" });
  });

  it("keeps Save Draft from approving a question", async () => {
    const guard = FAQs.hooks?.beforeChange?.[0];
    if (!guard) throw new Error("Missing publishing guard");
    const data = { _status: "draft", reviewStatus: "draft" };
    const result = await guard({
      data,
      req: { user: { capabilities: [cmsPermissionCode("faqs", "update")] } },
    } as unknown as Parameters<CollectionBeforeChangeHook>[0]);

    expect(result).toMatchObject({ _status: "draft", reviewStatus: "draft" });
  });

  it("requires Pages publishing for the banner", async () => {
    await expect(publish(Pages, [cmsPermissionCode("pages", "publish")], "inReview"))
      .resolves.toMatchObject({ reviewStatus: "approved" });
    await expect(publish(Pages, [cmsPermissionCode("faqs", "publish")]))
      .rejects.toThrow("cms.pages.publish");
  });
});
