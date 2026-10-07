// @vitest-environment happy-dom

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupFieldClientProps } from "payload";

const state = vi.hoisted(() => ({
  thumbnail: undefined as unknown,
  fields: {} as Record<string, { value: unknown }>,
}));
vi.mock("@payloadcms/ui", () => ({
  useFormFields: (select: (value: [typeof state.fields]) => unknown) => select([state.fields]),
  GroupField: (props: GroupFieldClientProps) => <div data-native-editor={props.path} data-read-only={props.readOnly} />,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/cms/collections/resources/42" }));
vi.mock("@/modules/content/ui/admin/useCmsMediaPreview", () => ({
  useCmsMediaPreview: () => state.thumbnail,
  useCmsMediaRecord: () => ({
    mimeType: "application/pdf",
    documentThumbnail: {
      url: "/media/automatic.png",
      alt: "First page",
      sizes: { thumbnail: { url: "/media/automatic.webp", width: 320 } },
    },
  }),
}));

import CmsResourceContentGroupField from "@/modules/content/ui/admin/CmsResourceContentGroupField";

beforeEach(() => {
  state.thumbnail = undefined;
  state.fields = {
    resourceName: { value: "Application guide" },
    title: { value: "Funding criteria" },
    slug: { value: "funding-criteria" },
    description: { value: "Approved guidance" },
  };
});

describe("Native CMS resource editor", () => {
  it("renders the public card in an inert preview while retaining native read-only editing", () => {
    const html = renderToStaticMarkup(
      <CmsResourceContentGroupField {...({ path: "", readOnly: true } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Application guide");
    expect(html).toContain("Funding criteria");
    expect(html).toContain("Approved guidance");
    expect(html).toContain('href="/resources/funding-criteria"');
    expect(html).toContain("automatic.webp");
    expect(html).toContain('inert=""');
    expect(html).toContain('data-read-only="true"');
  });

  it("previews a custom thumbnail and restores the automatic preview when cleared", () => {
    state.thumbnail = {
      url: "/media/custom.png",
      alt: "Custom preview",
      sizes: { thumbnail: { url: "/media/custom.webp", width: 320 } },
    };
    const props = { path: "" } as GroupFieldClientProps;
    expect(renderToStaticMarkup(<CmsResourceContentGroupField {...props} />)).toContain("custom.webp");
    state.thumbnail = undefined;
    expect(renderToStaticMarkup(<CmsResourceContentGroupField {...props} />)).toContain("automatic.webp");
  });
});
