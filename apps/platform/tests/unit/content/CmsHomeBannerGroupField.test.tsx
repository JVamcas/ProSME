import type { Field, GroupFieldClientProps } from "payload";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  fields: {} as Record<string, { value: unknown }>,
  response: { data: {}, isError: false, isLoading: false },
  api: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  GroupField: ({ readOnly }: GroupFieldClientProps) => (
    <div data-payload-fields data-read-only={readOnly} />
  ),
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useFormFields: (selector: (state: unknown[]) => unknown) =>
    selector([editor.fields]),
  usePayloadAPI: (...args: unknown[]) => {
    editor.api(...args);
    return [editor.response];
  },
}));

import CmsHomeBannerGroupField from "@/modules/content/ui/admin/CmsHomeBannerGroupField";
import { useHomeBannerPreview } from "@/modules/content/ui/admin/useHomeBannerPreview";
import { homePageBannerFields } from "@/payload/fields/HomePageBannerFields";

function savedNames(fields: Field[]): string[] {
  return fields.flatMap((field) => {
    if ("name" in field && field.name) return [field.name];
    return "fields" in field ? savedNames(field.fields) : [];
  });
}

beforeEach(() => {
  editor.fields = {
    title: { value: "Updated banner headline" },
    summary: { value: "Updated introduction" },
    heroImage: { value: 12 },
    heroPanelHeading: { value: "Bigger businesses." },
    heroPanelSummary: { value: "All 14 regions." },
    applyLabel: { value: "Apply Now" },
    fundingButtonLabel: { value: "Funding Opportunities" },
    benefitFunding: { value: "Access funding" },
  };
  editor.response = {
    data: { id: 12, url: "/banner.jpg", alt: "Business owner" },
    isLoading: false,
    isError: false,
  };
  editor.api.mockClear();
});

describe("Home banner group", () => {
  it("groups all banner fields without changing their saved paths", () => {
    expect(homePageBannerFields).toHaveLength(1);
    expect(homePageBannerFields[0]).toMatchObject({
      type: "group",
      label: "Home Page Banner",
    });
    expect(homePageBannerFields[0]).not.toHaveProperty("name");
    expect(savedNames(homePageBannerFields)).toEqual([
      "eyebrow", "title", "summary", "heroImage", "heroPanelHeading",
      "heroPanelSummary", "applyLabel", "fundingButtonLabel",
      "benefitFunding", "benefitCapacity", "benefitOpportunity",
    ]);
  });

  it("previews current values using the public banner and retains native read-only controls", () => {
    const html = renderToStaticMarkup(
      <CmsHomeBannerGroupField
        {...({ readOnly: true } as GroupFieldClientProps)}
      />,
    );

    expect(html).toContain("Updated banner headline");
    expect(html).toContain("Updated introduction");
    expect(html).toContain("Bigger businesses.");
    expect(html).toContain("All 14 regions.");
    expect(html).toContain("Access funding");
    expect(html).toContain('href="/portal/applications/new"');
    expect(html).toContain('href="/funding"');
    expect(html).toContain('data-read-only="true"');
    expect(html).toContain("inert");
    expect(editor.api).toHaveBeenCalledWith("/api/media/12", {
      initialParams: { depth: 0 },
    });
  });

  it("clears removed images and discards responses for a previously selected image", () => {
    expect(useHomeBannerPreview().heroImage?.url).toBe("/banner.jpg");
    editor.fields.heroImage.value = 13;
    expect(useHomeBannerPreview().heroImage).toBeUndefined();
    editor.fields.heroImage.value = null;
    expect(useHomeBannerPreview().heroImage).toBeUndefined();
  });
});
