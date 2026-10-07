import type { BlocksFieldClientProps, CollectionBeforeChangeHook, GroupFieldClientProps } from "payload";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  fields: {} as Record<string, { value: unknown }>,
  rows: [] as { id: string; blockType: string }[],
}));

vi.mock("@payloadcms/ui", () => ({
  GroupField: ({ readOnly }: GroupFieldClientProps) => (
    <div data-native-fields data-read-only={readOnly} />
  ),
  BlocksField: () => <div data-native-blocks />,
  RenderFields: ({ parentPath, readOnly }: { parentPath: string; readOnly: boolean }) => (
    <div data-block-path={parentPath} data-read-only={readOnly} />
  ),
  useField: () => ({ rows: editor.rows, disabled: false }),
  useForm: () => ({ addFieldRow: vi.fn() }),
  useFormFields: (selector: (state: unknown[]) => unknown) => selector([editor.fields]),
  useEditDepth: () => 1,
  useStepNav: () => ({ stepNav: [], setStepNav: vi.fn() }),
}));

import { Pages } from "@/payload/collections/content/Pages";
import { pageLayoutFields } from "@/payload/fields/PageLayoutFields";
import CmsFundingOverviewGroupField from "@/modules/content/ui/admin/CmsFundingOverviewGroupField";
import CmsFundingOverviewBlocksField from "@/modules/content/ui/admin/CmsFundingOverviewBlocksField";
import { fundingOverviewDefaultBlocks, fundingOverviewSections } from "@/modules/content/FundingOverviewSections";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { pagePreviewUrl } from "@/payload/admin/preview-url";

function layoutField() {
  const group = pageLayoutFields[0];
  if (!("fields" in group)) throw new Error("Missing layout group");
  const layout = group.fields[0];
  if (layout.type !== "blocks") throw new Error("Missing layout field");
  return layout;
}

beforeEach(() => {
  vi.clearAllMocks();
  editor.fields = {
    slug: { value: "funding-support" },
    layout: { value: fundingOverviewDefaultBlocks("funding-support") },
  };
  editor.rows = [{ id: "support", blockType: "fundingSupport" }];
});

describe("Independent Funding Overview editors", () => {
  it("keeps the layout path and native version history", () => {
    expect(pageLayoutFields[0]).not.toHaveProperty("name");
    expect(layoutField().name).toBe("layout");
    expect(Pages.versions).toEqual({ drafts: true, maxPerDoc: 50 });
  });

  it("previews only support on its document", () => {
    const html = renderToStaticMarkup(
      <CmsFundingOverviewGroupField {...({ readOnly: true } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Grant funding");
    expect(html).not.toContain("Inclusive ownership");
    expect(html).not.toContain("Focus sectors");
    expect(html).toContain('data-read-only="true"');
  });

  it("previews only priorities on its document", () => {
    editor.fields.slug.value = "funding-priority-applicants";
    editor.fields.layout.value = fundingOverviewDefaultBlocks("funding-priority-applicants");
    const html = renderToStaticMarkup(
      <CmsFundingOverviewGroupField {...({} as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Inclusive ownership");
    expect(html).not.toContain("Grant funding");
  });

  it("previews sectors and notice from the same unsaved document", () => {
    editor.fields.slug.value = "funding-focus-sectors";
    editor.fields.layout.value = [{
      blockType: "eligibilityFocusSectors",
      eyebrow: "Our sectors",
      heading: "Our introduction",
      noticeHeading: "Our notice",
      notice: "Our notice content",
      sectors: [{ label: "Agro-processing", description: "Priority area" }],
    }];
    const html = renderToStaticMarkup(
      <CmsFundingOverviewGroupField {...({} as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Our sectors");
    expect(html).toContain("Agro-processing");
    expect(html).toContain("Our notice content");
    expect(html).not.toContain("Grant funding");
    expect(html).not.toContain("Edit heading and notice");
  });

  it("renders only the owned block at its saved index", () => {
    editor.rows = [
      { id: "legacy", blockType: "hero" },
      { id: "support", blockType: "fundingSupport" },
      { id: "other", blockType: "fundingPriorities" },
    ];
    const html = renderToStaticMarkup(
      <CmsFundingOverviewBlocksField
        {...({ field: layoutField(), readOnly: true } as unknown as BlocksFieldClientProps)}
      />,
    );
    expect(html).toContain('data-block-path="layout.1"');
    expect(html).not.toContain('data-block-path="layout.2"');
    expect(html).not.toContain('data-block-path="layout.0"');
    expect(html).toContain('data-read-only="true"');
  });

  it("preserves native block editing on other Pages documents", () => {
    editor.fields.slug.value = "privacy";
    const html = renderToStaticMarkup(
      <CmsFundingOverviewBlocksField
        {...({ field: layoutField() } as unknown as BlocksFieldClientProps)}
      />,
    );
    expect(html).toContain("data-native-blocks");
  });

  it.each(Object.keys(fundingOverviewSections))(
    "requires Pages publish permission and previews the public funding page for %s",
    async (slug) => {
      const guard = Pages.hooks?.beforeChange?.[0];
      if (!guard) throw new Error("Missing publishing guard");
      const input = (permissions: string[]) => ({
        data: { _status: "published", reviewStatus: "inReview" },
        originalDoc: { slug },
        req: { user: { capabilities: permissions } },
      }) as unknown as Parameters<CollectionBeforeChangeHook>[0];
      const publish = async (permissions: string[]) => guard(input(permissions));
      await expect(publish([cmsPermissionCode("pages", "publish")]))
        .resolves.toMatchObject({ _status: "published", reviewStatus: "approved" });
      await expect(publish([cmsPermissionCode("eligibility", "publish")]))
        .rejects.toThrow("cms.pages.publish");
      await expect(publish([cmsPermissionCode("pages", "update")]))
        .rejects.toThrow("cms.pages.publish");
      expect(pagePreviewUrl({ slug })).toBe("/api/preview?path=%2Fhow-to-apply%2Ffunding");
    },
  );
});
