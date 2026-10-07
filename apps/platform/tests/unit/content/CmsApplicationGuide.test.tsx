import type {
  CollectionBeforeChangeHook,
  Field,
  GroupFieldClientProps,
  PayloadRequest,
} from "payload";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  fields: {} as Record<string, { value: unknown }>,
  getPage: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  GroupField: ({ readOnly }: GroupFieldClientProps) => (
    <div data-native-fields data-read-only={readOnly} />
  ),
  useFormFields: (selector: (state: unknown[]) => unknown) => selector([state.fields]),
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  usePayloadAPI: () => [{ data: {}, isLoading: false, isError: false }],
  useEditDepth: () => 1,
  useStepNav: () => ({ stepNav: [], setStepNav: vi.fn() }),
}));
vi.mock("@/modules/content/ServerContentQueries", () => ({ getPage: state.getPage }));
vi.mock("@/modules/content/ui/public/ContentBlocks", () => ({
  ContentBlocks: () => null,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Not found");
  },
  usePathname: () => "/how-to-apply",
}));

import HowToApplyPage from "@/app/(public)/how-to-apply/page";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { approvedPageParagraphs, defaultPages } from "@/modules/content/ContentDefaults";
import { paragraphsToRichText } from "@/modules/content/ContentRichText";
import type { PublicPageContent } from "@/modules/content/ContentTypes";
import CmsPageContentGroupField from "@/modules/content/ui/admin/CmsPageContentGroupField";
import { ApplicationGuideContent } from "@/modules/content/ui/public/ApplicationGuideContent";
import { Pages } from "@/payload/collections/content/Pages";
import {
  pageContentFields,
  pageSettingsFields,
  pageSlugField,
} from "@/payload/fields/PageContentFields";

function contentFields(): Field[] {
  const group = pageContentFields[0];
  if (!("fields" in group)) throw new Error("Missing content group");
  return group.fields;
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

const editedPage: PublicPageContent = {
  blocks: [],
  eyebrow: "Getting ready",
  title: "Our application guidance",
  summary: "Read this before you apply.",
  content: paragraphsToRichText(["Our updated document guidance."]),
};

beforeEach(() => {
  vi.clearAllMocks();
  state.fields = {
    slug: { value: "how-to-apply" },
    eyebrow: { value: editedPage.eyebrow },
    title: { value: editedPage.title },
    summary: { value: editedPage.summary },
    content: { value: editedPage.content },
  };
  state.getPage.mockResolvedValue(editedPage);
});

describe("How to Apply CMS editor", () => {
  it("prefills creation with the existing guidance copy", async () => {
    await expect(defaultFor(pageSlugField, "how-to-apply")).resolves.toBe("how-to-apply");
    for (const name of ["eyebrow", "title", "summary", "content"] as const) {
      const field = contentFields().find((item) => "name" in item && item.name === name)!;
      const expected = name === "content"
        ? paragraphsToRichText(approvedPageParagraphs["how-to-apply"])
        : defaultPages["how-to-apply"][name];
      await expect(defaultFor(field, "how-to-apply")).resolves.toEqual(expected);
      await expect(defaultFor(field, "privacy")).resolves.toBeUndefined();
    }
  });

  it("shows the banner label only for the application guide and hides technical settings", () => {
    const fields = contentFields();
    const eyebrow = fields.find((field) => "name" in field && field.name === "eyebrow")!;
    expect(eyebrow.admin?.condition?.({ slug: "how-to-apply" }, {}, {} as never)).toBe(true);
    expect(eyebrow.admin?.condition?.({ slug: "about" }, {}, {} as never)).toBe(false);
    const image = fields.find((field) => "name" in field && field.name === "featuredImage")!;
    for (const field of [pageSlugField, image, ...pageSettingsFields]) {
      expect(field.admin?.condition?.({ slug: "how-to-apply" }, {}, {} as never)).toBe(false);
      expect(field.admin?.condition?.({ slug: "privacy" }, {}, {} as never)).toBe(true);
    }
  });

  it("previews edited guidance with native read-only controls and excludes the highlighted journey", () => {
    const html = renderToStaticMarkup(
      <CmsPageContentGroupField {...({ readOnly: true } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Live Application guide preview");
    expect(html).toContain(editedPage.eyebrow);
    expect(html).toContain(editedPage.title);
    expect(html).toContain(editedPage.summary);
    expect(html).toContain("Our updated document guidance.");
    expect(html).toContain("inert");
    expect(html).toContain('data-read-only="true"');
    expect(html).not.toContain("Choose a call");
    expect(html).not.toContain("Check eligibility");
    expect(html).not.toContain("Explore funding calls");
  });
});

describe("How to Apply publishing", () => {
  async function publish(permissions: string[], slug = "how-to-apply") {
    const guard = Pages.hooks?.beforeChange?.[0];
    if (!guard) throw new Error("Missing publishing guard");
    return guard({
      data: { _status: "published", reviewStatus: "inReview" },
      originalDoc: { slug },
      req: { user: { capabilities: permissions } } as unknown as PayloadRequest,
    } as unknown as Parameters<CollectionBeforeChangeHook>[0]);
  }

  it("allows the Pages publisher to publish the focused editor", async () => {
    await expect(publish([cmsPermissionCode("pages", "publish")])).resolves.toEqual({
      _status: "published",
      reviewStatus: "approved",
    });
  });

  it.each([
    [],
    [cmsPermissionCode("pages", "update")],
    [cmsPermissionCode("site-settings", "publish")],
  ])("denies absent or mismatched publishing grants %j", async (...permissions) => {
    await expect(publish(permissions)).rejects.toThrow("cms.pages.publish");
  });

  it("retains review approval for other Pages documents", async () => {
    await expect(publish([cmsPermissionCode("pages", "publish")], "privacy"))
      .rejects.toThrow("Content must be approved");
  });
});

describe("public application guide", () => {
  it("renders CMS edits and preserves the application journey and its destination", async () => {
    const html = renderToStaticMarkup(await HowToApplyPage());
    expect(state.getPage).toHaveBeenCalledWith("how-to-apply");
    expect(html).toContain(editedPage.eyebrow);
    expect(html).toContain(editedPage.title);
    expect(html).toContain(editedPage.summary);
    expect(html).toContain("Our updated document guidance.");
    expect(html).toContain("Choose a call");
    expect(html).toContain("Check eligibility");
    expect(html).toContain("Explore funding calls");
    expect(html).toContain('href="/how-to-apply/funding"');
  });

  it("keeps the existing banner label for saved pages without one", () => {
    const html = renderToStaticMarkup(
      <ApplicationGuideContent page={{ ...editedPage, eyebrow: null }} />,
    );
    expect(html).toContain("A guided application");
  });

  it("allows the editor to clear the banner label", () => {
    const html = renderToStaticMarkup(
      <ApplicationGuideContent page={{ ...editedPage, eyebrow: "" }} />,
    );
    expect(html).not.toContain("A guided application");
  });
});
