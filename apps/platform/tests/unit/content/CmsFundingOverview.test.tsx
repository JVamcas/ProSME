import type {
  BlocksFieldClientProps,
  CollectionBeforeChangeHook,
  Field,
  GroupFieldClientProps,
} from "payload";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  fields: {} as Record<string, { value: unknown }>,
  api: vi.fn(),
  setParams: vi.fn(),
  drawer: vi.fn(),
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
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useEditDepth: () => 1,
  useStepNav: () => ({ stepNav: [], setStepNav: vi.fn() }),
  usePayloadAPI: (url: string, options: unknown) => {
    editor.api(url, options);
    const docs = url.endsWith("/pages")
      ? [{ id: 33, layout: [{ blockType: "eligibilityFocusSectors", eyebrow: "Our sectors" }] }]
      : [{ id: 12, label: "Agro-processing", kind: "focusSector", description: "Priority area", order: 1 }];
    return [{ data: { docs }, isLoading: false, isError: false }, { setParams: editor.setParams }];
  },
  useDocumentDrawer: (options: unknown) => {
    editor.drawer(options);
    return [() => null, () => null, { openDrawer: vi.fn() }];
  },
}));

import { Pages } from "@/payload/collections/content/Pages";
import { pageLayoutFields } from "@/payload/fields/PageLayoutFields";
import CmsFundingOverviewGroupField from "@/modules/content/ui/admin/CmsFundingOverviewGroupField";
import CmsFundingOverviewBlocksField from "@/modules/content/ui/admin/CmsFundingOverviewBlocksField";
import { defaultFundingOverviewBlocks } from "@/modules/content/FundingOverviewDefaults";
import { cmsPermissionCode } from "@/auth/authorization/permissions";

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
    slug: { value: "funding" },
    layout: { value: defaultFundingOverviewBlocks },
  };
  editor.rows = [
    { id: "legacy", blockType: "hero" },
    { id: "support", blockType: "fundingSupport" },
    { id: "priorities", blockType: "fundingPriorities" },
  ];
});

describe("Funding overview editor", () => {
  it("keeps the existing layout path in an unnamed group and preserves all block schemas", () => {
    expect(pageLayoutFields[0]).not.toHaveProperty("name");
    expect(layoutField().name).toBe("layout");
    expect(layoutField().blocks.map((block) => typeof block === "string" ? block : block.slug))
      .toContain("hero");
    expect(Pages.versions).toEqual({ drafts: true, maxPerDoc: 50 });
  });

  it("shows the three screenshot sections and native focus sector drawers", () => {
    const html = renderToStaticMarkup(
      <CmsFundingOverviewGroupField {...({ readOnly: true } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Live funding overview preview");
    expect(html).toContain("What the fund supports");
    expect(html).toContain("Grant funding");
    expect(html).toContain("Priority applicants");
    expect(html).toContain("Inclusive ownership");
    expect(html).toContain("Our sectors");
    expect(html).toContain("Agro-processing");
    expect(html).toContain("Edit heading and notice");
    expect(html).toContain("Add focus sector");
    expect(html).not.toContain("Choose a call");
    expect(html).not.toContain("Find funding for your next step");
    expect(html).toContain('data-read-only="true"');
    expect(editor.drawer).toHaveBeenCalledWith({ collectionSlug: "pages", id: 33 });
    expect(editor.drawer).toHaveBeenCalledWith({ collectionSlug: "eligibility-content", id: 12 });
  });

  it("reads bounded focus sector projections through native Payload APIs", () => {
    renderToStaticMarkup(<CmsFundingOverviewGroupField {...({} as GroupFieldClientProps)} />);
    expect(editor.api).toHaveBeenCalledWith("/api/eligibility-content", {
      initialParams: {
        depth: 0,
        draft: true,
        limit: 50,
        sort: "order",
        where: { kind: { equals: "focusSector" } },
        select: { label: true, kind: true, description: true, order: true },
      },
    });
    expect(editor.api).toHaveBeenCalledWith("/api/pages", {
      initialParams: {
        depth: 0,
        draft: true,
        limit: 1,
        where: { slug: { equals: "eligibility" } },
        select: { layout: true },
      },
    });
  });

  it("uses current saved row indices without rewriting unrelated blocks", () => {
    const html = renderToStaticMarkup(
      <CmsFundingOverviewBlocksField
        {...({ field: layoutField(), readOnly: true } as unknown as BlocksFieldClientProps)}
      />,
    );
    expect(html).toContain('data-block-path="layout.1"');
    expect(html).toContain('data-block-path="layout.2"');
    expect(html).not.toContain('data-block-path="layout.0"');
    expect(html).toContain('data-read-only="true"');
    expect(editor.rows[0].blockType).toBe("hero");
  });

  it("keeps focus heading edits on the existing eligibility document", () => {
    editor.fields.slug.value = "eligibility";
    editor.rows = [{ id: "focus", blockType: "eligibilityFocusSectors" }];
    const html = renderToStaticMarkup(
      <CmsFundingOverviewBlocksField
        {...({ field: layoutField() } as unknown as BlocksFieldClientProps)}
      />,
    );
    expect(html).toContain("Focus sectors heading and notice");
    expect(html).toContain('data-block-path="layout.0"');
    expect(html).not.toContain("What the fund supports");
  });

  it("leaves other Pages editors with their native blocks field", () => {
    editor.fields.slug.value = "privacy";
    const html = renderToStaticMarkup(
      <CmsFundingOverviewBlocksField
        {...({ field: layoutField() } as unknown as BlocksFieldClientProps)}
      />,
    );
    expect(html).toContain("data-native-blocks");
  });

  it("hides the layout editor for the application guide", () => {
    const group: Field = pageLayoutFields[0];
    expect(group.admin?.condition?.({ slug: "how-to-apply" }, {}, {} as never)).toBe(false);
    expect(group.admin?.condition?.({ slug: "funding" }, {}, {} as never)).toBe(true);
  });

  it.each(["funding", "eligibility"])(
    "requires the Pages publisher before publishing the focused %s editor",
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
    },
  );
});
